/**
 * Booking Request Service — guest cancellation and reschedule requests.
 *
 * FLOW:
 *  Guest submits → PENDING_REVIEW → Admin approves/rejects
 *  On APPROVED cancellation: admin finalizes → seats restored → booking cancelled
 *  On APPROVED reschedule: admin picks new slot and finalizes (updates slotId atomically)
 *
 * REFUND POLICY: Refund amounts are NOT automatically calculated.
 * The concierge model requires the admin to manually enter the exact refund amount
 * in the AdminRequestCard UI when finalizing a cancellation.
 * No auto-math. No percentage tiers. Admin decides.
 *
 * No Stripe integration — all refunds are manual (cash/bank transfer/card).
 */
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/services/audit";
import { triggerPostBookingNotifications, triggerCancellationNotifications, triggerRefundNotifications } from "@/lib/services/booking";
import type { Prisma } from "@prisma/client";

// ─── Guest: Submit Cancellation Request ────────────────────────────────────────

export async function submitCancellationRequest(
  bookingId: string,
  guestMessage?: string
): Promise<string> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { slot: true },
  });
  if (!booking) throw new Error("BOOKING_NOT_FOUND");
  if (booking.status === "CANCELLED") throw new Error("ALREADY_CANCELLED");
  if (booking.status === "COMPLETED") throw new Error("ALREADY_COMPLETED");

  const existing = await prisma.bookingRequest.findFirst({
    where: {
      bookingId,
      type: "CANCELLATION",
      status: { in: ["PENDING_REVIEW", "APPROVED"] },
    },
  });
  if (existing) throw new Error("REQUEST_ALREADY_EXISTS");

  const request = await prisma.bookingRequest.create({
    data: {
      bookingId,
      type: "CANCELLATION",
      status: "PENDING_REVIEW",
      guestMessage: guestMessage ?? null,
      // Refund amount is NOT auto-calculated — admin enters manually when finalizing
      suggestedRefundJpy: null,
      refundPolicyNote: null,
    },
  });

  await logAudit({
    bookingId,
    action: "CANCELLATION_REQUESTED",
    actorEmail: "guest",
    description: `Guest requested cancellation. Admin will determine refund amount manually on finalization.`,
    after: { suggestedRefundJpy: null },
  });

  return request.id;
}

// ─── Guest: Submit Reschedule Request ──────────────────────────────────────────

export async function submitRescheduleRequest(
  bookingId: string,
  requestedNewDate: string,
  requestedNewTime: string,
  guestMessage?: string
): Promise<string> {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) throw new Error("BOOKING_NOT_FOUND");
  if (booking.status === "CANCELLED") throw new Error("BOOKING_CANCELLED");
  if (booking.status === "COMPLETED") throw new Error("BOOKING_COMPLETED");
  if (booking.status !== "CONFIRMED") throw new Error("RESCHEDULE_NOT_CONFIRMED");
  if (!booking.paymentStatus.toUpperCase().startsWith("PAID")) {
    throw new Error("RESCHEDULE_PAYMENT_REQUIRED");
  }

  const existing = await prisma.bookingRequest.findFirst({
    where: {
      bookingId,
      type: "RESCHEDULE",
      status: { in: ["PENDING_REVIEW", "APPROVED"] },
    },
  });
  if (existing) throw new Error("REQUEST_ALREADY_EXISTS");

  const request = await prisma.bookingRequest.create({
    data: {
      bookingId,
      type: "RESCHEDULE",
      status: "PENDING_REVIEW",
      requestedNewDate,
      requestedNewTime,
      guestMessage: guestMessage ?? null,
    },
  });

  await logAudit({
    bookingId,
    action: "RESCHEDULE_REQUESTED",
    actorEmail: "guest",
    description: `Guest requested reschedule to ${requestedNewDate} ${requestedNewTime}`,
    after: { requestedNewDate, requestedNewTime },
  });

  return request.id;
}

// ─── Admin: Get Pending Requests ───────────────────────────────────────────────

export async function getPendingRequests() {
  return prisma.bookingRequest.findMany({
    where: { status: "PENDING_REVIEW" },
    orderBy: { createdAt: "asc" },
    include: {
      booking: {
        select: {
          id: true,
          reference: true,
          leadName: true,
          leadEmail: true,
          status: true,
          paymentStatus: true,
          totalJpy: true,
          adultCount: true,
          childCount: true,
          locale: true,
          slot: { select: { date: true, startTime: true } },
          product: { select: { nameEn: true, activityType: true } },
        },
      },
    },
  });
}

// ─── Admin: Get All Requests (paginated) ───────────────────────────────────────

export async function getAllRequests(page = 1, pageSize = 50) {
  const [requests, total] = await Promise.all([
    prisma.bookingRequest.findMany({
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        booking: {
          select: {
            id: true,
            reference: true,
            leadName: true,
            leadEmail: true,
            status: true,
            paymentStatus: true,
            totalJpy: true,
            adultCount: true,
            childCount: true,
            locale: true,
            slot: { select: { date: true, startTime: true } },
            product: { select: { nameEn: true, activityType: true } },
          },
        },
      },
    }),
    prisma.bookingRequest.count(),
  ]);
  return { requests, total, page, pageSize };
}

// ─── Admin: Get Single Request ─────────────────────────────────────────────────

export async function getRequestById(requestId: string) {
  return prisma.bookingRequest.findUnique({
    where: { id: requestId },
    include: {
      booking: {
        include: {
          slot: true,
          product: true,
          participants: { orderBy: { sortOrder: "asc" } },
          payments: { orderBy: { createdAt: "desc" } },
        },
      },
    },
  });
}

// ─── Admin: Approve Request ────────────────────────────────────────────────────

export async function approveRequest(
  requestId: string,
  actorEmail: string,
  adminDecisionNote?: string
): Promise<void> {
  const req = await prisma.bookingRequest.findUnique({ where: { id: requestId } });
  if (!req) throw new Error("REQUEST_NOT_FOUND");
  if (req.status !== "PENDING_REVIEW") throw new Error("REQUEST_NOT_PENDING");

  await prisma.bookingRequest.update({
    where: { id: requestId },
    data: {
      status: "APPROVED",
      approvedAt: new Date(),
      adminDecisionNote: adminDecisionNote ?? null,
    },
  });

  await logAudit({
    bookingId: req.bookingId,
    action: "REQUEST_APPROVED",
    actorEmail,
    description: `${req.type} request approved${adminDecisionNote ? `: ${adminDecisionNote}` : ""}`,
  });
}

// ─── Admin: Reject Request ─────────────────────────────────────────────────────

export async function rejectRequest(
  requestId: string,
  actorEmail: string,
  adminDecisionNote?: string
): Promise<void> {
  const req = await prisma.bookingRequest.findUnique({ where: { id: requestId } });
  if (!req) throw new Error("REQUEST_NOT_FOUND");
  if (req.status !== "PENDING_REVIEW") throw new Error("REQUEST_NOT_PENDING");
  await prisma.bookingRequest.update({
    where: { id: requestId },
    data: {
      status: "REJECTED",
      rejectedAt: new Date(),
      adminDecisionNote: adminDecisionNote ?? null,
    },
  });

  await logAudit({
    bookingId: req.bookingId,
    action: "REQUEST_REJECTED",
    actorEmail,
    description: `${req.type} request rejected${adminDecisionNote ? `: ${adminDecisionNote}` : ""}`,
  });
}

// ─── Admin: Finalize Cancellation ─────────────────────────────────────────────
//
// ORDER OF OPERATIONS:
//   1. Validate request state
//   2. Atomic DB transaction: restore seats → record payment → cancel booking → mark finalized
//   3. Audit log
//
// All refunds are manual — the admin physically returns cash/transfer to the guest.
// actualRefundJpy = 0 is valid (weather cancellation, policy forfeit, etc).
export async function finalizeCancellation(
  requestId: string,
  actorEmail: string,
  actualRefundJpy: number,
  adminDecisionNote?: string
): Promise<void> {
  const req = await prisma.bookingRequest.findUnique({
    where: { id: requestId },
    include: {
      booking: {
        include: {
          payments: true,
        },
      },
    },
  });
  if (!req) throw new Error("REQUEST_NOT_FOUND");
  if (req.type !== "CANCELLATION") throw new Error("NOT_A_CANCELLATION");
  if (!["PENDING_REVIEW", "APPROVED"].includes(req.status)) {
    throw new Error("REQUEST_NOT_APPROVABLE");
  }

  const booking = req.booking;
  const paxCount = booking.adultCount + booking.childCount;

  const netPaid = booking.payments.reduce((sum, p) => sum + p.amountJpy, 0);
  const safeRefundAmount = Math.min(actualRefundJpy, netPaid);

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // Restore seats (inside the transaction to avoid race conditions)
    const holdsSeats = ["CONFIRMED", "CASH_DUE"].includes(booking.status);

    if (holdsSeats) {
      if (booking.slotId) {
        const currentSlot = await tx.availabilitySlot.findUnique({
          where: { id: booking.slotId },
          select: { bookedCount: true },
        });
        if (currentSlot) {
          const safeNewBookedCount = Math.max(0, currentSlot.bookedCount - paxCount);
          await tx.availabilitySlot.update({
            where: { id: booking.slotId },
            data: { bookedCount: { set: safeNewBookedCount } },
          });
        }
      }

      if (booking.secondarySlotId) {
        const currentSecondarySlot = await tx.availabilitySlot.findUnique({
          where: { id: booking.secondarySlotId },
          select: { bookedCount: true },
        });
        if (currentSecondarySlot) {
          const safeNewSecondaryBookedCount = Math.max(0, currentSecondarySlot.bookedCount - paxCount);
          await tx.availabilitySlot.update({
            where: { id: booking.secondarySlotId },
            data: { bookedCount: { set: safeNewSecondaryBookedCount } },
          });
        }
      }
    }

    // Record refund payment entry
    if (safeRefundAmount > 0) {
      await tx.bookingPayment.create({
        data: {
          bookingId: booking.id,
          amountJpy: -safeRefundAmount,
          refundedJpy: safeRefundAmount,
          currency: "jpy",
          method: "manual_refund",
          status: "REFUNDED",
          refundedAt: new Date(),
          notes: `Admin finalized via request ${requestId}${adminDecisionNote ? `: ${adminDecisionNote}` : ""} (manual refund — admin returns cash/transfer to guest)`,
        },
      });
    }

    // Set booking paymentStatus to REFUNDED/UNPAID on cancellation
    const isPaid = booking.paymentStatus.toUpperCase().startsWith("PAID") || booking.paymentStatus === "PAID";

    // Cancel the booking
    await tx.booking.update({
      where: { id: booking.id },
      data: {
        status: "CANCELLED",
        paymentStatus: isPaid ? "REFUNDED" : "UNPAID",
        cancelledAt: new Date(),
        cancelledBy: "admin",
        cancellationReason:
          adminDecisionNote ?? req.adminDecisionNote ?? "Guest cancellation request approved",
      },
    });

    // Mark request finalized
    await tx.bookingRequest.update({
      where: { id: requestId },
      data: {
        status: "FINALIZED",
        finalizedAt: new Date(),
        adminDecisionNote: adminDecisionNote ?? req.adminDecisionNote,
      },
    });
  });

  await logAudit({
    bookingId: booking.id,
    action: "BOOKING_CANCELLED",
    actorEmail,
    description: `Cancellation finalized. Refund: ¥${safeRefundAmount.toLocaleString()} (manual — admin returns cash/transfer).`,
    after: { status: "CANCELLED", refundJpy: safeRefundAmount },
  });

  await triggerCancellationNotifications(booking.id, "admin").catch(() => {});
  if (safeRefundAmount > 0) {
    await triggerRefundNotifications(booking.id, safeRefundAmount).catch(() => {});
  }
}

export async function finalizeReschedule(
  requestId: string,
  actorEmail: string,
  newSlotId: string
): Promise<void> {
  const req = await prisma.bookingRequest.findUnique({
    where: { id: requestId },
    include: { booking: true },
  });
  if (!req) throw new Error("REQUEST_NOT_FOUND");
  if (req.type !== "RESCHEDULE") throw new Error("NOT_A_RESCHEDULE");
  if (!["PENDING_REVIEW", "APPROVED"].includes(req.status)) {
    throw new Error("REQUEST_NOT_APPROVABLE");
  }

  const booking = req.booking;
  const paxCount = booking.adultCount + booking.childCount;

  let newSlotDateStr = "";
  let newSlotStartTimeStr = "";

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const [oldSlot, oldSecondarySlot, newSlot] = await Promise.all([
      booking.slotId
        ? tx.availabilitySlot.findUnique({
            where: { id: booking.slotId },
            select: { bookedCount: true },
          })
        : Promise.resolve(null),
      booking.secondarySlotId
        ? tx.availabilitySlot.findUnique({
            where: { id: booking.secondarySlotId },
            select: { bookedCount: true },
          })
        : Promise.resolve(null),
      tx.availabilitySlot.findUnique({ where: { id: newSlotId } }),
    ]);

    if (!newSlot) throw new Error("NEW_SLOT_NOT_FOUND");
    if (newSlot.isBlocked) throw new Error("NEW_SLOT_IS_BLOCKED");

    const remaining = newSlot.maxCapacity - newSlot.bookedCount;
    if (remaining < paxCount) throw new Error("NEW_SLOT_INSUFFICIENT_CAPACITY");

    newSlotDateStr = newSlot.date.toISOString().slice(0, 10);
    newSlotStartTimeStr = newSlot.startTime;

    const safeOldSlotCount = oldSlot !== null ? Math.max(0, oldSlot.bookedCount - paxCount) : null;
    const safeOldSecondarySlotCount = oldSecondarySlot !== null ? Math.max(0, oldSecondarySlot.bookedCount - paxCount) : null;
    const safeNewBookedCount = Math.min(newSlot.maxCapacity, newSlot.bookedCount + paxCount);

    const holdsSeats = ["CONFIRMED", "CASH_DUE"].includes(booking.status);

    if (holdsSeats) {
      // Restore old primary slot
      if (booking.slotId && safeOldSlotCount !== null) {
        await tx.availabilitySlot.update({
          where: { id: booking.slotId },
          data: { bookedCount: { set: safeOldSlotCount } },
        });
      }

      // Restore old secondary slot (if combo)
      if (booking.secondarySlotId && safeOldSecondarySlotCount !== null) {
        await tx.availabilitySlot.update({
          where: { id: booking.secondarySlotId },
          data: { bookedCount: { set: safeOldSecondarySlotCount } },
        });
      }

      // Increment new slot
      await tx.availabilitySlot.update({
        where: { id: newSlotId },
        data: { bookedCount: { set: safeNewBookedCount } },
      });
    }

    // Release orphaned hold
    if (booking.holdId) {
      await tx.seatHold.updateMany({
        where: { id: booking.holdId, isReleased: false },
        data: { isReleased: true },
      });
    }

    // Update booking: set slotId to newSlotId, and if combo, clear secondarySlotId
    await tx.booking.update({
      where: { id: booking.id },
      data: {
        slotId: newSlotId,
        secondarySlotId: booking.isCombo ? null : undefined,
      },
    });

    await tx.bookingRequest.update({
      where: { id: requestId },
      data: {
        status: "FINALIZED",
        finalizedAt: new Date(),
        requestedNewSlotId: newSlotId,
      },
    });
  });

  await logAudit({
    bookingId: booking.id,
    action: "BOOKING_RESCHEDULED",
    actorEmail,
    description: `Reschedule finalized. New slot: ${newSlotId} (${newSlotDateStr} ${newSlotStartTimeStr})`,
    before: { slotId: booking.slotId },
    after: { slotId: newSlotId },
  });

  await triggerPostBookingNotifications(booking.id).catch(() => {});
}

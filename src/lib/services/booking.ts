/**
 * Booking service v4 — Concierge / Pay-on-Arrival model.
 *
 * PUBLIC CHECKOUT:
 *   Bookings are saved as PENDING / UNPAID inquiries.
 *   No seat hold is created. No capacity is deducted.
 *   The ops desk calls the guest to confirm; admin manually CONFIRMS which
 *   triggers the capacity deduction (see adminUpdateBookingStatus).
 *
 * ADMIN STATE MACHINE:
 *   PENDING → CONFIRMED : capacity deducted (Math.min guard)
 *   PENDING → CANCELLED : no seat restore (never deducted), no refund ledger
 *   CONFIRMED → CANCELLED: seats restored, no refund ledger (cash handled offline)
 *
 * Payment is handled offline: Cash, Bank Transfer, or Card Terminal.
 */
import { prisma } from "@/lib/prisma";
import { generateBookingReference, calcSubtotal, applyPromo } from "@/lib/utils";
import { logAudit } from "@/lib/services/audit";
import type { BookingStatus, BookingSource, Prisma } from "@prisma/client";
import { generateReceiptPdf, generateWaiverPdf, type PdfBookingData } from "@/lib/services/pdf";
import { uploadPdf } from "@/lib/storage";
import { notifyBookingConfirmed, notifyBookingCancelled, notifyRefundIssued, notifyBookingRequestReceived } from "@/lib/services/notifications";
import { sendPostTripEmailForBooking } from "@/lib/services/postTrip";

export interface CreateBookingInput {
  productId: string;
  slotId: string;
  activityType: "RAFTING" | "CANYONING";
  hasBbq: boolean;
  adultCount: number;
  childCount: number;
  leadName: string;
  leadEmail: string;
  leadPhone?: string;
  leadCountry?: string;
  customerNote?: string;
  specialRequest?: string;
  promoCode?: string;
  locale: string;
  source?: BookingSource;
  userAgent?: string;
  ipAddress?: string;
  termsAccepted?: boolean;
  waiverAccepted?: boolean;
  cancellationPolicyAccepted?: boolean;
  marketingConsent?: boolean;
  photoConsent?: boolean;
  participants: Array<{
    participantType: "ADULT" | "CHILD";
    firstName: string;
    lastName?: string;
    age?: number;
    waiverAccepted: boolean;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    accommodation?: string;
    dietaryNotes?: string;
    swimmingConfidence?: string;
    medicalNotes?: string;
  }>;
}

// Minimum advance booking window (hours) enforced server-side
export const BOOKING_CUTOFF_HOURS = 48;

/**
 * Create a PENDING/UNPAID booking inquiry — no seat hold, no capacity deduction.
 *
 * The booking is an inquiry only. The ops desk calls the guest to confirm
 * their preferred schedule. Admin then CONFIRMS the booking which deducts
 * capacity at that point (see adminUpdateBookingStatus).
 */
export async function createBooking(
  input: CreateBookingInput
): Promise<{ bookingId: string; reference: string }> {
  // Validate slot from DB (authoritative activityType)
  const dbSlot = await prisma.availabilitySlot.findUnique({
    where: { id: input.slotId },
    include: { product: true },
  });

  if (!dbSlot) throw new Error("SLOT_NOT_FOUND");

  const dbActivityType = dbSlot.product.activityType as "RAFTING" | "CANYONING";
  if (dbActivityType !== input.activityType) {
    throw new Error("ACTIVITY_TYPE_MISMATCH");
  }

  // Enforce 48h advance booking
  const slotDateStr = dbSlot.date.toISOString().slice(0, 10);
  const departureAt = new Date(`${slotDateStr}T${dbSlot.startTime}:00+09:00`);
  const cutoffMs    = BOOKING_CUTOFF_HOURS * 60 * 60 * 1000;
  if (departureAt.getTime() - Date.now() < cutoffMs) {
    throw new Error("BOOKING_TOO_LATE");
  }

  // Resolve promo
  let promotionId: string | undefined;
  let promoData: { type: "PERCENT" | "FIXED"; value: number } | null = null;
  let promoSnapshot: { type: string; value: number } | null = null;

  if (input.promoCode) {
    const promo = await prisma.promotion.findUnique({
      where: { code: input.promoCode.toUpperCase() },
    });
    const now = new Date();
    if (
      promo &&
      promo.isActive &&
      (!promo.validFrom || promo.validFrom <= now) &&
      (!promo.validUntil || promo.validUntil >= now) &&
      (!promo.maxUses || promo.usedCount < promo.maxUses)
    ) {
      promotionId = promo.id;
      promoData = { type: promo.type, value: promo.value };
      promoSnapshot = { type: promo.type, value: promo.value };
    }
  }

  // Calculate pricing from hardcoded constants
  const subtotal = calcSubtotal({
    activityType: dbActivityType,
    adultCount:   input.adultCount,
    childCount:   input.childCount,
  });
  const { discount, total } = applyPromo(subtotal, promoData);
  const reference = generateBookingReference();

  // Create PENDING/UNPAID booking — pure inquiry, no seat hold, no capacity deduction
  const booking = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    if (promotionId) {
      await tx.promotion.update({
        where: { id: promotionId },
        data: { usedCount: { increment: 1 } },
      });
    }

    const newBooking = await tx.booking.create({
      data: {
        reference,
        productId:    dbSlot.productId,
        slotId:       input.slotId,
        hasBbq:       input.hasBbq,
        adultCount:   input.adultCount,
        childCount:   input.childCount,
        subtotalJpy:  subtotal,
        discountJpy:  discount,
        totalJpy:     total,
        promotionId,
        promoCode:    input.promoCode,
        promoType:    promoSnapshot?.type,
        promoValue:   promoSnapshot?.value,
        promoDiscountJpy: discount > 0 ? discount : undefined,
        // ── Concierge model: inquiry only ───────────────────────────
        status:        "PENDING",
        paymentStatus: "PENDING",
        // No holdId — no seat hold created at inquiry time
        // ────────────────────────────────────────────────────────────
        leadName:    input.leadName,
        leadEmail:   input.leadEmail.toLowerCase().trim(),
        leadPhone:   input.leadPhone,
        leadCountry: input.leadCountry,
        leadLocale:  input.locale,
        locale:      input.locale,
        source:      input.source ?? "WEB",
        userAgent:   input.userAgent,
        ipAddress:   input.ipAddress,
        customerNote:  input.customerNote,
        specialRequest: input.specialRequest,
        termsAccepted:              input.termsAccepted ?? false,
        waiverAccepted:             input.waiverAccepted ?? false,
        cancellationPolicyAccepted: input.cancellationPolicyAccepted ?? false,
        marketingConsent:           input.marketingConsent ?? false,
        photoConsent:               input.photoConsent ?? false,
        participants: {
          create: input.participants.map((p, i) => ({
            participantType: p.participantType,
            firstName:       p.firstName,
            lastName:        p.lastName,
            age:             p.age,
            waiverAccepted:  p.waiverAccepted,
            waiverAcceptedAt: p.waiverAccepted ? new Date() : null,
            emergencyContactName:  p.emergencyContactName,
            emergencyContactPhone: p.emergencyContactPhone,
            accommodation:     p.accommodation,
            dietaryNotes:      p.dietaryNotes,
            swimmingConfidence: p.swimmingConfidence,
            medicalNotes:      p.medicalNotes,
            sortOrder: i,
          })),
        },
      },
      include: { product: true, slot: true },
    });

    return newBooking;
  });

  await logAudit({
    bookingId: booking.id,
    action: "BOOKING_CREATED",
    actorEmail: "system",
    description: `Web booking inquiry created for ${input.leadName} — ${booking.reference} (PENDING — ops to call and confirm)`,
    after: { status: "PENDING", paymentStatus: "PENDING", total },
  });

  return { bookingId: booking.id, reference: booking.reference };
}

/**
 * Admin manually confirms a booking after receiving payment.
 * Atomically increments bookedCount, releases hold, updates statuses.
 */
export async function confirmBooking(
  bookingId: string,
  amountJpy: number,
  paymentMethod: string,
  actorEmail: string
): Promise<void> {
  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: { slot: true },
    });

    if (!booking) throw new Error("BOOKING_NOT_FOUND");
    if (booking.status === "CONFIRMED") return; // idempotent

    const paxCount = booking.adultCount + booking.childCount;

    if (booking.slotId) {
      const currentSlot = await tx.availabilitySlot.findUnique({
        where: { id: booking.slotId },
        select: { bookedCount: true, maxCapacity: true },
      });
      if (currentSlot) {
        const safeCount = Math.min(currentSlot.maxCapacity, currentSlot.bookedCount + paxCount);
        await tx.availabilitySlot.update({
          where: { id: booking.slotId },
          data: { bookedCount: { set: safeCount } },
        });
      }
    }

    if (booking.holdId) {
      await tx.seatHold.updateMany({
        where: { id: booking.holdId },
        data: { isReleased: true },
      });
    }

    await tx.bookingPayment.create({
      data: {
        bookingId,
        amountJpy,
        currency: "jpy",
        method: paymentMethod,
        status: "PAID",
        paidAt: new Date(),
      },
    });

    await tx.booking.update({
      where: { id: bookingId },
      data: {
        status: "CONFIRMED",
        paymentStatus: "PAID",
        confirmedAt: new Date(),
      },
    });
  });

  await logAudit({
    bookingId,
    action: "BOOKING_CONFIRMED",
    actorEmail,
    description: `Booking confirmed — payment received via ${paymentMethod}`,
    after: { status: "CONFIRMED", paymentStatus: "PAID" },
  });

  await triggerPostBookingNotifications(bookingId).catch(() => {});
}

/**
 * Cancel a booking and restore slot capacity.
 */
export async function cancelBooking(
  bookingId: string,
  actorEmail: string,
  reason?: string,
  cancelledBy: "guest" | "admin" | "system" = "admin"
): Promise<void> {
  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const booking = await tx.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new Error("BOOKING_NOT_FOUND");
    if (booking.status === "CANCELLED") return;
    if (booking.status === "COMPLETED") throw new Error("Cannot cancel a completed booking");
    if (booking.status === "EXPIRED") throw new Error("Cannot cancel an expired booking");

    const paxCount = booking.adultCount + booking.childCount;
    const holdsSeats = ["CONFIRMED", "CASH_DUE"].includes(booking.status);

    // Restore primary slot capacity (Rafting or single-activity)
    if (holdsSeats && booking.slotId) {
      const currentSlot = await tx.availabilitySlot.findUnique({
        where: { id: booking.slotId },
        select: { bookedCount: true },
      });
      if (currentSlot) {
        const safeCount = Math.max(0, currentSlot.bookedCount - paxCount);
        await tx.availabilitySlot.update({
          where: { id: booking.slotId },
          data: { bookedCount: { set: safeCount } },
        });
      }
    }

    // Restore secondary slot capacity (Canyoning leg of a Combo Package)
    if (holdsSeats && booking.secondarySlotId) {
      const currentSecondarySlot = await tx.availabilitySlot.findUnique({
        where: { id: booking.secondarySlotId },
        select: { bookedCount: true },
      });
      if (currentSecondarySlot) {
        const safeCount = Math.max(0, currentSecondarySlot.bookedCount - paxCount);
        await tx.availabilitySlot.update({
          where: { id: booking.secondarySlotId },
          data: { bookedCount: { set: safeCount } },
        });
      }
    }
    if (booking.holdId) {
      await tx.seatHold.updateMany({
        where: { id: booking.holdId, isReleased: false },
        data: { isReleased: true },
      });
    }

    const payments = await tx.bookingPayment.findMany({
      where: { bookingId },
      select: { amountJpy: true },
    });
    const netPaid = payments.reduce((sum, p) => sum + p.amountJpy, 0);

    if (netPaid > 0) {
      await tx.bookingPayment.create({
        data: {
          bookingId,
          amountJpy: -netPaid,
          refundedJpy: netPaid,
          currency: "jpy",
          method: "manual_refund",
          status: "REFUNDED",
          refundedAt: new Date(),
          notes: `Booking cancelled by ${cancelledBy}. Auto-recorded full refund of ¥${netPaid.toLocaleString()} in ledger.`,
        },
      });
    }

    const isPaid = booking.paymentStatus.toUpperCase().startsWith("PAID") || booking.paymentStatus === "PAID";
    await tx.booking.update({
      where: { id: bookingId },
      data: {
        status: "CANCELLED",
        paymentStatus: isPaid ? "REFUNDED" : "UNPAID",
        cancelledAt: new Date(),
        cancelledBy,
        cancellationReason: reason,
      },
    });
  });

  await logAudit({
    bookingId,
    action: "BOOKING_CANCELLED",
    actorEmail,
    description: `Booking cancelled by ${cancelledBy}${reason ? `: ${reason}` : ""}`,
    after: { status: "CANCELLED", cancelledBy },
  });

  await triggerCancellationNotifications(bookingId, cancelledBy).catch(() => {});
}

/**
 * Admin: update booking status or payment status.
 */
export async function adminUpdateBookingStatus(
  bookingId: string,
  actorEmail: string,
  updates: {
    status?: BookingStatus;
    paymentStatus?: string;
    adminNote?: string;
  }
): Promise<void> {
  const { revalidatePath } = await import("next/cache");

  const before = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      status: true,
      paymentStatus: true,
      confirmedAt: true,
      slotId: true,
      secondarySlotId: true,
      adultCount: true,
      childCount: true,
      holdId: true,
    },
  });
  if (!before) throw new Error("BOOKING_NOT_FOUND");

  // Terminal status transition guard
  if (updates.status && updates.status !== before.status) {
    if (["CANCELLED", "COMPLETED", "EXPIRED"].includes(before.status)) {
      throw new Error(
        `INVALID_STATUS_TRANSITION: Cannot change status from terminal state ${before.status}`
      );
    }
  }

  // COMPLETED guard: only CONFIRMED bookings, only after the trip date
  if (updates.status === "COMPLETED") {
    if (before.status !== "CONFIRMED") {
      throw new Error(
        `INVALID_STATUS_TRANSITION: Only CONFIRMED bookings can be marked COMPLETED. Current status: ${before.status}`
      );
    }
    if (before.slotId) {
      const slot = await prisma.availabilitySlot.findUnique({
        where: { id: before.slotId },
        select: { date: true },
      });
      if (slot) {
        const slotDateStr = slot.date.toISOString().slice(0, 10);
        const todayStr    = new Date().toISOString().slice(0, 10);
        if (slotDateStr > todayStr) {
          throw new Error(
            `TRIP_IN_FUTURE: Cannot mark booking as COMPLETED — trip date (${slotDateStr}) has not passed yet.`
          );
        }
      }
    }
  }

  const beforeHoldsSeats = ["CONFIRMED", "CASH_DUE"].includes(before.status);
  const afterHoldsSeats = updates.status
    ? ["CONFIRMED", "CASH_DUE"].includes(updates.status)
    : beforeHoldsSeats;

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    if (updates.status && updates.status !== before.status) {
      const paxCount = before.adultCount + before.childCount;

      // 1. DECREMENT: holds seats before, but not after
      if (beforeHoldsSeats && !afterHoldsSeats) {
        // Restore primary slot
        if (before.slotId) {
          const currentSlot = await tx.availabilitySlot.findUnique({
            where: { id: before.slotId },
            select: { bookedCount: true },
          });
          if (currentSlot) {
            const safeCount = Math.max(0, currentSlot.bookedCount - paxCount);
            await tx.availabilitySlot.update({
              where: { id: before.slotId },
              data: { bookedCount: { set: safeCount } },
            });
          }
        }
        // Restore secondary slot
        if (before.secondarySlotId) {
          const currentSecSlot = await tx.availabilitySlot.findUnique({
            where: { id: before.secondarySlotId },
            select: { bookedCount: true },
          });
          if (currentSecSlot) {
            const safeCount = Math.max(0, currentSecSlot.bookedCount - paxCount);
            await tx.availabilitySlot.update({
              where: { id: before.secondarySlotId },
              data: { bookedCount: { set: safeCount } },
            });
          }
        }

        if (before.holdId) {
          await tx.seatHold.updateMany({
            where: { id: before.holdId, isReleased: false },
            data: { isReleased: true },
          });
        }
      }

      // 2. INCREMENT: does not hold seats before, but holds after
      if (!beforeHoldsSeats && afterHoldsSeats) {
        // Primary slot
        if (before.slotId) {
          const currentSlot = await tx.availabilitySlot.findUnique({
            where: { id: before.slotId },
            select: { bookedCount: true, maxCapacity: true },
          });
          if (currentSlot) {
            const newCount = Math.min(currentSlot.maxCapacity, currentSlot.bookedCount + paxCount);
            await tx.availabilitySlot.update({
              where: { id: before.slotId },
              data: { bookedCount: { set: newCount } },
            });
          }
        }
        // Secondary slot
        if (before.secondarySlotId) {
          const currentSecSlot = await tx.availabilitySlot.findUnique({
            where: { id: before.secondarySlotId },
            select: { bookedCount: true, maxCapacity: true },
          });
          if (currentSecSlot) {
            const newCount = Math.min(currentSecSlot.maxCapacity, currentSecSlot.bookedCount + paxCount);
            await tx.availabilitySlot.update({
              where: { id: before.secondarySlotId },
              data: { bookedCount: { set: newCount } },
            });
          }
        }

        if (before.holdId) {
          await tx.seatHold.updateMany({
            where: { id: before.holdId },
            data: { isReleased: true },
          });
        }
      }

      if (updates.status === "CANCELLED") {
        const isPaid = before.paymentStatus.toUpperCase().startsWith("PAID") || before.paymentStatus === "PAID";
        await tx.booking.update({
          where: { id: bookingId },
          data: {
            status: "CANCELLED",
            paymentStatus: isPaid ? "REFUNDED" : "UNPAID",
            cancelledAt: new Date(),
            cancelledBy: "admin",
            cancellationReason: "Admin changed status via dropdown",
            ...(updates.adminNote !== undefined ? { adminNote: updates.adminNote } : {}),
          },
        });
      } else {
        // Generic update for non-cancelled status transitions
        await tx.booking.update({
          where: { id: bookingId },
          data: {
            status: updates.status,
            ...(updates.paymentStatus ? { paymentStatus: updates.paymentStatus } : {}),
            ...(updates.adminNote !== undefined ? { adminNote: updates.adminNote } : {}),
            ...(updates.status === "CONFIRMED" && !before.confirmedAt ? { confirmedAt: new Date() } : {}),
            ...(updates.status === "COMPLETED" ? { completedAt: new Date() } : {}),
          },
        });
      }
    } else {
      // Updates without status change
      await tx.booking.update({
        where: { id: bookingId },
        data: {
          ...(updates.paymentStatus ? { paymentStatus: updates.paymentStatus } : {}),
          ...(updates.adminNote !== undefined ? { adminNote: updates.adminNote } : {}),
        },
      });
    }
  });

  await logAudit({
    bookingId,
    action: "BOOKING_STATUS_CHANGED",
    actorEmail,
    description: updates.status === "CANCELLED"
      ? `Admin cancelled booking via status dropdown.`
      : `Admin updated booking status/payment`,
    before: before as never,
    after: updates as never,
  });

  if (updates.status === "CONFIRMED" && before.status !== "CONFIRMED") {
    await triggerPostBookingNotifications(bookingId).catch(() => {});
  } else if (updates.status === "CANCELLED" && before.status !== "CANCELLED") {
    await triggerCancellationNotifications(bookingId, "admin").catch(() => {});
  } else if (updates.status === "COMPLETED" && before.status !== "COMPLETED") {
    // Fire the post-trip "Thank You + VIP Discount" email when admin manually
    // marks a booking as COMPLETED via the status dropdown.
    await sendPostTripEmailForBooking(bookingId).catch((e) => {
      console.error("[adminUpdateBookingStatus] Post-trip email failed:", e);
    });
  }

  revalidatePath(`/admin/bookings/${bookingId}`);
  revalidatePath("/admin/bookings");
  revalidatePath("/admin");
}

/**
 * Record a manual refund in the payment ledger.
 */
export async function recordRefund(
  bookingId: string,
  amountJpy: number,
  isPartial: boolean,
  actorEmail: string,
  notes?: string
): Promise<void> {
  const payments = await prisma.bookingPayment.findMany({
    where: { bookingId },
    select: { amountJpy: true },
  });
  const netPaid = payments.reduce((sum, p) => sum + p.amountJpy, 0);

  const safeAmount = Math.min(Math.max(0, amountJpy), netPaid);

  if (safeAmount === 0) {
    await logAudit({
      bookingId,
      action: "REFUND_ISSUED",
      actorEmail,
      description: `Zero-amount refund skipped (requested: ${amountJpy}, netPaid: ${netPaid})`,
      after: { refundAmountJpy: 0, skipped: true },
    });
    return;
  }

  const newPaymentStatus: string = isPartial ? "PENDING" : "PAID";

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.bookingPayment.create({
      data: {
        bookingId,
        amountJpy: -safeAmount,
        refundedJpy: safeAmount,
        currency: "jpy",
        method: "manual_refund",
        status: "REFUNDED",
        refundedAt: new Date(),
        notes,
      },
    });

    await tx.booking.update({
      where: { id: bookingId },
      data: { paymentStatus: newPaymentStatus },
    });
  });

  await logAudit({
    bookingId,
    action: "REFUND_ISSUED",
    actorEmail,
    description: `Refund of ¥${safeAmount.toLocaleString()} issued (${isPartial ? "partial" : "full"})`,
    after: { refundAmountJpy: safeAmount, newPaymentStatus },
  });

  if (safeAmount > 0) {
    await triggerRefundNotifications(bookingId, safeAmount).catch(() => {});
  }
}

export async function lookupBooking(reference: string, email: string) {
  return prisma.booking.findFirst({
    where: {
      reference: reference.toUpperCase(),
      leadEmail: email.toLowerCase(),
    },
    include: {
      product: { select: { nameEn: true, nameJa: true, activityType: true } },
      slot: { select: { date: true, startTime: true } },
      participants: true,
      payments: { orderBy: { createdAt: "desc" } },
    },
  });
}

export async function getBookingById(bookingId: string) {
  return prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      product: true,
      slot: true,
      secondarySlot: true,
      participants: { orderBy: { sortOrder: "asc" } },
      payments: { orderBy: { createdAt: "desc" } },
      messages: { orderBy: { sentAt: "asc" } },
      auditLogs: { orderBy: { createdAt: "desc" } },
    },
  });
}

export interface AdminBookingFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: BookingStatus;
  paymentStatus?: string;
  activityType?: "RAFTING" | "CANYONING" | "COMBO";
  source?: BookingSource;
  dateFrom?: string;
  dateTo?: string;
}

export async function getAdminBookings(filters: AdminBookingFilters = {}) {
  const {
    page = 1,
    pageSize = 50,
    search,
    status,
    paymentStatus,
    activityType,
    source,
    dateFrom,
    dateTo,
  } = filters;

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { reference: { contains: search.toUpperCase() } },
      { leadName: { contains: search, mode: "insensitive" } },
      { leadEmail: { contains: search, mode: "insensitive" } },
      { leadPhone: { contains: search } },
    ];
  }
  if (status) where.status = status;
  if (paymentStatus) where.paymentStatus = paymentStatus;
  if (source) where.source = source;
  if (activityType === "COMBO") {
    // COMBO is a virtual activity type — it maps to isCombo:true on the booking
    where.isCombo = true;
  } else if (activityType) {
    where.product = { activityType };
  }
  if (dateFrom || dateTo) {
    where.slot = {
      date: {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo ? { lte: new Date(dateTo) } : {}),
      },
    };
  }

  const [rawBookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        product: { select: { nameEn: true, activityType: true } },
        slot: { select: { date: true, startTime: true } },
      },
      // isCombo and comboDate come through as top-level booking fields (not relations)
    }),
    prisma.booking.count({ where }),
  ]);

  // ── VIP Return Guest: count prior COMPLETED bookings per email ──────────────
  // Collect the unique emails from this page, then run a single groupBy to count
  // how many COMPLETED bookings each email has across the entire dataset (case-insensitive).
  const pageEmails = [...new Set(rawBookings.map((b) => b.leadEmail.toLowerCase().trim()))];

  const completedCounts = pageEmails.length
    ? await prisma.booking.groupBy({
        by: ["leadEmail"],
        where: {
          leadEmail: { in: pageEmails, mode: "insensitive" },
          status: "COMPLETED",
        },
        _count: { id: true },
      })
    : [];

  const completedByEmail = new Map<string, number>();
  for (const row of completedCounts) {
    const emailKey = row.leadEmail.toLowerCase().trim();
    completedByEmail.set(emailKey, (completedByEmail.get(emailKey) ?? 0) + row._count.id);
  }

  // Attach pastCompletedCount to every booking on this page.
  // Note: if the CURRENT booking itself has status COMPLETED it is also counted,
  // so we subtract 1 only for the booking being viewed to represent *other* completed trips.
  const bookings = rawBookings.map((b) => {
    const emailKey = b.leadEmail.toLowerCase().trim();
    const totalCompleted = completedByEmail.get(emailKey) ?? 0;
    // Subtract 1 if the current booking is itself COMPLETED so we don't count it
    const pastCompletedCount =
      b.status === "COMPLETED" ? Math.max(0, totalCompleted - 1) : totalCompleted;
    return { ...b, pastCompletedCount };
  });

  return { bookings, total, page, pageSize };
}

export async function getTodayManifest() {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay   = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  return prisma.booking.findMany({
    where: {
      slot: { date: { gte: startOfDay, lt: endOfDay } },
      status: { in: ["CONFIRMED", "PENDING"] },
    },
    orderBy: [{ slot: { startTime: "asc" } }],
    include: {
      product: { select: { nameEn: true, activityType: true } },
      slot: { select: { date: true, startTime: true } },
      participants: { orderBy: { sortOrder: "asc" } },
    },
  });
}

export async function triggerPostBookingNotifications(
  bookingId: string
): Promise<void> {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        product: true,
        slot: true,
        participants: { orderBy: { sortOrder: "asc" } },
      },
    });

    if (!booking) {
      console.warn(`[booking/create] Booking not found for notifications: ${bookingId}`);
      return;
    }

    const isJa = booking.locale === "ja";
    const slotDateStr = booking.slot
      ? booking.slot.date.toISOString().slice(0, 10)
      : (booking.comboDate
          ? booking.comboDate.toISOString().slice(0, 10)
          : "Flexible");
    const startTimeStr = booking.slot ? booking.slot.startTime : "Flexible";

    let receiptBuf: Buffer;
    let waiverBuf: Buffer;

    try {
      const pdfData: PdfBookingData = {
        reference: booking.reference,
        locale: booking.locale as "en" | "ja",
        leadName: booking.leadName,
        leadEmail: booking.leadEmail,
        leadPhone: booking.leadPhone,
        activityNameEn: booking.isCombo ? "Rafting + Canyoning Combo" : booking.product.nameEn,
        activityNameJa: booking.isCombo ? "ラフティング＋キャニオニング コンボ" : booking.product.nameJa,
        activityType: (booking.isCombo ? "RAFTING" : booking.product.activityType) as "RAFTING" | "CANYONING",
        slotDate: slotDateStr,
        startTime: startTimeStr,
        adultCount: booking.adultCount,
        childCount: booking.childCount,
        hasBbq: booking.hasBbq,
        subtotalJpy: booking.subtotalJpy,
        discountJpy: booking.discountJpy,
        totalJpy: booking.totalJpy,
        promoCode: booking.promoCode,
        paymentStatus: booking.paymentStatus,
        confirmedAt: booking.confirmedAt,
        participants: booking.participants.map((p) => ({
          firstName: p.firstName,
          lastName: p.lastName,
          participantType: p.participantType as "ADULT" | "CHILD",
          age: p.age,
          waiverAccepted: p.waiverAccepted,
          emergencyContactName: p.emergencyContactName,
          emergencyContactPhone: p.emergencyContactPhone,
          swimmingConfidence: p.swimmingConfidence,
          medicalNotes: p.medicalNotes,
          dietaryNotes: p.dietaryNotes,
        })),
        isCombo: booking.isCombo,
      };

      [receiptBuf, waiverBuf] = await Promise.all([
        generateReceiptPdf(pdfData),
        generateWaiverPdf(pdfData),
      ]);

      const receiptPath = `receipts/${booking.reference}-receipt-${booking.locale}.pdf`;
      const waiverPath  = `waivers/${booking.reference}-waiver-${booking.locale}.pdf`;

      const [receiptResult, waiverResult] = await Promise.allSettled([
        uploadPdf(receiptPath, receiptBuf),
        uploadPdf(waiverPath, waiverBuf),
      ]);

      const resolvedReceiptPath = receiptResult.status === "fulfilled" ? receiptPath : null;
      const resolvedWaiverPath = waiverResult.status === "fulfilled" ? waiverPath : null;

      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          receiptPdfPath: resolvedReceiptPath,
          waiverPdfPath: resolvedWaiverPath,
          receiptPdfGeneratedAt: new Date(),
          waiverPdfGeneratedAt: new Date(),
        },
      });

      await logAudit({
        bookingId: booking.id,
        action: "PDF_GENERATED",
        actorEmail: "system",
        description: `Receipt and Waiver PDFs generated for booking ${booking.reference}`,
      });
    } catch (pdfErr) {
      console.error(`[booking/create] PDF generation/upload failed for ${booking.reference}:`, pdfErr);
    }

    await notifyBookingConfirmed({
      bookingId: booking.id,
      to: booking.leadEmail,
      locale: booking.locale as "en" | "ja",
      reference: booking.reference,
      leadName: booking.leadName,
      activityName: booking.isCombo
        ? (isJa ? "ラフティング＋キャニオニング コンボ" : "Rafting + Canyoning Combo")
        : (isJa ? booking.product.nameJa : booking.product.nameEn),
      date: slotDateStr,
      startTime: startTimeStr,
      adultCount: booking.adultCount,
      childCount: booking.childCount,
      totalJpy: booking.totalJpy,
      hasBbq: booking.hasBbq,
      slotDate: booking.slot?.date ?? booking.comboDate ?? undefined,
      appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "https://thedreamadventure.com",
      isCombo: booking.isCombo,
    });
  } catch (notifyErr) {
    console.error(`[booking/create] Post-booking notifications failed for ${bookingId}:`, notifyErr);
  }
}

export async function triggerPendingBookingNotifications(
  bookingId: string
): Promise<void> {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        product: true,
        slot: true,
      },
    });

    if (!booking) {
      console.warn(`[booking/create] Booking not found for notifications: ${bookingId}`);
      return;
    }

    const isJa = booking.locale === "ja";
    const slotDateStr = booking.slot
      ? booking.slot.date.toISOString().slice(0, 10)
      : (booking.comboDate
          ? booking.comboDate.toISOString().slice(0, 10)
          : "Flexible");
    const startTimeStr = booking.slot ? booking.slot.startTime : "Flexible";

    await notifyBookingRequestReceived({
      bookingId: booking.id,
      to: booking.leadEmail,
      locale: booking.locale as "en" | "ja",
      reference: booking.reference,
      leadName: booking.leadName,
      activityName: booking.isCombo
        ? (isJa ? "ラフティング＋キャニオニング コンボ" : "Rafting + Canyoning Combo")
        : (isJa ? booking.product.nameJa : booking.product.nameEn),
      date: slotDateStr,
      startTime: startTimeStr,
      adultCount: booking.adultCount,
      childCount: booking.childCount,
      totalJpy: booking.totalJpy,
      hasBbq: booking.hasBbq,
      slotDate: booking.slot?.date ?? booking.comboDate ?? undefined,
      appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "https://thedreamadventure.com",
      isCombo: booking.isCombo,
    });
  } catch (notifyErr) {
    console.error(`[booking/create] Pending-booking notifications failed for ${bookingId}:`, notifyErr);
  }
}

export async function triggerCancellationNotifications(
  bookingId: string,
  cancelledBy: string
): Promise<void> {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { product: true, slot: true },
    });
    if (!booking) return;

    const isJa = booking.locale === "ja";
    const slotDateStr = booking.slot
      ? booking.slot.date.toISOString().slice(0, 10)
      : (booking.comboDate
          ? booking.comboDate.toISOString().slice(0, 10)
          : "Flexible");
    const startTimeStr = booking.slot ? booking.slot.startTime : "Flexible";

    await notifyBookingCancelled({
      bookingId: booking.id,
      to: booking.leadEmail,
      locale: booking.locale as "en" | "ja",
      reference: booking.reference,
      leadName: booking.leadName,
      activityName: booking.isCombo
        ? (isJa ? "ラフティング＋キャニオニング コンボ" : "Rafting + Canyoning Combo")
        : (isJa ? booking.product.nameJa : booking.product.nameEn),
      date: slotDateStr,
      startTime: startTimeStr,
      adultCount: booking.adultCount,
      childCount: booking.childCount,
      totalJpy: booking.totalJpy,
      hasBbq: booking.hasBbq,
      slotDate: booking.slot?.date ?? booking.comboDate ?? undefined,
      appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "https://thedreamadventure.com",
      isCombo: booking.isCombo,
    }, cancelledBy);
  } catch (err) {
    console.error(`[triggerCancellationNotifications] Failed for ${bookingId}:`, err);
  }
}

export async function triggerRefundNotifications(
  bookingId: string,
  refundAmountJpy: number
): Promise<void> {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { product: true, slot: true },
    });
    if (!booking) return;

    const isJa = booking.locale === "ja";
    const slotDateStr = booking.slot
      ? booking.slot.date.toISOString().slice(0, 10)
      : (booking.comboDate
          ? booking.comboDate.toISOString().slice(0, 10)
          : "Flexible");
    const startTimeStr = booking.slot ? booking.slot.startTime : "Flexible";

    await notifyRefundIssued({
      bookingId: booking.id,
      to: booking.leadEmail,
      locale: booking.locale as "en" | "ja",
      reference: booking.reference,
      leadName: booking.leadName,
      activityName: booking.isCombo
        ? (isJa ? "ラフティング＋キャニオニング コンボ" : "Rafting + Canyoning Combo")
        : (isJa ? booking.product.nameJa : booking.product.nameEn),
      date: slotDateStr,
      startTime: startTimeStr,
      adultCount: booking.adultCount,
      childCount: booking.childCount,
      totalJpy: booking.totalJpy,
      hasBbq: booking.hasBbq,
      slotDate: booking.slot?.date ?? booking.comboDate ?? undefined,
      appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "https://thedreamadventure.com",
      isCombo: booking.isCombo,
    }, refundAmountJpy);
  } catch (err) {
    console.error(`[triggerRefundNotifications] Failed for ${bookingId}:`, err);
  }
}

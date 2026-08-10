/**
 * PATCH /api/admin/bookings/[id]
 * Admin booking actions: status change, payment status, cancel, refund, note,
 * and FINALIZE_CANCEL (the only path that cancels a paid booking).
 *
 * All payments are manual — no Stripe integration.
 * FINALIZE_CANCEL: admin physically returns refund to guest (cash/bank/card).
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  adminUpdateBookingStatus,
  cancelBooking,
  recordRefund,
  triggerCancellationNotifications,
  triggerRefundNotifications,
} from "@/lib/services/booking";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/services/audit";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";

interface Params { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const actorEmail = session.user?.email ?? "admin";

  try {
    switch (body.action) {

      // ── Status mutations ───────────────────────────────────────────────────
      case "STATUS": {
        const currentBooking = await prisma.booking.findUnique({
          where: { id },
          select: { status: true, paymentStatus: true },
        });
        if (!currentBooking) {
          return NextResponse.json({ error: "Booking not found" }, { status: 404 });
        }

        // Terminal status guard
        if (["CANCELLED", "COMPLETED", "EXPIRED"].includes(currentBooking.status)) {
          return NextResponse.json(
            { error: `Cannot change the status of a ${currentBooking.status} booking.` },
            { status: 409 }
          );
        }

        // Paid bookings cannot be cancelled via status dropdown —
        // they must go through FINALIZE_CANCEL to ensure refund handling.
        if (body.status === "CANCELLED") {
          const isPaid = currentBooking.paymentStatus?.startsWith("PAID");
          if (isPaid) {
            return NextResponse.json(
              { error: "This booking has been paid. Use the 'Finalize Cancellation' panel to cancel and return the refund to the guest manually." },
              { status: 409 }
            );
          }
          await cancelBooking(id, actorEmail, "Admin cancelled via status dropdown", "admin");
          break;
        }

        await adminUpdateBookingStatus(id, actorEmail, { status: body.status });
        break;
      }

      case "PAYMENT_STATUS": {
        const newStatus: string = body.paymentStatus;

        // Guard: cannot set PAID on a CANCELLED booking
        const bookingForGuard = await prisma.booking.findUnique({
          where: { id },
          select: { status: true, totalJpy: true, reference: true },
        });
        if (!bookingForGuard) {
          return NextResponse.json({ error: "Booking not found" }, { status: 404 });
        }
        if (
          bookingForGuard.status === "CANCELLED" &&
          newStatus.toUpperCase().startsWith("PAID")
        ) {
          return NextResponse.json(
            { error: "Cannot update payment status to PAID on a cancelled booking." },
            { status: 409 }
          );
        }

        // Block direct REFUNDED setting — must go through FINALIZE_CANCEL
        if (newStatus.toUpperCase().startsWith("REFUNDED")) {
          return NextResponse.json(
            { error: "Cannot set a REFUNDED status directly. Use the 'Finalize Cancellation' panel." },
            { status: 409 }
          );
        }

        await adminUpdateBookingStatus(id, actorEmail, { paymentStatus: newStatus });

        // Write BookingPayment ledger record for manual PAID changes
        const bk = bookingForGuard;
        if (newStatus.startsWith("PAID")) {
          const existingPositive = await prisma.bookingPayment.findFirst({
            where: { bookingId: id, amountJpy: { gt: 0 } },
          });

          const methodRaw = newStatus
            .replace(/^PAID\s*-?\s*/i, "")
            .toLowerCase()
            .trim()
            .replace(/\s+/g, "_");
          const METHOD_ALIASES: Record<string, string> = {
            cash:          "cash",
            bank_transfer: "bank_transfer",
            card_terminal: "card_terminal",
          };
          let method = (METHOD_ALIASES[methodRaw] ?? methodRaw) || "manual";
          if (method === "stripe") {
            method = "manual";
          }

          if (!existingPositive) {
            await prisma.bookingPayment.create({
              data: {
                bookingId: id,
                amountJpy: bk.totalJpy,
                currency:  "jpy",
                method,
                status:    newStatus,
                paidAt:    new Date(),
                notes: `Payment recorded manually by admin (${actorEmail}) as: ${newStatus}`,
              },
            });
          } else {
            await prisma.bookingPayment.update({
              where: { id: existingPositive.id },
              data: { status: newStatus, method, paidAt: existingPositive.paidAt ?? new Date() },
            });
          }
        }
        break;
      }

      case "NOTE":
        await adminUpdateBookingStatus(id, actorEmail, { adminNote: body.adminNote });
        break;

      case "CANCEL":
        await cancelBooking(id, actorEmail, body.reason ?? "Admin cancelled", "admin");
        break;

      case "REFUND":
        await recordRefund(
          id,
          body.refundAmountJpy,
          body.isPartial ?? false,
          actorEmail,
          body.notes
        );
        break;

      // ── Finalize Cancellation ──────────────────────────────────────────────
      // The ONLY code path that cancels a paid booking.
      //
      // State machine guardrails:
      //   CONFIRMED booking: restore seats + write refund ledger (admin returns cash/card to guest)
      //   PENDING/UNPAID booking: skip seat restore (never deducted) + skip refund ledger (never paid)
      case "FINALIZE_CANCEL": {
        const refundAmountJpy: number = Number(body.refundAmountJpy ?? 0);
        const adminDecisionNote: string = body.adminDecisionNote ?? "";

        if (isNaN(refundAmountJpy) || refundAmountJpy < 0) {
          return NextResponse.json({ error: "Invalid refund amount" }, { status: 400 });
        }

        const booking = await prisma.booking.findUnique({
          where: { id },
          include: {
            slot: { select: { id: true, bookedCount: true } },
            secondarySlot: { select: { id: true, bookedCount: true } },
            payments: {
              where: { amountJpy: { gt: 0 } },
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        });
        if (!booking) {
          return NextResponse.json({ error: "Booking not found" }, { status: 404 });
        }
        if (booking.status === "CANCELLED") {
          return NextResponse.json({ error: "Booking already cancelled" }, { status: 400 });
        }
        if (booking.status === "COMPLETED") {
          return NextResponse.json({ error: "Cannot finalize cancellation on a completed booking." }, { status: 400 });
        }
        if (booking.status === "EXPIRED") {
          return NextResponse.json({ error: "Cannot finalize cancellation on an expired booking." }, { status: 400 });
        }

        const wasConfirmed = ["CONFIRMED", "CASH_DUE"].includes(booking.status);
        const wasPaid      = booking.paymentStatus.toUpperCase().startsWith("PAID");
        const paxCount     = booking.adultCount + booking.childCount;

        // Pre-fetch clamped seat counts — only needed if booking held seats (seats were deducted)
        let safeBookedCount: number | null = null;
        let safeSecondaryBookedCount: number | null = null;
        if (wasConfirmed) {
          if (booking.slotId && booking.slot) {
            safeBookedCount = Math.max(0, booking.slot.bookedCount - paxCount);
          }
          if (booking.secondarySlotId && booking.secondarySlot) {
            safeSecondaryBookedCount = Math.max(0, booking.secondarySlot.bookedCount - paxCount);
          }
        }

        // Atomic DB transaction
        await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
          // ── Restore seat capacity — ONLY if booking previously held seats ──
          if (safeBookedCount !== null && booking.slotId) {
            await tx.availabilitySlot.update({
              where: { id: booking.slotId },
              data: { bookedCount: { set: safeBookedCount } },
            });
          }

          if (safeSecondaryBookedCount !== null && booking.secondarySlotId) {
            await tx.availabilitySlot.update({
              where: { id: booking.secondarySlotId },
              data: { bookedCount: { set: safeSecondaryBookedCount } },
            });
          }

          // ── Refund ledger — ONLY if booking was paid ──────────────────────────
          // PENDING/UNPAID bookings have no payment to refund.
          if (wasPaid && refundAmountJpy > 0) {
            await tx.bookingPayment.create({
              data: {
                bookingId:   booking.id,
                amountJpy:   -refundAmountJpy,
                refundedJpy: refundAmountJpy,
                currency:    "jpy",
                method:      "manual_refund",
                status:      "REFUNDED",
                refundedAt:  new Date(),
                notes: `Admin finalized cancellation${adminDecisionNote ? `: ${adminDecisionNote}` : ""} — admin returns ¥${refundAmountJpy.toLocaleString()} to guest manually`,
              },
            });
          }

          // ── Cancel the booking ─────────────────────────────────────────────
          await tx.booking.update({
            where: { id: booking.id },
            data: {
              status:             "CANCELLED",
              paymentStatus:      wasPaid ? "REFUNDED" : "UNPAID",
              cancelledAt:        new Date(),
              cancelledBy:        "admin",
              cancellationReason: adminDecisionNote || "Admin finalized cancellation",
            },
          });
        });

        // Descriptive audit log varies by path taken
        const auditDesc = wasConfirmed
          ? `Admin finalized cancellation. Refund: ¥${refundAmountJpy.toLocaleString()} (manual — admin returns to guest). Seats restored: ${paxCount} pax.${adminDecisionNote ? ` Note: ${adminDecisionNote}` : ""}`
          : `Admin cancelled PENDING/UNPAID inquiry. No seats restored (never deducted). No refund ledger (never paid).${adminDecisionNote ? ` Note: ${adminDecisionNote}` : ""}`;

        await logAudit({
          bookingId: booking.id,
          action: "BOOKING_CANCELLED",
          actorEmail,
          description: auditDesc,
          after: {
            status:        "CANCELLED",
            wasConfirmed,
            wasPaid,
            refundJpy:     wasConfirmed && wasPaid ? refundAmountJpy : 0,
            paxRestored:   wasConfirmed ? paxCount : 0,
          },
        });

        await triggerCancellationNotifications(booking.id, "admin").catch(() => {});
        if (wasPaid && refundAmountJpy > 0) {
          await triggerRefundNotifications(booking.id, refundAmountJpy).catch(() => {});
        }

        revalidatePath(`/admin/bookings/${id}`);
        revalidatePath("/admin/bookings");
        revalidatePath("/admin");

        const updated = await prisma.booking.findUnique({
          where: { id },
          select: { status: true, paymentStatus: true },
        });

        return NextResponse.json({ success: true, booking: updated });
      }

      default:
        return NextResponse.json({ error: "UNKNOWN_ACTION" }, { status: 400 });
    }

    revalidatePath(`/admin/bookings/${id}`);
    revalidatePath("/admin/bookings");
    revalidatePath("/admin");

    const updated = await prisma.booking.findUnique({
      where: { id },
      select: { status: true, paymentStatus: true },
    });

    return NextResponse.json({ success: true, booking: updated });
  } catch (err) {
    console.error("[admin/bookings/PATCH]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "SERVER_ERROR" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { id } = await params;
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      product: true,
      slot: true,
      participants: { orderBy: { sortOrder: "asc" } },
      payments: { orderBy: { createdAt: "desc" } },
      messages: { orderBy: { sentAt: "asc" } },
    },
  });

  if (!booking) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json(booking);
}

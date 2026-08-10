"use server";

/**
 * src/app/actions/public/bookingRequests.ts
 *
 * Public-facing Server Actions called from ManagePortalClient.
 *
 * SECURITY MODEL
 * ──────────────
 * Every action verifies ownership by requiring BOTH the booking `reference`
 * AND the guest's `leadEmail` to match the same row.  Neither value alone is
 * sufficient — the reference is visible in the URL, and the email was verified
 * at the server-side page level before the component was even rendered.
 * Together they form a two-factor ownership check without a password.
 *
 * DUPLICATE-REQUEST GUARD
 * ───────────────────────
 * The underlying service functions (submitCancellationRequest /
 * submitRescheduleRequest) enforce that only one active request of each type
 * can exist at a time (status IN [PENDING_REVIEW, APPROVED]).  They throw a
 * known error code "REQUEST_ALREADY_EXISTS" when this is violated, which we
 * translate into a friendly message here.
 *
 * SMART AUTO-CANCEL
 * ──────────────────────────
 * submitGuestCancellation branches on payment status BEFORE calling the
 * service layer:
 *
 *   • UNPAID / PAY_ON_ARRIVAL (manual, no money collected):
 *     → Immediately cancel the booking + restore seats in a single transaction.
 *     → BookingRequest is written with status APPROVED (no admin review needed).
 *     → AuditLog entry written.
 *     → Returns { success: true, requestId, autoApproved: true }
 *
 *   • PAID / PARTIALLY_REFUNDED (money was collected):
 *     → Normal PENDING_REVIEW flow — admin handles refund manually.
 *     → Returns { success: true, requestId, autoApproved: false }
 *
 * PAID-ONLY RESCHEDULE GUARDRAIL (Task 1)
 * ────────────────────────────────────────
 * submitGuestReschedule now enforces a strict backend check:
 *   • booking.status MUST be "CONFIRMED"
 *   • booking.paymentStatus MUST start with "PAID"
 * If either condition fails the request is rejected immediately — before it
 * touches the service layer or the database.  This prevents uncommitted
 * inventory from being tied up in a reschedule request for an unpaid booking.
 *
 * ERROR STRATEGY
 * ──────────────
 * All errors are caught at this boundary.  The client only ever receives
 * `{ success: false, error: string }` — never a raw exception or stack trace.
 * Known error codes (thrown by the service layer) are translated to localised
 * messages; unknown errors fall back to a generic "SERVER_ERROR" string.
 */

import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/services/audit";
import { triggerCancellationNotifications } from "@/lib/services/booking";
import { revalidatePath } from "next/cache";
import {
  submitCancellationRequest,
  submitRescheduleRequest,
} from "@/lib/services/bookingRequests";
import type { Prisma } from "@prisma/client";

// ── Return Type ───────────────────────────────────────────────────────────────

export type RequestActionResult =
  | { success: true; requestId: string; autoApproved?: boolean }
  | { success: false; error: string };

// ── Internal: user-friendly error messages ────────────────────────────────────

const ERROR_MESSAGES: Record<string, string> = {
  BOOKING_NOT_FOUND:              "Booking not found or email mismatch.",
  ALREADY_CANCELLED:              "This booking has already been cancelled.",
  BOOKING_CANCELLED:              "This booking has already been cancelled.",
  ALREADY_COMPLETED:              "This booking has already been completed.",
  BOOKING_COMPLETED:              "This booking has already been completed.",
  REQUEST_ALREADY_EXISTS:         "You already have an active request of this type under review. Please wait for our team to respond before submitting another.",
  RESCHEDULE_MISSING_DATE_TIME:   "Please provide both a date and a time for the reschedule.",
  // Task 1: Paid-only reschedule guard errors
  RESCHEDULE_NOT_CONFIRMED:       "Rescheduling is only available for confirmed bookings.",
  RESCHEDULE_PAYMENT_REQUIRED:    "Rescheduling is only available for fully paid bookings. Please complete your payment first, or contact us for assistance.",
};

function friendlyError(code: string): string {
  return ERROR_MESSAGES[code] ?? "An unexpected server error occurred. Please try again or contact us directly.";
}

// ── Internal: Secure ownership guard ─────────────────────────────────────────
//
// Finds a booking that matches BOTH the reference AND the lead email.
// Uses case-insensitive email matching via Prisma's `mode: "insensitive"`.
// Throws "BOOKING_NOT_FOUND" if no match — deliberately ambiguous to prevent
// enumeration attacks (an attacker with only the reference gets the same error
// as an attacker with a mismatched email).

async function verifyOwnership(
  reference: string,
  email: string
): Promise<{
  id: string;
  reference: string;
  leadName: string;
  status: string;
  paymentStatus: string;
  adultCount: number;
  childCount: number;
  slotId: string | null;
  secondarySlotId: string | null;
  isCombo: boolean;
  totalJpy: number;
  source: string;
}> {
  const booking = await prisma.booking.findFirst({
    where: {
      reference: reference.trim().toUpperCase(),
      leadEmail: {
        equals: email.trim().toLowerCase(),
        mode: "insensitive",
      },
    },
    select: {
      id: true,
      reference: true,
      leadName: true,
      status: true,
      paymentStatus: true,
      adultCount: true,
      childCount: true,
      slotId: true,
      secondarySlotId: true,
      isCombo: true,
      totalJpy: true,
      source: true,
    },
  });

  if (!booking) {
    throw new Error("BOOKING_NOT_FOUND");
  }

  return booking;
}

// ── Helper: derive whether payment has been collected ─────────────────────────
//
// Returns true if no real money has changed hands — safe to auto-cancel
// without admin review or Stripe refund orchestration.
//
// "UNPAID" and "PENDING" cover all pay-on-arrival / unconfirmed manual bookings.
// Any variant starting with "PAID" means money was collected.

function isUnpaidBooking(paymentStatus: string, source: string): boolean {
  const ps = paymentStatus.toUpperCase();
  // Explicit unpaid states
  if (ps === "UNPAID" || ps === "PENDING") return true;
  // Manual bookings with no payment recorded
  if (source === "MANUAL" && !ps.startsWith("PAID")) return true;
  return false;
}

// ── Submit Guest Cancellation ─────────────────────────────────────────────────
//
// Task 2: Cancellation remains completely unrestricted — guests can always
// cancel regardless of payment status or booking status.
//
// Path A — UNPAID booking (no money collected)
//   1. Verify ownership (throws on mismatch)
//   2. Guard: already cancelled / completed
//   3. Guard: existing active cancellation request
//   4. Atomic transaction:
//      a. Create BookingRequest with status = APPROVED (no review needed)
//      b. Update Booking status = CANCELLED + timestamps
//      c. Restore slot seats (bookedCount − paxCount, clamped to 0 minimum)
//   5. Write AuditLog
//   6. Non-blocking LINE alert to admin
//   7. Return { success: true, requestId, autoApproved: true }
//
// Path B — PAID booking (money collected, refund needed)
//   1. Verify ownership (throws on mismatch)
//   2. Delegate to submitCancellationRequest service (PENDING_REVIEW)
//   3. Non-blocking LINE alert to admin
//   4. Return { success: true, requestId, autoApproved: false }

export async function submitGuestCancellation(
  reference: string,
  email: string,
  guestMessage?: string
): Promise<RequestActionResult> {
  try {
    // ── Step 1: Ownership verification ───────────────────────────────────────
    const booking = await verifyOwnership(reference, email);

    // ── Step 2: Status guards ────────────────────────────────────────────────
    if (booking.status === "CANCELLED") throw new Error("ALREADY_CANCELLED");
    if (booking.status === "COMPLETED") throw new Error("ALREADY_COMPLETED");

    // ── Step 3: Duplicate request guard ─────────────────────────────────────
    const existing = await prisma.bookingRequest.findFirst({
      where: {
        bookingId: booking.id,
        type: "CANCELLATION",
        status: { in: ["PENDING_REVIEW", "APPROVED"] },
      },
    });
    if (existing) throw new Error("REQUEST_ALREADY_EXISTS");

    // ── BRANCH: Is this an unpaid / pay-on-arrival booking? ─────────────────
    if (isUnpaidBooking(booking.paymentStatus, booking.source)) {
      const paxCount = booking.adultCount + booking.childCount;

      const request = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        let safeBookedCount: number | null = null;
        let safeSecondaryBookedCount: number | null = null;
        const holdsSeats = ["CONFIRMED", "CASH_DUE"].includes(booking.status);

        if (holdsSeats) {
          if (booking.slotId) {
            const currentSlot = await tx.availabilitySlot.findUnique({
              where: { id: booking.slotId },
              select: { bookedCount: true },
            });
            if (currentSlot) {
              safeBookedCount = Math.max(0, currentSlot.bookedCount - paxCount);
            }
          }
          if (booking.secondarySlotId) {
            const currentSecondarySlot = await tx.availabilitySlot.findUnique({
              where: { id: booking.secondarySlotId },
              select: { bookedCount: true },
            });
            if (currentSecondarySlot) {
              safeSecondaryBookedCount = Math.max(0, currentSecondarySlot.bookedCount - paxCount);
            }
          }
        }

        // a. Create the BookingRequest record — already APPROVED
        const req = await tx.bookingRequest.create({
          data: {
            bookingId: booking.id,
            type: "CANCELLATION",
            status: "APPROVED",
            guestMessage: guestMessage?.trim() ?? null,
            suggestedRefundJpy: 0,
            refundPolicyNote: "No payment collected — auto-cancelled immediately.",
            approvedAt: new Date(),
            adminDecisionNote: "Auto-approved: booking was unpaid / pay-on-arrival.",
          },
        });

        // b. Cancel the booking and set paymentStatus to UNPAID
        await tx.booking.update({
          where: { id: booking.id },
          data: {
            status: "CANCELLED",
            paymentStatus: "UNPAID",
            cancelledAt: new Date(),
            cancelledBy: "guest",
            cancellationReason: guestMessage?.trim() || "Guest cancelled via portal (unpaid booking)",
          },
        });

        // c. Restore seat capacity using clamped SET
        if (safeBookedCount !== null && booking.slotId) {
          await tx.availabilitySlot.update({
            where: { id: booking.slotId },
            data: {
              bookedCount: { set: safeBookedCount },
            },
          });
        }

        if (safeSecondaryBookedCount !== null && booking.secondarySlotId) {
          await tx.availabilitySlot.update({
            where: { id: booking.secondarySlotId },
            data: {
              bookedCount: { set: safeSecondaryBookedCount },
            },
          });
        }

        return req;
      });
      // e. Audit log (non-blocking, outside transaction)
      await logAudit({
        bookingId: booking.id,
        action: "BOOKING_CANCELLED",
        actorEmail: "guest",
        description: `Guest self-cancelled via portal (unpaid booking, auto-approved). Reference: ${booking.reference}. Seats restored: ${paxCount}.`,
        after: { status: "CANCELLED", autoApproved: true, paxRestored: paxCount },
      });

      await triggerCancellationNotifications(booking.id, "guest").catch(() => {});

      // f. Non-blocking admin LINE alert
      sendAdminLineAlert(
        "CANCELLATION",
        booking.reference,
        booking.leadName,
        request.id,
        true // autoApproved flag
      ).catch((err) => {
        console.error("[submitGuestCancellation] LINE alert failed:", err);
      });

      // g. Invalidate the manage portal cache so the guest's UI updates instantly.
      revalidatePath(`/en/manage/${booking.reference}`);
      revalidatePath(`/manage/${booking.reference}`);

      return { success: true, requestId: request.id, autoApproved: true };
    }

    // PATH B: Paid booking — create PENDING_REVIEW request for admin review
    const requestId = await submitCancellationRequest(
      booking.id,
      guestMessage?.trim() || undefined
    );

    // Non-blocking admin LINE alert
    sendAdminLineAlert(
      "CANCELLATION",
      booking.reference,
      booking.leadName,
      requestId
    ).catch((err) => {
      console.error("[submitGuestCancellation] LINE alert failed:", err);
    });

    // Invalidate the manage portal cache.
    revalidatePath(`/en/manage/${booking.reference}`);
    revalidatePath(`/manage/${booking.reference}`);

    return { success: true, requestId, autoApproved: false };
  } catch (err) {
    const code = err instanceof Error ? err.message : "SERVER_ERROR";
    console.error("[submitGuestCancellation] Error:", code, { reference });
    return { success: false, error: friendlyError(code) };
  }
}

// ── Submit Guest Reschedule ───────────────────────────────────────────────────
//
// Task 1: PAID-ONLY RESCHEDULE GUARDRAIL
// ──────────────────────────────────────
// After ownership verification, we enforce:
//   • booking.status === "CONFIRMED"  (must be confirmed, not just pending)
//   • booking.paymentStatus starts with "PAID"  (money must have been collected)
//
// Rationale: A reschedule request moves seat inventory from one slot to another
// atomically when the admin finalises it. For an unpaid / pending booking, this
// creates uncommitted inventory risk — the old slot's seats are freed but the
// new slot is not yet confirmed. Restricting to paid+confirmed bookings
// eliminates this entire class of edge cases.
//
// The rest of the flow:
// 1. Validates that date and time were supplied
// 2. Verifies reference + email ownership (throws if mismatch)
// 3. Enforces paid-only guardrail (throws RESCHEDULE_NOT_CONFIRMED / RESCHEDULE_PAYMENT_REQUIRED)
// 4. Delegates creation to the service layer
// 5. Sends a non-blocking LINE notification to the admin
// 6. Returns { success: true, requestId } on success
//    Returns { success: false, error } on any failure

export async function submitGuestReschedule(
  reference: string,
  email: string,
  date: string,
  time: string,
  guestMessage?: string
): Promise<RequestActionResult> {
  try {
    // ── Step 1: Server-side input validation ──────────────────────────────────
    const trimmedDate = date?.trim();
    const trimmedTime = time?.trim();

    if (!trimmedDate || !trimmedTime) {
      return {
        success: false,
        error: friendlyError("RESCHEDULE_MISSING_DATE_TIME"),
      };
    }

    // Basic date format guard — rejects obviously malformed values before they
    // hit the DB.  The DB itself does not enforce format on the String column.
    const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
    const TIME_RE = /^\d{2}:\d{2}$/;

    if (!ISO_DATE_RE.test(trimmedDate)) {
      return {
        success: false,
        error: "Invalid date format. Please use YYYY-MM-DD.",
      };
    }
    if (!TIME_RE.test(trimmedTime)) {
      return {
        success: false,
        error: "Invalid time format. Please use HH:MM.",
      };
    }

    // Ensure the requested date is not in the past (server-side, UTC midnight).
    const todayUtc = new Date();
    todayUtc.setUTCHours(0, 0, 0, 0);
    const requestedDate = new Date(trimmedDate + "T00:00:00Z");
    if (requestedDate < todayUtc) {
      return {
        success: false,
        error: "The requested reschedule date is in the past. Please choose a future date.",
      };
    }

    // Validate time is one of the allowed departure slots.
    const ALLOWED_TIMES = ["09:00", "11:30", "13:30"];
    if (!ALLOWED_TIMES.includes(trimmedTime)) {
      return {
        success: false,
        error: `Invalid departure time. Allowed times are: ${ALLOWED_TIMES.join(", ")}.`,
      };
    }

    // ── Step 2: Ownership verification ───────────────────────────────────────
    const booking = await verifyOwnership(reference, email);

    // ── Step 3: Task 1 — PAID-ONLY BACKEND GUARDRAIL ──────────────────────────
    // This guard runs AFTER ownership verification so we don't leak booking state
    // to unauthenticated callers. The error codes are translated to user-friendly
    // messages via ERROR_MESSAGES above.
    if (booking.status !== "CONFIRMED") {
      throw new Error("RESCHEDULE_NOT_CONFIRMED");
    }
    if (!booking.paymentStatus.toUpperCase().startsWith("PAID")) {
      throw new Error("RESCHEDULE_PAYMENT_REQUIRED");
    }

    // ── Step 4: Delegate to service layer ─────────────────────────────────────
    const requestId = await submitRescheduleRequest(
      booking.id,
      trimmedDate,
      trimmedTime,
      guestMessage?.trim() || undefined
    );

    // ── Step 5: Non-blocking admin LINE alert (fire-and-forget) ──────────────
    sendAdminLineAlert(
      "RESCHEDULE",
      booking.reference,
      booking.leadName,
      requestId
    ).catch((err) => {
      console.error("[submitGuestReschedule] LINE alert failed:", err);
    });

    // ── Step 6: Invalidate cache so the guest's manage portal reflects the new request status ──
    revalidatePath(`/en/manage/${booking.reference}`);
    revalidatePath(`/manage/${booking.reference}`);

    // ── Step 7: Return success ────────────────────────────────────────────────
    return { success: true, requestId };
  } catch (err) {
    const code = err instanceof Error ? err.message : "SERVER_ERROR";
    console.error("[submitGuestReschedule] Error:", code, { reference });
    return { success: false, error: friendlyError(code) };
  }
}

// ── Admin LINE Notification (best-effort, non-blocking) ───────────────────────
//
// Pushes a compact LINE message to the admin's LINE account whenever a guest
// submits a new request.  This is intentionally fire-and-forget — if LINE is
// unreachable, the request is still created and the admin can review it in the
// admin dashboard.
//
// Required env vars:
//   LINE_CHANNEL_ACCESS_TOKEN — Messaging API channel access token
//   LINE_ADMIN_USER_ID        — Admin's LINE user ID (starts with "U…")
//   NEXT_PUBLIC_APP_URL       — Base URL for deep-linking into the admin panel

async function sendAdminLineAlert(
  type: "CANCELLATION" | "RESCHEDULE",
  reference: string,
  leadName: string,
  requestId: string,
  autoApproved = false
): Promise<void> {
  const lineToken  = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const lineUserId = process.env.LINE_ADMIN_USER_ID;

  // Silently skip if LINE is not configured (local dev, CI, etc.)
  if (!lineToken || !lineUserId) return;

  const appUrl    = process.env.NEXT_PUBLIC_APP_URL ?? "https://thedreamadventure.com";
  const reviewUrl = `${appUrl}/admin/requests/${requestId}`;

  const emoji =
    type === "CANCELLATION" ? "🚫" : "📅";
  const label =
    type === "CANCELLATION"
      ? autoApproved ? "AUTO-CANCELLED (unpaid)" : "CANCELLATION REQUEST"
      : "RESCHEDULE REQUEST";

  const text = [
    `${emoji} ${label}`,
    `Reference: ${reference}`,
    `Guest:     ${leadName}`,
    autoApproved ? "✅ Auto-approved (no payment collected)" : `Review →   ${reviewUrl}`,
  ].join("\n");

  await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lineToken}`,
    },
    body: JSON.stringify({
      to: lineUserId,
      messages: [{ type: "text", text }],
    }),
  });
}

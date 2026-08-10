/**
 * GET /api/booking/lookup?ref=...&email=...
 *
 * Public endpoint used by ManagePortalClient to refresh booking state
 * after a guest submits a request.
 *
 * TASK 3 — SECURITY HARDENING
 * ──────────────────────────────────────────────────────────────────
 * 1. Input validation (Zod): ref and email are validated before hitting
 *    Prisma. Rejects empty strings, malformed emails, and suspiciously
 *    long values that could indicate injection attempts.
 *
 * 2. Email case-insensitive matching already present (mode: "insensitive").
 *    Reference is forced to uppercase to match DB storage format.
 *
 * 3. Response field scope: only the minimum required fields are selected
 *    from the DB — no admin-only fields (adminNote, holdId, ipAddress, etc.) are exposed.
 *
 * 4. Error response deliberately ambiguous on not-found (404 "Not found")
 *    to prevent reference enumeration — an attacker can't distinguish
 *    "bad reference" from "bad email" from "no booking".
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// ── Input schema — Task 3 ──────────────────────────────────────────────────────
const querySchema = z.object({
  ref: z
    .string()
    .min(6, "Reference too short")
    .max(20, "Reference too long")
    .regex(/^[A-Z0-9-]+$/i, "Invalid reference format"),
  email: z
    .string()
    .email("Invalid email address")
    .max(254, "Email too long"),
});

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  // Task 3: Validate inputs with Zod before touching the database
  const parsed = querySchema.safeParse({
    ref:   searchParams.get("ref") ?? "",
    email: searchParams.get("email") ?? "",
  });

  if (!parsed.success) {
    // Return generic 400 — don't leak schema details to caller
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }

  const { ref, email } = parsed.data;

  try {
    const booking = await prisma.booking.findFirst({
      where: {
        reference: ref.toUpperCase(),
        leadEmail: {
          equals: email.toLowerCase(),
          mode: "insensitive",
        },
      },
      // Task 3: Strict field allowlist — public-safe fields ONLY.
      // No adminNote, holdId, ipAddress, userAgent, etc.
      // NOTE: subtotalJpy, discountJpy, promoCode are needed by ManagePortalClient
      // to render the pricing summary after a refreshBooking() call.
      select: {
        id: true,
        reference: true,
        status: true,
        paymentStatus: true,
        locale: true,
        adultCount: true,
        childCount: true,
        hasBbq: true,
        leadName: true,
        leadEmail: true,
        totalJpy: true,
        subtotalJpy: true,
        discountJpy: true,
        promoCode: true,
        receiptPdfPath: true,
        waiverPdfPath: true,
        isCombo: true,
        comboDate: true,
        product: { select: { nameEn: true, nameJa: true, activityType: true } },
        slot: { select: { date: true, startTime: true } },
        secondarySlot: { select: { startTime: true } },
        participants: {
          select: { firstName: true, lastName: true, participantType: true },
          orderBy: { sortOrder: "asc" },
        },
        bookingRequests: {
          select: {
            id: true,
            type: true,
            status: true,
            requestedNewDate: true,
            requestedNewTime: true,
            guestMessage: true,
            suggestedRefundJpy: true,
            refundPolicyNote: true,
            adminDecisionNote: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!booking) {
      // Deliberately ambiguous — prevents reference enumeration
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Serialize dates
    return NextResponse.json({
      booking: {
        ...booking,
        comboDate: booking.comboDate ? booking.comboDate.toISOString().slice(0, 10) : null,
        slot: booking.slot ? {
          ...booking.slot,
          date: booking.slot.date.toISOString().slice(0, 10),
        } : null,
        bookingRequests: booking.bookingRequests.map((r) => ({
          ...r,
          createdAt: r.createdAt.toISOString(),
        })),
      },
    });
  } catch (err) {
    console.error("[/api/booking/lookup]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

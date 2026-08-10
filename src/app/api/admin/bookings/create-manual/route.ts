/**
 * POST /api/admin/bookings/create-manual
 * Admin-only manual booking creation — no Stripe, no hold logic.
 * Supports both standard (slot-based) and Combo Package (slotId: null, isCombo: true) bookings.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { createManualBooking, validateParticipantAges } from "@/lib/services/manualBooking";

const participantSchema = z.object({
  participantType: z.enum(["ADULT", "CHILD"]),
  firstName:       z.string().min(1, "First name required"),
  lastName:        z.string().optional(),
  age:             z.number().int().min(1, "Age is required").max(99),
});

const schema = z.object({
  productId:     z.string().min(1),
  // slotId is optional — null/absent for Combo Package bookings
  slotId:        z.string().min(1).nullable().optional(),
  isCombo:       z.boolean().default(false),
  activityType:  z.enum(["RAFTING", "CANYONING"]),
  adultCount:    z.number().int().min(1),
  childCount:    z.number().int().min(0),
  hasBbq:        z.boolean(),
  leadName:      z.string().min(1),
  leadEmail:     z.string().email(),
  leadPhone:     z.string().optional(),
  leadLocale:    z.enum(["en", "ja"]).default("en"),
  subtotalJpy:   z.number().int().min(0),
  totalJpy:      z.number().int().min(0),
  paymentMethod: z.enum(["PAY_ON_ARRIVAL"]),
  // Manual bookings MUST always be CONFIRMED at booking-status level.
  // "PENDING" in the payment domain is expressed via paymentMethod="PAY_ON_ARRIVAL"
  // which sets paymentStatus="PENDING" in the service layer — NOT booking status.
  bookingStatus: z.enum(["CONFIRMED"]),
  // bookingSource must be explicitly validated so "PHONE" is not silently stripped.
  bookingSource: z.enum(["MANUAL", "PHONE"]).default("MANUAL"),
  adminNote:     z.string().optional(),
  participants:  z.array(participantSchema).min(1),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const d = parsed.data;

  // Combo bookings must not have a slotId
  if (d.isCombo && d.slotId) {
    return NextResponse.json(
      { error: "COMBO_CANNOT_HAVE_SLOT", message: "Combo Package bookings must not specify a slot." },
      { status: 400 }
    );
  }

  // Standard bookings must have a slotId
  if (!d.isCombo && !d.slotId) {
    return NextResponse.json(
      { error: "SLOT_REQUIRED", message: "Non-combo bookings require a slotId." },
      { status: 400 }
    );
  }

  // Server-side age validation with activity context
  const ageErrors = validateParticipantAges(d.participants, d.activityType);
  if (ageErrors.length > 0) {
    return NextResponse.json(
      { error: "AGE_VALIDATION_ERROR", ageErrors },
      { status: 400 }
    );
  }

  try {
    const result = await createManualBooking({
      ...d,
      slotId: d.slotId ?? null,
      isCombo: d.isCombo,
      actorEmail: session.user.email,
      appUrl: process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "UNKNOWN_ERROR";
    const status409 = ["SLOT_NOT_FOUND", "SLOT_UNAVAILABLE", "SLOT_FULL"];
    if (status409.includes(msg)) {
      return NextResponse.json({ error: msg }, { status: 409 });
    }
    console.error("[create-manual]", err);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}

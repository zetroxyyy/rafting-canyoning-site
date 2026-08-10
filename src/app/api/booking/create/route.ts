/**
 * POST /api/booking/create
 *
 * Creates a PENDING booking.
 *
 * Supports two modes:
 *   1. Standard (RAFTING / CANYONING): requires a valid slotId from DB.
 *   2. Combo (RAFTING + CANYONING package): slotId is optional (null/empty),
 *      booking is created with isCombo=true and comboDate set to selectedDate.
 *      Operations desk schedules manually.
 *
 * Age validation is context-aware:
 *   RAFTING   → Children age 6–17
 *   CANYONING → Children age 12–17
 *   Adults    → 18–99 for both
 *
 * Payment is collected offline (cash/card/bank transfer).
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createBooking, triggerPendingBookingNotifications } from "@/lib/services/booking";
import { createComboBooking } from "@/lib/services/comboBooking";
import { logAudit } from "@/lib/services/audit";
import {
  AGE_ADULT_MIN,
  AGE_CHILD_MAX,
  AGE_CHILD_MIN_RAFTING,
  AGE_CHILD_MIN_CANYONING,
} from "@/lib/schemas";

// ─── Request schema ────────────────────────────────────────────────────────────

const schema = z.object({
  productId:                   z.string().min(1),
  slotId:                      z.string().optional(),
  activityType:                z.enum(["RAFTING", "CANYONING"]),
  hasBbq:                      z.boolean(),
  adultCount:                  z.number().int().min(1).max(35),
  childCount:                  z.number().int().min(0).max(34),
  leadName:                    z.string().min(2).max(200),
  leadEmail:                   z.string().email(),
  leadPhone:                   z.string().max(30).optional(),
  leadCountry:                 z.string().max(100).optional(),
  customerNote:                z.string().max(2000).optional(),
  specialRequest:              z.string().max(2000).optional(),
  promoCode:                   z.string().max(50).optional(),
  locale:                      z.enum(["en", "ja"]).default("en"),
  termsAccepted:               z.literal(true, { message: "Terms must be accepted" }),
  waiverAccepted:              z.literal(true, { message: "Waiver must be accepted" }),
  cancellationPolicyAccepted:  z.literal(true, { message: "Cancellation policy must be accepted" }),
  marketingConsent:            z.boolean().optional(),
  photoConsent:                z.boolean().optional(),
  isComboBooking:              z.boolean().optional(),
  selectedDate:                z.string().optional(),
  participants: z
    .array(
      z.object({
        participantType:       z.enum(["ADULT", "CHILD"]),
        firstName:             z.string().min(1),
        lastName:              z.string().optional(),
        age:                   z.coerce.number().int().min(1, "Age is required").max(99),
        waiverAccepted:        z.boolean(),
        emergencyContactName:  z.string().optional(),
        emergencyContactPhone: z.string().optional(),
        accommodation:         z.string().optional(),
        dietaryNotes:          z.string().optional(),
        swimmingConfidence:    z.string().optional(),
        medicalNotes:          z.string().optional(),
      })
    )
    .min(1),
});



// ─── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body   = await req.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { activityType, participants, isComboBooking } = parsed.data;

    // Activity-aware age validation
    const childMin =
      activityType === "CANYONING"
        ? AGE_CHILD_MIN_CANYONING
        : AGE_CHILD_MIN_RAFTING;

    const participantErrors: Array<{ index: number; field: string; message: string }> = [];

    participants.forEach((p, i) => {
      if (p.age === undefined || p.age === null) return;

      if (p.participantType === "ADULT" && p.age < AGE_ADULT_MIN) {
        participantErrors.push({
          index: i,
          field: "age",
          message: `Adults must be at least ${AGE_ADULT_MIN} years old.`,
        });
      }

      if (p.participantType === "CHILD") {
        if (p.age < childMin) {
          participantErrors.push({
            index: i,
            field: "age",
            message:
              `Children must be at least ${childMin} years old for ${activityType}. ` +
              `Participants under ${childMin} cannot participate in this activity.`,
          });
        } else if (p.age > AGE_CHILD_MAX) {
          participantErrors.push({
            index: i,
            field: "age",
            message: `Children must be ${AGE_CHILD_MAX} or younger. Book participants ${AGE_ADULT_MIN}+ as Adults.`,
          });
        }
      }
    });

    if (participantErrors.length > 0) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", details: { participantErrors } },
        { status: 400 }
      );
    }

    const userAgent = req.headers.get("user-agent") ?? undefined;
    const ipAddress =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      req.headers.get("x-real-ip") ??
      undefined;

    // Dynamically resolve correct productId straight from the live database using the activity type's slug
    const resolvedProduct = await prisma.product.findUnique({
      where: { slug: activityType.toLowerCase() },
    });

    if (!resolvedProduct) {
      return NextResponse.json(
        { error: "PRODUCT_NOT_FOUND", message: `Product not found for activity type: ${activityType}` },
        { status: 404 }
      );
    }

    // ── COMBO path: slot-less booking ─────────────────────────────────────────
    if (isComboBooking) {
      const result = await createComboBooking({
        ...parsed.data,
        productId: resolvedProduct.id,
        activityType: "RAFTING", // primary activity for product lookup
        source: "WEB",
        userAgent,
        ipAddress,
        comboDate: parsed.data.selectedDate ?? parsed.data.customerNote ?? "",
        termsAccepted:              true as boolean,
        waiverAccepted:             true as boolean,
        cancellationPolicyAccepted: true as boolean,
      });
      await triggerPendingBookingNotifications(result.bookingId);
      return NextResponse.json(result);
    }

    // ── Standard path: slot-based booking ────────────────────────────────────
    if (!parsed.data.slotId) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", details: "slotId required for non-combo bookings" },
        { status: 400 }
      );
    }

    const result = await createBooking({
      ...parsed.data,
      productId: resolvedProduct.id,
      slotId: parsed.data.slotId,
      termsAccepted:              true as boolean,
      waiverAccepted:             true as boolean,
      cancellationPolicyAccepted: true as boolean,
      source: "WEB",
      userAgent,
      ipAddress,
    });

    await triggerPendingBookingNotifications(result.bookingId);
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "UNKNOWN_ERROR";

    if (msg === "SLOT_UNAVAILABLE" || msg === "SLOT_FULL") {
      return NextResponse.json({ error: msg }, { status: 409 });
    }

    console.error("[booking/create]", err);

    if (msg === "BOOKING_TOO_LATE") {
      return NextResponse.json(
        { error: "BOOKING_TOO_LATE", message: "Online bookings require at least 1 day advance notice." },
        { status: 422 }
      );
    }

    if (msg === "ACTIVITY_TYPE_MISMATCH") {
      return NextResponse.json(
        { error: "ACTIVITY_TYPE_MISMATCH", message: "Activity type mismatch. Please refresh the page and try again." },
        { status: 422 }
      );
    }

    if (msg === "SLOT_NOT_FOUND") {
      return NextResponse.json({ error: "SLOT_NOT_FOUND", message: "The selected time slot is no longer available." }, { status: 404 });
    }

    return NextResponse.json({ error: "SERVER_ERROR", message: "An unexpected error occurred. Please try again." }, { status: 500 });
  }
}

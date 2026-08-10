/**
 * Combo Booking Service
 *
 * Creates a slot-less PENDING booking for the Rafting + Canyoning Combo Package.
 * Key differences from standard booking:
 *  - No slotId required (isCombo = true, slotId = null)
 *  - comboDate is set from the user's selected date
 *  - Pricing uses COMBO_ADULT / COMBO_CHILD rates
 *  - No seat-hold creation (no specific slot to hold)
 *  - Status = PENDING (ops desk confirms and schedules manually)
 */

import { prisma } from "@/lib/prisma";
import { generateBookingReference, calcSubtotal, applyPromo } from "@/lib/utils";
import { logAudit } from "@/lib/services/audit";
import type { BookingSource, Prisma } from "@prisma/client";

export interface CreateComboBookingInput {
  productId: string;
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
  comboDate?: string; // YYYY-MM-DD — the date selected by guest for the combo
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

/**
 * Create a COMBO booking (slot-less).
 * The ops desk receives this as a PENDING request and schedules both activities.
 */
export async function createComboBooking(
  input: CreateComboBookingInput
): Promise<{ bookingId: string; reference: string }> {
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

  // Calculate pricing using COMBO rates
  const subtotal = calcSubtotal({
    activityType: "COMBO",
    adultCount:   input.adultCount,
    childCount:   input.childCount,
  });
  const { discount, total } = applyPromo(subtotal, promoData);
  const reference = generateBookingReference();

  // comboDate: parse the YYYY-MM-DD string into a real Date for the DB field
  let comboDateValue: Date | undefined;
  if (input.comboDate) {
    const parsed = new Date(`${input.comboDate}T12:00:00+09:00`);
    if (!isNaN(parsed.getTime())) {
      comboDateValue = parsed;
    }
  }

  // Build customer note with combo label
  const comboNote = [
    "[COMBO PACKAGE — Rafting + Canyoning]",
    input.comboDate ? `Requested date: ${input.comboDate}` : "",
    input.customerNote || "",
  ]
    .filter(Boolean)
    .join("\n");

  // Create PENDING booking — slot is null for combo
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
        productId:    input.productId,
        slotId:       null,          // combo = no specific slot
        isCombo:      true,
        comboDate:    comboDateValue,
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
        status:       "PENDING",
        paymentStatus: "PENDING",
        leadName:     input.leadName,
        leadEmail:    input.leadEmail,
        leadPhone:    input.leadPhone,
        leadCountry:  input.leadCountry,
        leadLocale:   input.locale,
        locale:       input.locale,
        source:       input.source ?? "WEB",
        userAgent:    input.userAgent,
        ipAddress:    input.ipAddress,
        customerNote: comboNote,
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
            accommodation:   p.accommodation,
            dietaryNotes:    p.dietaryNotes,
            swimmingConfidence: p.swimmingConfidence,
            medicalNotes:    p.medicalNotes,
            sortOrder:       i,
          })),
        },
      },
      include: { product: true },
    });

    return newBooking;
  });

  await logAudit({
    bookingId: booking.id,
    action: "BOOKING_CREATED",
    actorEmail: "system",
    description: `Combo booking request created for ${input.leadName} — ${booking.reference} (date: ${input.comboDate ?? "TBD"})`,
    after: { status: "PENDING", total, isCombo: true },
  });

  return { bookingId: booking.id, reference: booking.reference };
}

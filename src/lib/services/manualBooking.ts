/**
 * Manual Booking Service — admin phone/walk-in bookings.
 *
 * Key differences from web booking flow:
 *  - No hold: capacity committed directly in the atomic transaction.
 *  - Source = MANUAL.
 *  - Booking status defaults to CONFIRMED.
 *  - Payment status comes from admin selection.
 *  - No 48-hour advance restriction.
 *  - Full atomic transaction: slot capacity + booking + participants + payment.
 */

import { prisma } from "@/lib/prisma";
import { generateBookingReference } from "@/lib/utils";
import { logAudit } from "@/lib/services/audit";
import { generateReceiptPdf, generateWaiverPdf } from "@/lib/services/pdf";
import { uploadPdf } from "@/lib/storage";
import { notifyBookingConfirmed } from "@/lib/services/notifications";
import type { Prisma, BookingStatus } from "@prisma/client";

import {
  AGE_ADULT_MIN,
  AGE_CHILD_MAX,
  AGE_CHILD_MIN_RAFTING,
  AGE_CHILD_MIN_CANYONING,
} from "@/lib/schemas";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ManualPaymentMethod = "PAY_ON_ARRIVAL";

export interface ManualBookingParticipant {
  participantType: "ADULT" | "CHILD";
  firstName: string;
  lastName?: string;
  age?: number;
}

export interface ManualBookingInput {
  productId: string;
  slotId: string | null;
  isCombo?: boolean;
  activityType: "RAFTING" | "CANYONING";
  adultCount: number;
  childCount: number;
  hasBbq: boolean;
  leadName: string;
  leadEmail: string;
  leadPhone?: string;
  leadLocale?: "en" | "ja";
  participants: ManualBookingParticipant[];
  // Pricing
  subtotalJpy: number;
  totalJpy: number;
  // Payment
  paymentMethod: ManualPaymentMethod;
  bookingStatus: BookingStatus;
  bookingSource?: "MANUAL" | "PHONE";
  // Notes
  adminNote?: string;
  // Actor (for audit log)
  actorEmail: string;
  appUrl?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function paymentMethodToPaymentStatus(_method: ManualPaymentMethod): string {
  return "PENDING";
}

function paymentMethodLabel(_method: ManualPaymentMethod): string {
  return "pay_on_arrival";
}

// ─── Age validation ───────────────────────────────────────────────────────────

export interface AgeValidationError {
  participantIndex: number;
  field: "age";
  message: string;
}

export function validateParticipantAges(
  participants: ManualBookingParticipant[],
  activityType: "RAFTING" | "CANYONING"
): AgeValidationError[] {
  const childMin =
    activityType === "CANYONING" ? AGE_CHILD_MIN_CANYONING : AGE_CHILD_MIN_RAFTING;

  const errors: AgeValidationError[] = [];

  participants.forEach((p, i) => {
    if (p.age === undefined || p.age === null) {
      errors.push({
        participantIndex: i,
        field: "age",
        message: "Age is required.",
      });
      return;
    }

    if (p.participantType === "ADULT") {
      if (p.age < AGE_ADULT_MIN) {
        errors.push({
          participantIndex: i,
          field: "age",
          message: `Adults must be at least ${AGE_ADULT_MIN} years old.`,
        });
      }
    } else {
      if (p.age < childMin) {
        errors.push({
          participantIndex: i,
          field: "age",
          message: `Children must be at least ${childMin} years old for ${activityType}.`,
        });
      } else if (p.age > AGE_CHILD_MAX) {
        errors.push({
          participantIndex: i,
          field: "age",
          message: `Children must be ${AGE_CHILD_MAX} or younger. Book participants ${AGE_ADULT_MIN}+ as Adults.`,
        });
      }
    }
  });

  return errors;
}

// ─── Main function ────────────────────────────────────────────────────────────

export async function createManualBooking(
  input: ManualBookingInput
): Promise<{ bookingId: string; reference: string }> {
  const paxCount = input.adultCount + input.childCount;
  const paymentStatus = paymentMethodToPaymentStatus(input.paymentMethod);
  const methodLabel = paymentMethodLabel(input.paymentMethod);
  const reference = generateBookingReference();
  const now = new Date();

  const txResult = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    let slotForNotification: { date: Date; startTime: string } | null = null;

    if (!input.isCombo && input.slotId) {
      // 1. Lock slot and verify capacity (standard bookings only)
      const slot = await tx.availabilitySlot.findUnique({ where: { id: input.slotId } });

      if (!slot) throw new Error("SLOT_NOT_FOUND");
      if (slot.isBlocked || slot.status === "BLOCKED" || slot.status === "CLOSED") {
        throw new Error("SLOT_UNAVAILABLE");
      }
      if (slot.status !== "OPEN" && slot.status !== "SPECIAL") {
        throw new Error("SLOT_UNAVAILABLE");
      }

      const availableSeats = slot.maxCapacity - slot.bookedCount;
      if (availableSeats < paxCount) throw new Error("SLOT_FULL");

      // 2. Commit slot capacity immediately
      await tx.availabilitySlot.update({
        where: { id: input.slotId },
        data: { bookedCount: { increment: paxCount } },
      });

      slotForNotification = { date: slot.date, startTime: slot.startTime };
    }
    // Combo bookings skip slot entirely — slotId stays null, no capacity deduction

    // 3. Create the booking record
    const newBooking = await tx.booking.create({
      data: {
        reference,
        productId: input.productId,
        slotId: input.isCombo ? null : (input.slotId ?? null),
        isCombo: input.isCombo ?? false,
        hasBbq: input.hasBbq,
        adultCount: input.adultCount,
        childCount: input.childCount,
        subtotalJpy: input.subtotalJpy,
        discountJpy: 0,
        totalJpy: input.totalJpy,
        status: input.bookingStatus,
        paymentStatus,
        confirmedAt: input.bookingStatus === "CONFIRMED" ? now : null,
        leadName: input.leadName,
        leadEmail: input.leadEmail.toLowerCase().trim(),
        leadPhone: input.leadPhone,
        leadLocale: input.leadLocale ?? "en",
        locale: input.leadLocale ?? "en",
        source: (input.bookingSource ?? "MANUAL") as import("@prisma/client").BookingSource,
        adminNote: input.adminNote,
        termsAccepted: true,
        waiverAccepted: true,
        cancellationPolicyAccepted: true,
        participants: {
          create: input.participants.map((p, i) => ({
            participantType: p.participantType,
            firstName: p.firstName,
            lastName: p.lastName,
            age: p.age,
            waiverAccepted: true,
            waiverAcceptedAt: now,
            sortOrder: i,
          })),
        },
      },
      include: { product: true, slot: true },
    });

    // 4. Create payment record
    const hasPaid = paymentStatus.startsWith("PAID");
    await tx.bookingPayment.create({
      data: {
        bookingId: newBooking.id,
        amountJpy: hasPaid ? input.totalJpy : 0,
        currency: "jpy",
        method: methodLabel,
        status: hasPaid ? "PAID" : "PENDING",
        paidAt: hasPaid ? now : null,
        notes: input.adminNote ?? `Manual booking created: ${input.paymentMethod}`,
      },
    });

    return { booking: newBooking, slotForNotification };
  });

  const { booking, slotForNotification } = txResult;

  await logAudit({
    bookingId: booking.id,
    action: "BOOKING_CREATED",
    actorEmail: input.actorEmail,
    description: `Manual booking created by admin for ${input.leadName} — ${reference} (${input.activityType}, ${paymentMethodLabel(input.paymentMethod)})`,
    after: {
      reference,
      status: input.bookingStatus,
      paymentStatus,
      totalJpy: input.totalJpy,
    },
  });

  await logAudit({
    bookingId: booking.id,
    action: "BOOKING_CONFIRMED",
    actorEmail: input.actorEmail,
    description: `Booking ${reference} confirmed immediately via manual admin booking`,
    after: { reference, confirmedAt: new Date().toISOString() },
  });

  void sendPostBookingNotifications(booking, slotForNotification, input).catch((err) =>
    console.error("[ManualBooking] Post-booking notifications failed:", err)
  );

  const { revalidatePath } = await import("next/cache");
  revalidatePath("/admin");
  revalidatePath("/admin/bookings");
  revalidatePath("/admin/combos");
  revalidatePath("/admin/availability");

  return { bookingId: booking.id, reference };
}

// ─── Post-booking notifications + PDF ────────────────────────────────────────

async function sendPostBookingNotifications(
  booking: {
    id: string;
    reference: string;
    leadEmail: string;
    leadName: string;
    locale: string;
    adultCount: number;
    childCount: number;
    hasBbq: boolean;
    totalJpy: number;
    product: { nameEn: string; nameJa: string; activityType: string };
  },
  slotForNotification: { date: Date; startTime: string } | null,
  input: ManualBookingInput
): Promise<void> {
  const isCombo = input.isCombo ?? false;
  if (!slotForNotification && !isCombo) {
    console.info("[ManualBooking] No slot — skipping PDF/notifications for", booking.reference);
    return;
  }

  const isJa = (input.leadLocale ?? "en") === "ja";
  const dateStr = slotForNotification
    ? slotForNotification.date.toISOString().slice(0, 10)
    : "Flexible";
  const startTimeStr = slotForNotification ? slotForNotification.startTime : "Flexible";

  try {
    const [receiptBuf, waiverBuf] = await Promise.all([
      generateReceiptPdf({
        reference: booking.reference,
        locale: (input.leadLocale ?? "en") as "en" | "ja",
        leadName: input.leadName,
        leadEmail: input.leadEmail,
        leadPhone: input.leadPhone,
        activityNameEn: isCombo ? "Rafting + Canyoning Combo" : booking.product.nameEn,
        activityNameJa: isCombo ? "ラフティング＋キャニオニング コンボ" : booking.product.nameJa,
        activityType: (isCombo ? "RAFTING" : input.activityType) as "RAFTING" | "CANYONING",
        slotDate: dateStr,
        startTime: startTimeStr,
        adultCount: input.adultCount,
        childCount: input.childCount,
        hasBbq: input.hasBbq,
        subtotalJpy: input.subtotalJpy,
        discountJpy: 0,
        totalJpy: input.totalJpy,
        paymentStatus: paymentMethodToPaymentStatus(input.paymentMethod),
        confirmedAt: new Date(),
        participants: input.participants.map((p) => ({
          firstName: p.firstName,
          lastName: p.lastName,
          participantType: p.participantType,
          age: p.age,
          waiverAccepted: true,
        })),
        isCombo,
      }),
      generateWaiverPdf({
        reference: booking.reference,
        locale: (input.leadLocale ?? "en") as "en" | "ja",
        leadName: input.leadName,
        leadEmail: input.leadEmail,
        leadPhone: input.leadPhone,
        activityNameEn: isCombo ? "Rafting + Canyoning Combo" : booking.product.nameEn,
        activityNameJa: isCombo ? "ラフティング＋キャニオニング コンボ" : booking.product.nameJa,
        activityType: (isCombo ? "RAFTING" : input.activityType) as "RAFTING" | "CANYONING",
        slotDate: dateStr,
        startTime: startTimeStr,
        adultCount: input.adultCount,
        childCount: input.childCount,
        hasBbq: input.hasBbq,
        subtotalJpy: input.subtotalJpy,
        discountJpy: 0,
        totalJpy: input.totalJpy,
        paymentStatus: paymentMethodToPaymentStatus(input.paymentMethod),
        confirmedAt: new Date(),
        participants: input.participants.map((p) => ({
          firstName: p.firstName,
          lastName: p.lastName,
          participantType: p.participantType,
          age: p.age,
          waiverAccepted: true,
        })),
        isCombo,
      }),
    ]);

    try {
      const receiptPath = `receipts/${booking.reference}-receipt.pdf`;
      const waiverPath  = `waivers/${booking.reference}-waiver.pdf`;

      await Promise.allSettled([
        uploadPdf(receiptPath, receiptBuf),
        uploadPdf(waiverPath, waiverBuf),
      ]);

      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          receiptPdfPath: receiptPath,
          waiverPdfPath: waiverPath,
          receiptPdfGeneratedAt: new Date(),
          waiverPdfGeneratedAt: new Date(),
        },
      });

      await logAudit({
        bookingId: booking.id,
        action: "PDF_GENERATED",
        actorEmail: "system",
        description: `Receipt and Waiver PDFs generated for ${booking.reference}`,
      });
    } catch {
      console.warn("[ManualBooking] PDF storage upload skipped or failed");
    }
  } catch (pdfErr) {
    console.error("[ManualBooking] PDF generation failed:", pdfErr);
  }

  await notifyBookingConfirmed({
    bookingId: booking.id,
    to: input.leadEmail,
    locale: (input.leadLocale ?? "en") as "en" | "ja",
    reference: booking.reference,
    leadName: input.leadName,
    activityName: isCombo
      ? (isJa ? "ラフティング＋キャニオニング コンボ" : "Rafting + Canyoning Combo")
      : (isJa ? booking.product.nameJa : booking.product.nameEn),
    date: dateStr,
    startTime: startTimeStr,
    adultCount: input.adultCount,
    childCount: input.childCount,
    totalJpy: input.totalJpy,
    hasBbq: input.hasBbq,
    slotDate: slotForNotification ? slotForNotification.date : undefined,
    appUrl: input.appUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://thedreamadventure.com",
    isCombo,
  });
}

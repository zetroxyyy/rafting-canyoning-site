/**
 * /[locale]/manage/[reference]/page.tsx — Guest Portal Server Page
 *
 * Access model:
 *   - URL: /en/manage/DA-240619-ABCD?email=guest@example.com
 *   - Server-side: verifies reference + email against the DB
 *   - If invalid: redirects back to /[locale]/manage with an error flag
 *   - If valid:   renders ManagePortalClient with the booking data hydrated
 *
 * This page is NOT behind a Next-Auth session.
 * Security is reference + email ownership check only.
 */
import { notFound, redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import ManagePortalClient from "./ManagePortalClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Booking | Dream Adventure",
  robots: "noindex, nofollow", // portal pages should not be indexed
};

// Force dynamic — page depends on query params and live DB data
export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ reference: string }>;
  searchParams: Promise<{ email?: string }>;
}

export default async function ManagePortalPage({ params, searchParams }: Props) {
  const { reference } = await params;
  const { email } = await searchParams;
  const locale = (await getLocale()) as "en" | "ja";

  // Must have both reference and email to proceed
  if (!reference || !email) {
    redirect(locale === "ja" ? "/manage" : `/en/manage`);
  }

  const ref = reference.toUpperCase();
  const emailNorm = decodeURIComponent(email).toLowerCase();

  // Server-side ownership check
  const booking = await prisma.booking.findFirst({
    where: {
      reference: ref,
      leadEmail: {
        equals: emailNorm,
        mode: "insensitive",
      },
    },
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
      product: {
        select: { nameEn: true, nameJa: true, activityType: true },
      },
      slot: {
        select: { date: true, startTime: true },
      },
      secondarySlot: {
        select: { startTime: true },
      },
      participants: {
        select: {
          firstName: true,
          lastName: true,
          participantType: true,
          sortOrder: true,
        },
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
    redirect(locale === "ja" ? "/manage" : `/en/manage`);
  }

  // Serialize Date objects for client hydration
  const serialized = {
    ...booking,
    comboDate: booking.comboDate ? booking.comboDate.toISOString().slice(0, 10) : null,
    slot: booking.slot
      ? {
          ...booking.slot,
          date: booking.slot.date.toISOString().slice(0, 10),
        }
      : null,
    secondarySlot: booking.secondarySlot ?? null,
    bookingRequests: booking.bookingRequests.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
    })),
  };

  return (
    <ManagePortalClient
      booking={serialized}
      verifiedEmail={emailNorm}
      locale={locale}
    />
  );
}

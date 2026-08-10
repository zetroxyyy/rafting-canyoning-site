/**
 * POST /api/admin/bookings/[id]/generate-pdfs
 *
 * Manual admin fallback for PDF generation.
 * Called when the Stripe webhook timed out before generating PDFs,
 * or when PDFs need to be regenerated after a data correction.
 *
 * Accepts an optional JSON body:
 *   { locale?: "en" | "ja" }
 *
 * When `locale` is provided it overrides the booking's own locale.
 * This lets admins generate a Japanese confirmation for an English
 * booking, or vice-versa (e.g. when a guest requests it by phone).
 *
 * Response JSON:
 *   {
 *     success: true,
 *     locale: "en" | "ja",
 *     receiptPath: string | null,   // storage path (relative to bucket)
 *     waiverPath: string | null,
 *     receiptUrl: string,           // public URL for immediate viewing
 *     waiverUrl: string,
 *     uploadErrors?: string[]
 *   }
 *
 * Auth: NextAuth session (admin only)
 * Side effects:
 *  - Generates Receipt + Waiver PDFs using current booking data
 *  - Uploads to Supabase Storage (overwrites existing with upsert)
 *  - Updates Booking.receiptPdfPath / waiverPdfPath / *GeneratedAt
 *    (only when the locale matches the booking's primary locale,
 *     so an alternate-language override does not clobber the main paths)
 *  - Logs to AuditLog (including which locale was used)
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateReceiptPdf, generateWaiverPdf, type PdfBookingData } from "@/lib/services/pdf";
import { uploadPdf } from "@/lib/storage";
import { logAudit } from "@/lib/services/audit";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";
// Increase max execution time for Vercel — PDF generation can take ~10s
export const maxDuration = 60;

const bodySchema = z.object({
  // Optional admin-selected locale override ("en" | "ja").
  // Falls back to the booking's stored locale when omitted.
  locale: z.enum(["en", "ja"]).optional(),
});

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

    const { id: bookingId } = await params;

    // ── Parse optional locale override ───────────────────────────────────────
    //
    // req.text() is used instead of req.json() because the body stream can only
    // be consumed once.  Wrapping req.json() in a .catch() and then also in a
    // try/catch means a malformed body silently returns {} and the override is
    // lost.  req.text() always resolves to a string (even empty), so we can
    // JSON.parse it ourselves and handle failures explicitly.
    let localeOverride: "en" | "ja" | undefined;
    try {
      const rawText = await req.text();
      if (rawText.trim()) {
        const parsed = bodySchema.safeParse(JSON.parse(rawText));
        if (parsed.success && parsed.data.locale) {
          localeOverride = parsed.data.locale;
        }
      }
    } catch {
      // Malformed JSON or empty body — fall back to booking's stored locale
    }

    // 1. Fetch full booking data needed for PDFs
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        product: true,
        slot: true,
        secondarySlot: true,
        participants: { orderBy: { sortOrder: "asc" } },
      },
    });

    if (!booking) return NextResponse.json({ error: "BOOKING_NOT_FOUND" }, { status: 404 });
    if (!booking.slot && !booking.isCombo) return NextResponse.json({ error: "BOOKING_HAS_NO_SLOT" }, { status: 400 });

    if (!["CONFIRMED", "PENDING", "COMPLETED"].includes(booking.status)) {
      return NextResponse.json(
        { error: "PDFs can only be generated for CONFIRMED, PENDING, or COMPLETED bookings." },
        { status: 400 }
      );
    }

    // 2. Build PDF data payload
    // Admin locale override takes priority; fall back to booking's stored locale.
    const locale: "en" | "ja" = localeOverride ?? ((booking.locale as "en" | "ja") ?? "en");

    const pdfData: PdfBookingData = {
      reference: booking.reference,
      locale,
      leadName: booking.leadName,
      leadEmail: booking.leadEmail,
      leadPhone: booking.leadPhone,
      activityNameEn: booking.isCombo ? "Rafting + Canyoning Combo" : booking.product.nameEn,
      activityNameJa: booking.isCombo ? "ラフティング＋キャニオニング コンボ" : booking.product.nameJa,
      activityType: (booking.isCombo ? "RAFTING" : booking.product.activityType) as "RAFTING" | "CANYONING",
      slotDate: booking.slot
        ? booking.slot.date.toISOString().slice(0, 10)
        : (booking.comboDate ? booking.comboDate.toISOString().slice(0, 10) : "Flexible"),
      startTime: booking.slot ? booking.slot.startTime : "Flexible",
      secondarySlotTime: booking.secondarySlot ? booking.secondarySlot.startTime : null,
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

    // 3. Generate both PDFs in the requested locale
    const [receiptBuffer, waiverBuffer] = await Promise.all([
      generateReceiptPdf(pdfData),
      generateWaiverPdf(pdfData),
    ]);

    // File paths include the locale suffix so both language versions can coexist
    // in Supabase Storage without overwriting each other.
    // Paths are RELATIVE TO THE BUCKET ROOT — no "pdfs/" prefix.
    // The bucket name ("pdfs") is already encoded inside uploadPdf() via PDF_BUCKET.
    const receiptPath = `receipts/${booking.reference}-receipt-${locale}.pdf`;
    const waiverPath  = `waivers/${booking.reference}-waiver-${locale}.pdf`;

    // 4. Upload to Supabase Storage (upsert — safe to re-run)
    const [receiptResult, waiverResult] = await Promise.allSettled([
      uploadPdf(receiptPath, receiptBuffer),
      uploadPdf(waiverPath, waiverBuffer),
    ]);

    const resolvedReceiptPath =
      receiptResult.status === "fulfilled" ? receiptPath : null;
    const resolvedWaiverPath =
      waiverResult.status === "fulfilled" ? waiverPath : null;

    // Extract the public URLs returned by uploadPdf (empty string if upload failed)
    const resolvedReceiptUrl =
      receiptResult.status === "fulfilled" ? receiptResult.value.url : "";
    const resolvedWaiverUrl =
      waiverResult.status === "fulfilled" ? waiverResult.value.url : "";

    const uploadErrors: string[] = [];
    if (receiptResult.status === "rejected") {
      uploadErrors.push(`Receipt: ${receiptResult.reason}`);
    }
    if (waiverResult.status === "rejected") {
      uploadErrors.push(`Waiver: ${waiverResult.reason}`);
    }

    // 5. Save paths to DB — only overwrite when this is the primary booking locale
    // so that an alternate-language PDF request doesn't clobber the primary paths.
    const isPrimaryLocale = locale === ((booking.locale as "en" | "ja") ?? "en");
    if (isPrimaryLocale) {
      await prisma.booking.update({
        where: { id: bookingId },
        data: {
          receiptPdfPath: resolvedReceiptPath,
          waiverPdfPath: resolvedWaiverPath,
          receiptPdfGeneratedAt: new Date(),
          waiverPdfGeneratedAt: new Date(),
        },
      });

      // Revalidate so the guest portal and admin detail page see the new PDF
      // paths immediately without waiting for cache expiry.
      revalidatePath(`/admin/bookings/${bookingId}`);
      // Revalidate all locales of the public manage page
      revalidatePath("/en/manage");
      revalidatePath("/manage");
    }

    // 6. Audit
    const actorEmail = session.user?.email ?? "admin";
    await logAudit({
      bookingId,
      action: "PDF_GENERATED",
      actorEmail,
      description:
        `PDFs manually regenerated for ${booking.reference} (locale: ${locale})` +
        (localeOverride ? ` [admin override from ${booking.locale}]` : "") +
        (uploadErrors.length ? ` — upload errors: ${uploadErrors.join("; ")}` : ""),
    });

    // 7. Return paths + public URLs so the client can open them immediately.
    //    This is especially important for alternate-language PDFs where the DB
    //    path is intentionally NOT updated — the URL is the only way the admin
    //    can see the generated document.
    return NextResponse.json({
      success: true,
      locale,
      receiptPath: resolvedReceiptPath,
      waiverPath: resolvedWaiverPath,
      receiptUrl: resolvedReceiptUrl,
      waiverUrl: resolvedWaiverUrl,
      uploadErrors: uploadErrors.length > 0 ? uploadErrors : undefined,
    });
  } catch (err) {
    console.error("[generate-pdfs] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "SERVER_ERROR" },
      { status: 500 }
    );
  }
}

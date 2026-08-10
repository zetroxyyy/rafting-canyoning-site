/**
 * GET /api/booking/pdf?ref=DA-xxx&email=...&type=receipt|waiver
 * Returns a signed download URL for a guest's PDF.
 * Auth: reference + email ownership check.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPdfSignedUrl } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ref = searchParams.get("ref");
  const email = searchParams.get("email");
  const type = searchParams.get("type"); // "receipt" | "waiver"

  if (!ref || !email || !type) {
    return NextResponse.json({ error: "MISSING_PARAMS" }, { status: 400 });
  }

  const booking = await prisma.booking.findFirst({
    where: {
      reference: ref.toUpperCase(),
      leadEmail: email.toLowerCase(),
    },
    select: {
      receiptPdfPath: true,
      waiverPdfPath: true,
      status: true,
    },
  });

  if (!booking) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const path = type === "receipt" ? booking.receiptPdfPath : booking.waiverPdfPath;

  if (!path) {
    return NextResponse.json({ error: "PDF_NOT_AVAILABLE" }, { status: 404 });
  }

  const url = await getPdfSignedUrl(path);
  if (!url) {
    return NextResponse.json({ error: "PDF_URL_FAILED" }, { status: 500 });
  }

  return NextResponse.json({ url });
}

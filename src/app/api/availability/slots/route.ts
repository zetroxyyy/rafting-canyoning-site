/**
 * GET /api/availability/slots?productId=&date=YYYY-MM-DD
 * Returns time slots for a specific date — used by Step 3 of booking wizard.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSlotsForDate } from "@/lib/services/availability";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const productId = searchParams.get("productId");
  const dateStr = searchParams.get("date");

  if (!productId || !dateStr) {
    return NextResponse.json(
      { error: "productId and date are required" },
      { status: 400 }
    );
  }

  const date = new Date(dateStr + "T00:00:00Z");
  if (isNaN(date.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  // Block bookings less than 1 day before
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  if (date < tomorrow) {
    return NextResponse.json(
      { error: "TOO_CLOSE", slots: [] },
      { status: 200 }
    );
  }

  const slots = await getSlotsForDate(productId, date);

  return NextResponse.json({ slots }, { status: 200 });
}

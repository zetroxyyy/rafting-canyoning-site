/**
 * GET /api/availability/month?productId=&year=&month=
 * Returns date-level availability for the public calendar (Step 2).
 */
import { NextRequest, NextResponse } from "next/server";
import { getMonthAvailability } from "@/lib/services/availability";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const productId = searchParams.get("productId");
  const year = parseInt(searchParams.get("year") ?? "");
  const month = parseInt(searchParams.get("month") ?? "");

  if (!productId || isNaN(year) || isNaN(month)) {
    return NextResponse.json(
      { error: "productId, year and month are required" },
      { status: 400 }
    );
  }

  const availability = await getMonthAvailability(productId, year, month);

  return NextResponse.json(
    { availability },
    {
      status: 200,
      headers: {
        // Cache for 60s — real-time enough for most cases
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    }
  );
}

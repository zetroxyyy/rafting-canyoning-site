/**
 * GET /api/admin/availability/slots
 *
 * Admin-only slot query. Supports two modes:
 *
 *  Mode A — Manual Booking (existing):
 *    ?productId=…&date=YYYY-MM-DD
 *    Returns all non-blocked slots for a product on a given date.
 *
 *  Mode B — Reschedule Slot Search (new):
 *    ?activityType=RAFTING|CANYONING&date=YYYY-MM-DD&time=HH:MM&minAvailable=N
 *    Finds all open slots for ANY product of the given activityType on the
 *    given date (and optional time filter), with at least minAvailable free
 *    seats. Used by AdminRequestCard to present concrete slot choices when
 *    finalising a reschedule request.
 *
 * Auth: admin session required.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSlotsForDate } from "@/lib/services/availability";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const productId    = searchParams.get("productId");
  const dateStr      = searchParams.get("date");
  const activityType = searchParams.get("activityType");
  const timeFilter   = searchParams.get("time");
  const minAvail     = parseInt(searchParams.get("minAvailable") ?? "1", 10);

  if (!dateStr) {
    return NextResponse.json({ error: "date is required" }, { status: 400 });
  }

  const date = new Date(dateStr + "T00:00:00Z");
  if (isNaN(date.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  // ── Mode A: single product (existing manual booking flow) ──────────────────
  if (productId) {
    const all = await getSlotsForDate(productId, date);
    const slots = all.filter((s) => s.status !== "blocked" && s.status !== "closed");
    return NextResponse.json({ slots }, { status: 200 });
  }

  // ── Mode B: reschedule slot search — by activityType ──────────────────────
  if (!activityType) {
    return NextResponse.json(
      { error: "Either productId or activityType is required" },
      { status: 400 }
    );
  }

  // UTC bounds for the target calendar date (slot.date stored as UTC midnight)
  const startUtc = new Date(Date.UTC(
    date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0
  ));
  const endUtc = new Date(startUtc.getTime() + 86_400_000);

  const rawSlots = await prisma.availabilitySlot.findMany({
    where: {
      date:   { gte: startUtc, lt: endUtc },
      status: { in: ["OPEN", "SPECIAL"] },
      product: { activityType: activityType as "RAFTING" | "CANYONING" },
      ...(timeFilter ? { startTime: timeFilter } : {}),
    },
    include: {
      product: { select: { nameEn: true, activityType: true } },
    },
    orderBy: [{ startTime: "asc" }],
  });

  const slots = rawSlots
    .map((s) => ({
      id:          s.id,
      date:        s.date.toISOString().slice(0, 10),
      startTime:   s.startTime,
      productName: s.product.nameEn,
      activityType: s.product.activityType,
      maxCapacity: s.maxCapacity,
      bookedCount: s.bookedCount,
      available:   Math.max(0, s.maxCapacity - s.bookedCount),
    }))
    .filter((s) => s.available >= minAvail);

  return NextResponse.json({ slots }, { status: 200 });
}

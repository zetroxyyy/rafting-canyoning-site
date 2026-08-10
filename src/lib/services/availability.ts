/**
 * Availability service v2 — real DB queries with hold-aware capacity.
 */
import { prisma } from "@/lib/prisma";
import { releaseExpiredHolds } from "@/lib/services/hold";
import { RAFTING_MAX_CAPACITY, DEPARTURE_TIMES } from "@/lib/utils";

export type SlotStatus = "available" | "limited" | "full" | "blocked" | "special" | "closed";

export interface SlotInfo {
  id: string;
  date: string; // YYYY-MM-DD
  startTime: string; // "09:00" | "11:30" | "13:30"
  maxCapacity: number;
  bookedCount: number;
  heldCount: number;
  remaining: number;
  status: SlotStatus;
  isBlocked: boolean;
  blockedReason?: string | null;
  adminNote?: string | null;
  weatherNote?: string | null;
}

async function resolveProductId(idOrSlug: string): Promise<string> {
  if (!idOrSlug) return "";
  let query = idOrSlug;
  if (idOrSlug === "cmo7ffeih0000eguxbmagdoxp") {
    query = "rafting";
  } else if (idOrSlug === "cmo7fff7m0001eguxz2pbd1sj") {
    query = "canyoning";
  }
  const product = await prisma.product.findFirst({
    where: {
      OR: [
        { id: query },
        { slug: query },
      ],
    },
    select: { id: true },
  });
  return product?.id ?? idOrSlug;
}

function toSlotStatus(
  s: { isBlocked: boolean; status: string; bookedCount: number; maxCapacity: number },
  heldCount: number
): SlotStatus {
  if (s.isBlocked || s.status === "BLOCKED") return "blocked";
  if (s.status === "CLOSED") return "closed";
  if (s.status === "SPECIAL") return "special";
  if (s.status === "SOLD_OUT") return "full";

  const isOpen = s.status === "OPEN" || s.status === "AVAILABLE";

  const remaining = s.maxCapacity - s.bookedCount - heldCount;
  if (remaining <= 0) return "full";
  if (remaining <= 4) return "limited";
  if (isOpen) return "available";

  return "available";
}

/**
 * Get month-level availability for the public calendar.
 * Returns one entry per date (best-slot status).
 */
export async function getMonthAvailability(
  productIdOrSlug: string,
  year: number,
  month: number // 1-based
): Promise<{ date: string; status: SlotStatus; hasSlots: boolean }[]> {
  const productId = await resolveProductId(productIdOrSlug);

  // Release stale holds first (lightweight cleanup)
  await releaseExpiredHolds().catch(() => {});

  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59));

  const slots = await prisma.availabilitySlot.findMany({
    where: { productId, date: { gte: start, lte: end } },
    include: {
      seatHolds: {
        where: { isReleased: false, expiresAt: { gt: new Date() } },
      },
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  // Group by date, pick best status
  const byDate = new Map<string, SlotStatus[]>();
  for (const s of slots) {
    const dateStr = s.date.toISOString().slice(0, 10);
    const heldCount = s.seatHolds.reduce((sum: number, h: { paxCount: number }) => sum + h.paxCount, 0);
    const st = toSlotStatus(s, heldCount);
    if (!byDate.has(dateStr)) byDate.set(dateStr, []);
    byDate.get(dateStr)!.push(st);
  }

  // For each date, pick the best (most available) status
  const STATUS_PRIORITY: Record<SlotStatus, number> = {
    available: 0,
    limited: 1,
    full: 2,
    special: 3,
    blocked: 4,
    closed: 5,
  };

  return Array.from(byDate.entries()).map(([date, statuses]) => {
    const best = statuses.sort((a, b) => STATUS_PRIORITY[a] - STATUS_PRIORITY[b])[0];
    return { date, status: best, hasSlots: true };
  });
}

/**
 * Get full slot info for a specific date — used by Step 3 of booking wizard.
 */
export async function getSlotsForDate(
  productIdOrSlug: string,
  date: Date
): Promise<SlotInfo[]> {
  const productId = await resolveProductId(productIdOrSlug);

  await releaseExpiredHolds().catch(() => {});

  const dayStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayEnd = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1));

  const slots = await prisma.availabilitySlot.findMany({
    where: {
      productId,
      date: { gte: dayStart, lt: dayEnd },
    },
    include: {
      seatHolds: {
        where: { isReleased: false, expiresAt: { gt: new Date() } },
      },
    },
    orderBy: { startTime: "asc" },
  });

  return slots.map((s) => {
    const heldCount = s.seatHolds.reduce((sum: number, h: { paxCount: number }) => sum + h.paxCount, 0);
    const remaining = Math.max(0, s.maxCapacity - s.bookedCount - heldCount);
    const status = toSlotStatus(s, heldCount) as SlotStatus;

    return {
      id: s.id,
      date: s.date.toISOString().slice(0, 10),
      startTime: s.startTime,
      maxCapacity: s.maxCapacity,
      bookedCount: s.bookedCount,
      heldCount,
      remaining,
      status,
      isBlocked: s.isBlocked,
      blockedReason: s.blockedReason,
      adminNote: s.adminNote,
      weatherNote: s.weatherNote,
    };
  });
}

export async function getSlotById(slotId: string): Promise<SlotInfo | null> {
  await releaseExpiredHolds().catch(() => {});

  const s = await prisma.availabilitySlot.findUnique({
    where: { id: slotId },
    include: {
      seatHolds: {
        where: { isReleased: false, expiresAt: { gt: new Date() } },
      },
    },
  });

  if (!s) return null;

  const heldCount = s.seatHolds.reduce((sum: number, h: { paxCount: number }) => sum + h.paxCount, 0);
  const remaining = Math.max(0, s.maxCapacity - s.bookedCount - heldCount);
  const status = toSlotStatus(s, heldCount) as SlotStatus;

  return {
    id: s.id,
    date: s.date.toISOString().slice(0, 10),
    startTime: s.startTime,
    maxCapacity: s.maxCapacity,
    bookedCount: s.bookedCount,
    heldCount,
    remaining,
    status,
    isBlocked: s.isBlocked,
    blockedReason: s.blockedReason,
    adminNote: s.adminNote,
    weatherNote: s.weatherNote,
  };
}

/**
 * Ensure default slots exist for a date/product (admin + seed use).
 */
export async function ensureSlotsForDate(
  productIdOrSlug: string,
  date: Date,
  maxCapacity?: number,
  startTimes?: string[]
): Promise<void> {
  const productId = await resolveProductId(productIdOrSlug);

  let finalCapacity = maxCapacity ? Number(maxCapacity) : undefined;
  if (!finalCapacity || isNaN(finalCapacity)) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { activityType: true },
    });
    finalCapacity = product?.activityType === "CANYONING" ? 35 : 21;
  }

  const times = startTimes && startTimes.length > 0
    ? startTimes.map((t) => {
        const parts = t.trim().split(":");
        if (parts.length === 2) {
          return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`;
        }
        return t.trim();
      }).filter((t) => /^\d{2}:\d{2}$/.test(t))
    : DEPARTURE_TIMES;

  for (const time of times) {
    await prisma.availabilitySlot.upsert({
      where: { productId_date_startTime: { productId, date, startTime: time } },
      create: {
        productId,
        date,
        startTime: time,
        maxCapacity: finalCapacity,
        status: "OPEN",
        isBlocked: false,
      },
      update: {},
    });
  }
}

/**
 * Admin: block a date range for a product.
 */
export async function blockDateRange(
  productIdOrSlug: string,
  startDate: Date,
  endDate: Date,
  reason: string,
  adminEmail: string
): Promise<number> {
  const productId = await resolveProductId(productIdOrSlug);

  // First ensure slots exist for every day in range
  const current = new Date(startDate);
  while (current <= endDate) {
    await ensureSlotsForDate(productId, new Date(current));
    current.setUTCDate(current.getUTCDate() + 1);
  }

  const result = await prisma.availabilitySlot.updateMany({
    where: {
      productId,
      date: { gte: startDate, lte: endDate },
    },
    data: {
      isBlocked: true,
      status: "BLOCKED",
      blockedReason: reason,
    },
  });

  return result.count;
}

/**
 * Admin: get slots for a month (full info for admin calendar).
 */
export async function getAdminMonthSlots(
  productIdOrSlug: string,
  year: number,
  month: number
) {
  const productId = await resolveProductId(productIdOrSlug);

  await releaseExpiredHolds().catch(() => {});

  // ── JST today boundary ────────────────────────────────────────────────────
  // Compute today's date in JST (UTC+9).
  const nowUtc      = new Date();
  const jstOffsetMs = 9 * 60 * 60 * 1000;
  const nowJst      = new Date(nowUtc.getTime() + jstOffsetMs);
  // "Start of today in JST" expressed back as a UTC Date that Prisma can use.
  // We zero out the time portion in JST, then convert back to UTC.
  const todayJstMidnightUtc = new Date(
    Date.UTC(nowJst.getUTCFullYear(), nowJst.getUTCMonth(), nowJst.getUTCDate())
    - jstOffsetMs
  );

  // ── Month bounds ──────────────────────────────────────────────────────────
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd   = new Date(Date.UTC(year, month,     0, 23, 59, 59));

  // Effective lower bound: whichever is later — the month's first day or today.
  // This hides past slots inside the current month, and hides ALL slots for
  // months that have already passed, without touching the database.
  const effectiveStart = todayJstMidnightUtc > monthStart
    ? todayJstMidnightUtc
    : monthStart;

  const slots = await prisma.availabilitySlot.findMany({
    where: { productId, date: { gte: effectiveStart, lte: monthEnd } },
    include: {
      seatHolds: {
        where: { isReleased: false, expiresAt: { gt: new Date() } },
      },
      _count: { select: { bookings: true } },
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  return slots.map((s) => {
    const heldCount = s.seatHolds.reduce((sum: number, h: { paxCount: number }) => sum + h.paxCount, 0);
    const remaining = Math.max(0, s.maxCapacity - s.bookedCount - heldCount);
    const status = toSlotStatus(s, heldCount) as SlotStatus;

    return {
      id: s.id,
      date: s.date.toISOString().slice(0, 10),
      startTime: s.startTime,
      maxCapacity: s.maxCapacity,
      bookedCount: s.bookedCount,
      heldCount,
      remaining,
      status,
      isBlocked: s.isBlocked,
      blockedReason: s.blockedReason,
      adminNote: s.adminNote,
      weatherNote: s.weatherNote,
      bookingCount: s._count.bookings,
    };
  });
}


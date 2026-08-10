/**
 * POST /api/admin/availability
 * Manage slots: generate month, block/unblock ranges.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ensureSlotsForDate, blockDateRange } from "@/lib/services/availability";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/services/audit";
import { CAPACITY } from "@/lib/utils";

const UI_TO_DB_STATUS: Record<string, string> = {
  AVAILABLE: "OPEN",
  OPEN:      "OPEN",
  BLOCKED:   "BLOCKED",
  SPECIAL:   "SPECIAL",
  CLOSED:    "CLOSED",
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const body = await req.json();
  const actorEmail = session.user?.email ?? "admin";

  try {
    switch (body.action) {
      case "ENSURE_MONTH": {
        const {
          productId,
          year,
          month,
          // fromDay: skip days before this day number (default 1 = full month)
          fromDay = 1,
          // startTimes: override default slot times per day
          startTimes,
        } = body;

        if (!productId) return NextResponse.json({ error: "MISSING_PRODUCT_ID" }, { status: 400 });

        // ── Derive correct capacity from product's activityType ────────────────
        // Caller may still pass an explicit maxCapacity override; only fall back
        // to the activity-aware default when the body field is absent / falsy.
        let defaultCapacity: number;
        const parsedMaxCapacity = body.maxCapacity != null ? parseInt(String(body.maxCapacity), 10) : null;
        if (parsedMaxCapacity != null && !isNaN(parsedMaxCapacity) && parsedMaxCapacity > 0) {
          defaultCapacity = parsedMaxCapacity;
        } else {
          const product = await prisma.product.findUnique({
            where: { id: productId },
            select: { activityType: true },
          });
          defaultCapacity =
            product?.activityType === "CANYONING"
              ? CAPACITY.CANYONING // 35
              : CAPACITY.RAFTING;  // 21 (default for Rafting + unknown)
        }

        const sanitizedTimes = startTimes && Array.isArray(startTimes)
          ? startTimes.map((t: string) => {
              const parts = t.trim().split(":");
              if (parts.length === 2) {
                return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`;
              }
              return t.trim();
            }).filter((t: string) => /^\d{2}:\d{2}$/.test(t))
          : undefined;

        const daysInMonth = new Date(year, month, 0).getDate();
        const startDay = Math.max(1, Math.min(fromDay, daysInMonth));
        let count = 0;

        for (let d = startDay; d <= daysInMonth; d++) {
          const date = new Date(Date.UTC(year, month - 1, d));
          await ensureSlotsForDate(productId, date, defaultCapacity, sanitizedTimes);
          count++;
        }

        const skipped = startDay - 1;
        await logAudit({
          action: "SLOT_UPDATED",
          actorEmail,
          description: `Generated slots for ${count} days in ${year}-${String(month).padStart(2, "0")}${skipped > 0 ? ` (skipped ${skipped} past day(s))` : ""} (product: ${productId}, capacity: ${defaultCapacity})`,
        });

        return NextResponse.json({
          success: true,
          message: `Generated slots for ${count} day${count !== 1 ? "s" : ""}${skipped > 0 ? ` (${skipped} past day${skipped !== 1 ? "s" : ""} skipped)` : ""}`,
        });
      }

      case "BLOCK_RANGE": {
        const { productId, startDate, endDate, reason } = body;
        const count = await blockDateRange(
          productId,
          new Date(startDate),
          new Date(endDate),
          reason ?? "Admin block",
          actorEmail
        );
        await logAudit({
          action: "SLOT_BLOCKED",
          actorEmail,
          description: `Blocked ${count} slots from ${startDate} to ${endDate}: ${reason}`,
        });
        return NextResponse.json({ success: true, message: `Blocked ${count} slots` });
      }

      case "UNBLOCK_RANGE": {
        const { productId, startDate, endDate } = body;
        const result = await prisma.availabilitySlot.updateMany({
          where: {
            productId,
            date: { gte: new Date(startDate), lte: new Date(endDate) },
          },
          data: { isBlocked: false, status: "OPEN", blockedReason: null },
        });
        await logAudit({
          action: "SLOT_UNBLOCKED",
          actorEmail,
          description: `Unblocked ${result.count} slots from ${startDate} to ${endDate}`,
        });
        return NextResponse.json({ success: true, message: `Unblocked ${result.count} slots` });
      }

      case "UPDATE_SLOT": {
        const { slotId, maxCapacity, isBlocked, blockedReason, adminNote, weatherNote, status } = body;
        
        let dbStatus = undefined;
        if (status !== undefined) {
          dbStatus = UI_TO_DB_STATUS[status] || status;
          if (dbStatus === "AVAILABLE") {
            dbStatus = "OPEN";
          }
        }

        await prisma.availabilitySlot.update({
          where: { id: slotId },
          data: {
            ...(maxCapacity !== undefined && { maxCapacity: parseInt(String(maxCapacity), 10) }),
            ...(isBlocked !== undefined && { isBlocked }),
            ...(blockedReason !== undefined && { blockedReason }),
            ...(adminNote !== undefined && { adminNote }),
            ...(weatherNote !== undefined && { weatherNote }),
            ...(dbStatus !== undefined && { status: dbStatus }),
          },
        });
        await logAudit({
          action: "SLOT_CAPACITY_CHANGED",
          actorEmail,
          description: `Updated slot ${slotId}`,
        });
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: "UNKNOWN_ACTION" }, { status: 400 });
    }
  } catch (err) {
    console.error("[admin/availability]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "SERVER_ERROR" },
      { status: 500 }
    );
  }
}

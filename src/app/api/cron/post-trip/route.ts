/**
 * GET /api/cron/post-trip
 *
 * 2-day post-trip automation cron job.
 * Called daily by Vercel Cron (e.g. "0 2 * * *" — 2 AM UTC = 11 AM JST).
 *
 * Security: Authorization header must match CRON_SECRET env var.
 *
 * Logic:
 * - Query all bookings with status CONFIRMED whose slot date was exactly 2 days ago (JST).
 * - Update their status to COMPLETED in the database.
 * - Delegate email sending to sendPostTripEmailForBooking() from postTrip.ts — that
 *   function owns the template, address, and brand tag. The duplicate template that
 *   previously lived here has been removed (Gunma pivot audit, GUNMA_LOCATION_PIVOT.md §1.7).
 * - Log all actions to AuditLog.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/services/audit";
import { sendPostTripEmailForBooking } from "@/lib/services/postTrip";

export const dynamic = "force-dynamic";

// ─── JST helpers ──────────────────────────────────────────────────────────────

const JST_OFFSET_MS = 9 * 60 * 60 * 1000; // UTC+9

function nowJst(): Date {
  return new Date(Date.now() + JST_OFFSET_MS);
}

// ─── Main cron handler ────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  // Auth check
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const jstNow = nowJst();

  // Target date: exactly 2 days ago in JST
  const twoDaysAgoJst = new Date(jstNow.getTime() - 2 * 24 * 60 * 60 * 1000);
  const targetDateStr = twoDaysAgoJst.toISOString().slice(0, 10);

  // Build the UTC date range for the target date stored in the DB
  const targetDateStart = new Date(targetDateStr + "T00:00:00Z");
  const targetDateEnd = new Date(targetDateStr + "T23:59:59Z");

  // Find all CONFIRMED bookings whose trip was exactly 2 days ago
  const bookings = await prisma.booking.findMany({
    where: {
      status: "CONFIRMED",
      slot: {
        date: { gte: targetDateStart, lte: targetDateEnd },
      },
    },
    select: { id: true, reference: true },
  });

  let completed = 0;
  let emailsSent = 0;
  let emailsFailed = 0;
  const errors: string[] = [];

  for (const booking of bookings) {
    try {
      // ── Step 1: Update status to COMPLETED ──────────────────────────────
      await prisma.booking.update({
        where: { id: booking.id },
        data: { status: "COMPLETED" },
      });
      completed++;

      // ── Step 2: Delegate email to the shared service ─────────────────────
      // sendPostTripEmailForBooking owns the template, brand tag, and address.
      // It handles the VIP promo upsert, notification log, and Resend call.
      await sendPostTripEmailForBooking(booking.id);
      emailsSent++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${booking.reference}: ${msg}`);
      console.error(`[PostTrip] Error processing ${booking.reference}:`, err);
      emailsFailed++;
    }
  }

  // Audit the cron run
  await logAudit({
    action: "CRON_RUN",
    actorEmail: "system",
    description: `Post-trip 2-day cron: ${completed} COMPLETED, ${emailsSent} emails sent, ${emailsFailed} email failures, ${errors.length} errors. Target date: ${targetDateStr}`,
    after: { completed, emailsSent, emailsFailed, errors: errors.length, targetDateStr },
  });

  console.log(
    `[Cron/post-trip] ${completed} completed, ${emailsSent} emails sent, ${emailsFailed} email failures, ${errors.length} errors`
  );

  return NextResponse.json({
    success: true,
    targetDate: targetDateStr,
    total: bookings.length,
    completed,
    emailsSent,
    emailsFailed,
    errors: errors.length > 0 ? errors : undefined,
  });
}

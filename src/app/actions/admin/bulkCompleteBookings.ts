"use server";

/**
 * bulkCompleteBookings — Server Action
 *
 * Marks all CONFIRMED bookings whose slot.date is strictly before today (JST)
 * as COMPLETED.  Safe to call repeatedly; it is idempotent.
 *
 * After marking COMPLETED, fires the post-trip "Thank You + VIP Discount" email
 * for each guest. Email failures are fire-and-forget and never block the DB update.
 *
 * JST = UTC+9.  We compute today's midnight in JST and convert back to UTC
 * so the Prisma Date comparison works correctly regardless of the server's
 * local timezone.
 */
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/services/audit";
import { revalidatePath } from "next/cache";
import { sendPostTripEmailForBooking } from "@/lib/services/postTrip";

export interface BulkCompleteResult {
  updated: number;
  error?: string;
}

export async function bulkCompleteBookings(): Promise<BulkCompleteResult> {
  const session = await auth();
  if (!session?.user?.email) {
    return { updated: 0, error: "UNAUTHORIZED" };
  }

  // ── JST today midnight (UTC representation) ──────────────────────────────
  const nowUtc      = new Date();
  const jstOffsetMs = 9 * 60 * 60 * 1000;
  const nowJst      = new Date(nowUtc.getTime() + jstOffsetMs);
  // Midnight of today in JST, converted back to UTC for Prisma comparison.
  const todayJstMidnightUtc = new Date(
    Date.UTC(nowJst.getUTCFullYear(), nowJst.getUTCMonth(), nowJst.getUTCDate())
    - jstOffsetMs
  );

  try {
    // Find booking IDs where slot.date < today (JST)
    // Prisma doesn't support updateMany with a relation filter, so we do a
    // two-step: find qualifying booking IDs, then updateMany by those IDs.
    const qualifying = await prisma.booking.findMany({
      where: {
        status: "CONFIRMED",
        slot: { date: { lt: todayJstMidnightUtc } },
      },
      select: { id: true, reference: true },
    });

    if (qualifying.length === 0) {
      return { updated: 0 };
    }

    const ids = qualifying.map((b) => b.id);

    await prisma.booking.updateMany({
      where: { id: { in: ids } },
      data:  { status: "COMPLETED" },
    });

    // Fire post-trip "Thank You + VIP Discount" email for each completed booking.
    // Done after the DB update so email failures never block the status change.
    // Errors are swallowed per-booking — one failed send cannot stall the others.
    let emailsSent = 0;
    let emailsFailed = 0;
    for (const b of qualifying) {
      try {
        await sendPostTripEmailForBooking(b.id);
        emailsSent++;
      } catch {
        emailsFailed++;
      }
    }

    // Audit log — single entry summarising the bulk action
    await logAudit({
      action:      "BULK_COMPLETE",
      actorEmail:  session.user.email,
      description: `Bulk completed ${qualifying.length} past CONFIRMED bookings: ${qualifying.map((b) => b.reference).join(", ")}. Emails: ${emailsSent} sent, ${emailsFailed} failed.`,
    });

    // Revalidate admin pages so the table refreshes
    revalidatePath("/admin/bookings");
    revalidatePath("/admin");

    return { updated: qualifying.length };
  } catch (err) {
    console.error("[bulkCompleteBookings]", err);
    return {
      updated: 0,
      error:   err instanceof Error ? err.message : "SERVER_ERROR",
    };
  }
}

/**
 * GET /api/admin/notifications
 *
 * Returns a unified notification feed for the Admin Bell dropdown, aggregating
 * three categories:
 *
 *   1. bookings  — Bookings created or updated in the last 7 days
 *                  (from NotificationLog, event = BOOKING_CONFIRMED etc.)
 *   2. requests  — BookingRequests with status PENDING_REVIEW
 *   3. contacts  — ContactSubmissions with isRead = false
 *
 * Response shape:
 * {
 *   bookings:  NotifEntry[];   // from NotificationLog
 *   requests:  RequestEntry[]; // from BookingRequest
 *   contacts:  ContactEntry[]; // from ContactSubmission
 *   unread: {
 *     bookings: number;
 *     requests: number;
 *     contacts: number;
 *     total:    number;
 *   }
 * }
 *
 * Query params:
 *   bookingsSince?  ISO — NotificationLog entries newer than this are "unread"
 *   requestsSince?  ISO — (unused; all PENDING_REVIEW are always unread)
 *   contactsSince?  ISO — (unused; isRead=false is the source of truth)
 *
 * Auth: NextAuth admin session required.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const bookingsSince = searchParams.get("bookingsSince");
  const limit = 15;

  const since = bookingsSince ? new Date(bookingsSince) : null;

  const [notifLogs, pendingRequests, unreadContacts, notifLogUnreadCount] = await Promise.all([
    // 1. Recent notification log entries (booking events)
    prisma.notificationLog.findMany({
      orderBy: { sentAt: "desc" },
      take: limit,
      include: {
        booking: { select: { reference: true, id: true } },
      },
    }),

    // 2. All PENDING_REVIEW booking requests (always unread until resolved)
    prisma.bookingRequest.findMany({
      where: { status: "PENDING_REVIEW" },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        booking: {
          select: { reference: true, id: true, leadName: true },
        },
      },
    }),

    // 3. Unread contact submissions
    prisma.contactSubmission.findMany({
      where: { isRead: false },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        name: true,
        email: true,
        subject: true,
        activityInterest: true,
        createdAt: true,
        isRead: true,
      },
    }),

    // 4. Unread count for notification logs (based on localStorage since param)
    since
      ? prisma.notificationLog.count({ where: { sentAt: { gt: since } } })
      : prisma.notificationLog.count(),
  ]);

  const unread = {
    bookings: notifLogUnreadCount,
    requests: pendingRequests.length,
    contacts: unreadContacts.length,
    total: notifLogUnreadCount + pendingRequests.length + unreadContacts.length,
  };

  return NextResponse.json({
    bookings: notifLogs,
    requests: pendingRequests.map((r) => ({
      id: r.id,
      type: r.type,
      bookingId: r.booking?.id ?? null,
      reference: r.booking?.reference ?? null,
      leadName: r.booking?.leadName ?? null,
      createdAt: r.createdAt.toISOString(),
    })),
    contacts: unreadContacts.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      subject: c.subject,
      activityInterest: c.activityInterest,
      createdAt: c.createdAt.toISOString(),
      isRead: c.isRead,
    })),
    unread,
  });
}

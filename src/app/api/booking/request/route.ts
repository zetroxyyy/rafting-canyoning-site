/**
 * POST /api/booking/request
 * Guest submits a cancellation or reschedule request.
 * Auth: booking reference + email (no session required).
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  submitCancellationRequest,
  submitRescheduleRequest,
} from "@/lib/services/bookingRequests";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { reference, email, type, guestMessage, requestedNewDate, requestedNewTime } = body;

    if (!reference || !email || !type) {
      return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 });
    }

    // Verify ownership: reference + email must match
    const booking = await prisma.booking.findFirst({
      where: {
        reference: (reference as string).toUpperCase(),
        leadEmail: (email as string).toLowerCase(),
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "BOOKING_NOT_FOUND" }, { status: 404 });
    }

    let requestId: string;

    if (type === "CANCELLATION") {
      requestId = await submitCancellationRequest(booking.id, guestMessage);
    } else if (type === "RESCHEDULE") {
      if (!requestedNewDate || !requestedNewTime) {
        return NextResponse.json({ error: "RESCHEDULE_MISSING_DATE_TIME" }, { status: 400 });
      }
      const allowedTimes = ["09:00", "11:30", "13:30"];
      if (!allowedTimes.includes(requestedNewTime)) {
        return NextResponse.json({ error: "INVALID_RESCHEDULE_TIME" }, { status: 400 });
      }
      requestId = await submitRescheduleRequest(
        booking.id,
        requestedNewDate,
        requestedNewTime,
        guestMessage
      );
    } else {
      return NextResponse.json({ error: "INVALID_REQUEST_TYPE" }, { status: 400 });
    }

    // Fire admin alert (non-blocking)
    sendAdminRequestAlert(type, booking.reference, booking.leadName, requestId).catch(() => {});

    return NextResponse.json({ success: true, requestId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "SERVER_ERROR";
    const status = [
      "BOOKING_NOT_FOUND",
      "ALREADY_CANCELLED",
      "ALREADY_COMPLETED",
      "REQUEST_ALREADY_EXISTS",
      "RESCHEDULE_MISSING_DATE_TIME",
    ].includes(msg) ? 409 : 500;

    return NextResponse.json({ error: msg }, { status });
  }
}

async function sendAdminRequestAlert(
  type: string,
  reference: string,
  leadName: string,
  requestId: string
): Promise<void> {
  const lineToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const lineUserId = process.env.LINE_ADMIN_USER_ID;
  if (!lineToken || !lineUserId) return;

  const emoji = type === "CANCELLATION" ? "🚫" : "📅";
  const label = type === "CANCELLATION" ? "CANCELLATION REQUEST" : "RESCHEDULE REQUEST";
  const msg = `${emoji} ${label}\n${reference}\n${leadName}\nReview: ${process.env.NEXT_PUBLIC_APP_URL}/admin/requests/${requestId}`;

  await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${lineToken}` },
    body: JSON.stringify({ to: lineUserId, messages: [{ type: "text", text: msg }] }),
  }).catch(() => {});
}

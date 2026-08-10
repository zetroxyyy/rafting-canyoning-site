/**
 * GET  /api/admin/requests       — list all requests (paginated)
 * POST /api/admin/requests       — approve / reject / finalize
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getAllRequests,
  approveRequest,
  rejectRequest,
  finalizeCancellation,
  finalizeReschedule,
} from "@/lib/services/bookingRequests";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const pageSize = parseInt(searchParams.get("pageSize") ?? "50");

  const result = await getAllRequests(page, pageSize);
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const body = await req.json();
  const { action, requestId, adminDecisionNote, actualRefundJpy, newSlotId, manualRefundMethod } = body;
  const actorEmail = session.user?.email ?? "admin";

  if (!requestId) {
    return NextResponse.json({ error: "MISSING_REQUEST_ID" }, { status: 400 });
  }

  try {
    switch (action) {
      case "APPROVE":
        await approveRequest(requestId, actorEmail, adminDecisionNote);
        return NextResponse.json({ success: true, message: "Request approved" });

      case "REJECT":
        await rejectRequest(requestId, actorEmail, adminDecisionNote);
        return NextResponse.json({ success: true, message: "Request rejected" });

      case "FINALIZE_CANCELLATION": {
        const refundJpy = typeof actualRefundJpy === "number" ? actualRefundJpy : 0;
        const resolvedRefundMethod = typeof manualRefundMethod === "string"
          ? manualRefundMethod
          : "cash";

        // Task 2: Strict backend validation — reject before hitting the service
        if (!Number.isFinite(refundJpy) || refundJpy < 0) {
          return NextResponse.json(
            { error: "Refund amount must be a non-negative number (¥)." },
            { status: 400 }
          );
        }

        // Fetch the booking's payments to enforce the net paid ceiling
        const reqRecord = await prisma.bookingRequest.findUnique({
          where: { id: requestId },
          select: {
            booking: {
              select: {
                totalJpy: true,
                payments: {
                  select: { amountJpy: true }
                }
              }
            }
          },
        });
        const payments = reqRecord?.booking?.payments ?? [];
        const netPaid = payments.reduce((sum, p) => sum + p.amountJpy, 0);
        if (refundJpy > netPaid) {
          return NextResponse.json(
            { error: `Refund ¥${Math.round(refundJpy).toLocaleString()} exceeds net amount paid ¥${netPaid.toLocaleString()}.` },
            { status: 400 }
          );
        }

        await finalizeCancellation(
          requestId,
          actorEmail,
          Math.round(refundJpy),
          adminDecisionNote
        );
        return NextResponse.json({
          success: true,
          message: `Cancellation finalized. Refund: ¥${Math.round(refundJpy).toLocaleString()} — return to guest manually.`,
        });
      }

      case "FINALIZE_RESCHEDULE":
        if (!newSlotId) {
          return NextResponse.json({ error: "MISSING_NEW_SLOT_ID" }, { status: 400 });
        }
        await finalizeReschedule(requestId, actorEmail, newSlotId);
        return NextResponse.json({ success: true, message: "Reschedule finalized" });

      default:
        return NextResponse.json({ error: "UNKNOWN_ACTION" }, { status: 400 });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "SERVER_ERROR";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

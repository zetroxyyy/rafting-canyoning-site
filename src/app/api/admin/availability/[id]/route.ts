/**
 * PATCH /api/admin/availability/[id]
 *
 * Edit a single AvailabilitySlot: capacity, startTime, status, adminNote.
 * Auth: NextAuth session (admin only)
 *
 * Body:
 *  {
 *    maxCapacity?: number;      // must be >= bookedCount
 *    startTime?:  string;       // "HH:MM"
 *    status?:     "AVAILABLE" | "BLOCKED" | "SPECIAL" | "CLOSED";
 *    adminNote?:  string | null;
 *  }
 *
 * NOTE on status mapping:
 *  The UI sends "AVAILABLE" for the normal open state.
 *  The Prisma SlotStatus enum stores this as "OPEN" (no AVAILABLE value exists).
 *  We map UI → DB here so the modal never needs to know about the internal enum name.
 *
 *  UI label   →  DB enum
 *  AVAILABLE  →  OPEN
 *  BLOCKED    →  BLOCKED  (isBlocked = true)
 *  SPECIAL    →  SPECIAL
 *  CLOSED     →  CLOSED   (isBlocked = true)
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/services/audit";

export const dynamic = "force-dynamic";

// ─── UI → DB enum mapping ──────────────────────────────────────────────────────
// The public/admin UI always calls regular available slots "AVAILABLE".
// The database SlotStatus enum calls it "OPEN".
// This mapping insulates the API surface from internal enum names.
const UI_TO_DB_STATUS: Record<string, string> = {
  AVAILABLE: "OPEN",
  BLOCKED:   "BLOCKED",
  SPECIAL:   "SPECIAL",
  CLOSED:    "CLOSED",
};

const VALID_UI_STATUSES = Object.keys(UI_TO_DB_STATUS); // ["AVAILABLE","BLOCKED","SPECIAL","CLOSED"]

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { id } = await params;

  // ── Parse body ────────────────────────────────────────────────────────────────
  let body: {
    maxCapacity?: number;
    startTime?: string;
    status?: string;
    adminNote?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { maxCapacity, startTime, status, adminNote } = body;

  // ── Load existing slot ────────────────────────────────────────────────────────
  const slot = await prisma.availabilitySlot.findUnique({ where: { id } });
  if (!slot) {
    return NextResponse.json({ error: "SLOT_NOT_FOUND" }, { status: 404 });
  }

  // ── Validate capacity ─────────────────────────────────────────────────────────
  const parsedCapacity = maxCapacity !== undefined ? parseInt(String(maxCapacity), 10) : undefined;
  if (parsedCapacity !== undefined) {
    if (isNaN(parsedCapacity) || parsedCapacity < 1) {
      return NextResponse.json({ error: "maxCapacity must be a positive integer" }, { status: 400 });
    }
    if (parsedCapacity < slot.bookedCount) {
      return NextResponse.json(
        {
          error: `Cannot reduce capacity to ${parsedCapacity} — ${slot.bookedCount} seat(s) already booked.`,
        },
        { status: 400 }
      );
    }
  }

  // ── Validate startTime ────────────────────────────────────────────────────────
  if (startTime !== undefined && !/^\d{2}:\d{2}$/.test(startTime)) {
    return NextResponse.json(
      { error: "Invalid startTime format — use HH:MM (e.g. 09:00)" },
      { status: 400 }
    );
  }

  // ── Validate and map status ───────────────────────────────────────────────────
  if (status !== undefined && !VALID_UI_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: `Invalid status "${status}". Must be one of: ${VALID_UI_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  // Map UI "AVAILABLE" → DB "OPEN"; everything else passes through as-is
  let dbStatus: string | undefined = undefined;
  if (status !== undefined) {
    dbStatus = UI_TO_DB_STATUS[status] || status;
    if (dbStatus === "AVAILABLE") {
      dbStatus = "OPEN";
    }
  }
  const isBlocked = status === "BLOCKED" || status === "CLOSED";

  // ── Build update payload (sparse — only include provided fields) ───────────────
  const updateData: Record<string, unknown> = {};

  if (parsedCapacity !== undefined) updateData.maxCapacity = parsedCapacity;
  if (startTime !== undefined)   updateData.startTime   = startTime;

  if (dbStatus !== undefined) {
    updateData.status    = dbStatus;
    updateData.isBlocked = isBlocked;
    // Set blockedReason when blocking; clear it when unblocking
    if (isBlocked) {
      updateData.blockedReason = adminNote ?? slot.blockedReason ?? "Admin blocked";
    } else {
      updateData.blockedReason = null;
    }
  }

  // adminNote is independently editable regardless of status
  if ("adminNote" in body) {
    updateData.adminNote = adminNote ?? null;
  }

  // ── Persist ───────────────────────────────────────────────────────────────────
  const before = {
    maxCapacity: slot.maxCapacity,
    startTime:   slot.startTime,
    status:      slot.status,
    isBlocked:   slot.isBlocked,
    adminNote:   slot.adminNote,
  };

  let updated: Awaited<ReturnType<typeof prisma.availabilitySlot.update>>;
  try {
    updated = await prisma.availabilitySlot.update({
      where: { id },
      data:  updateData,
    });
  } catch (prismaErr) {
    // Surface Prisma errors as readable JSON so the modal can display them
    const msg = prismaErr instanceof Error ? prismaErr.message : "Database error";
    console.error("[PATCH /api/admin/availability/:id] Prisma error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  // ── Audit ─────────────────────────────────────────────────────────────────────
  await logAudit({
    action:      "SLOT_UPDATED",
    actorEmail:  session.user?.email ?? "admin",
    description: `Slot ${slot.date.toISOString().slice(0, 10)} ${slot.startTime} updated (${Object.keys(updateData).join(", ")})`,
    before,
    after: {
      maxCapacity: updated.maxCapacity,
      startTime:   updated.startTime,
      status:      updated.status,
      isBlocked:   updated.isBlocked,
      adminNote:   updated.adminNote,
    },
  });

  // ── Respond ───────────────────────────────────────────────────────────────────
  // Serialise `updated` safely — Date fields must be strings for JSON transport
  return NextResponse.json({
    success: true,
    slot: {
      id:            updated.id,
      productId:     updated.productId,
      date:          updated.date.toISOString().slice(0, 10),
      startTime:     updated.startTime,
      maxCapacity:   updated.maxCapacity,
      bookedCount:   updated.bookedCount,
      status:        updated.status,
      isBlocked:     updated.isBlocked,
      blockedReason: updated.blockedReason,
      adminNote:     updated.adminNote,
      weatherNote:   updated.weatherNote,
      createdAt:     updated.createdAt.toISOString(),
      updatedAt:     updated.updatedAt.toISOString(),
    },
  });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { id } = await params;

  // Load existing slot
  const slot = await prisma.availabilitySlot.findUnique({ where: { id } });
  if (!slot) {
    return NextResponse.json({ error: "SLOT_NOT_FOUND" }, { status: 404 });
  }

  // Check bookedCount
  if (slot.bookedCount > 0) {
    return NextResponse.json(
      { error: "Cannot delete a slot with existing bookings." },
      { status: 400 }
    );
  }

  try {
    // Delete the slot
    await prisma.availabilitySlot.delete({
      where: { id },
    });
  } catch (prismaErr) {
    const msg = prismaErr instanceof Error ? prismaErr.message : "Database error";
    console.error("[DELETE /api/admin/availability/:id] Prisma error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  // Audit
  await logAudit({
    action:      "SLOT_UPDATED",
    actorEmail:  session.user?.email ?? "admin",
    description: `Deleted slot: ${slot.date.toISOString().slice(0, 10)} ${slot.startTime} (ID: ${slot.id})`,
    before: {
      productId:   slot.productId,
      date:        slot.date,
      startTime:   slot.startTime,
      maxCapacity: slot.maxCapacity,
      bookedCount: slot.bookedCount,
      status:      slot.status,
    },
    after: undefined,
  });

  return NextResponse.json({ success: true });
}


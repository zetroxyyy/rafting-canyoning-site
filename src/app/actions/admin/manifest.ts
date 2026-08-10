"use server";

/**
 * Manifest Engine Server Actions — STUB
 *
 * RaftAllocation and Guide models have been removed.
 * These stubs preserve the export surface to prevent import errors
 * in any remaining UI components.
 *
 * The manifest feature now uses the simple CSV export at
 * GET /api/admin/export/manifest instead.
 */

import { prisma } from "@/lib/prisma";

export type SlotManifest = {
  slotId: string;
  date: string;
  startTime: string;
  productName: string;
  activityType: string;
  participants: Array<{
    id: string;
    bookingId: string;
    bookingRef: string;
    firstName: string;
    lastName: string | null;
    participantType: string;
    age: number | null;
    medicalNotes: string | null;
  }>;
};

export async function getSlotManifest(slotId: string): Promise<SlotManifest | null> {
  const slot = await prisma.availabilitySlot.findUnique({
    where: { id: slotId },
    include: {
      product: { select: { nameEn: true, activityType: true } },
      bookings: {
        where: { status: { in: ["CONFIRMED", "PENDING", "CASH_DUE"] } },
        include: {
          participants: { orderBy: { sortOrder: "asc" } },
        },
      },
    },
  });

  if (!slot) return null;

  const participants = slot.bookings.flatMap((b) =>
    b.participants.map((p) => ({
      id:              p.id,
      bookingId:       p.bookingId,
      bookingRef:      b.reference,
      firstName:       p.firstName,
      lastName:        p.lastName,
      participantType: p.participantType as string,
      age:             p.age,
      medicalNotes:    p.medicalNotes,
    }))
  );

  return {
    slotId:       slot.id,
    date:         slot.date.toISOString().slice(0, 10),
    startTime:    slot.startTime,
    productName:  slot.product.nameEn,
    activityType: slot.product.activityType as string,
    participants,
  };
}

export async function ensureRaftAllocations(
  _slotId: string
): Promise<{ success: true } | { error: string }> {
  return { error: "Raft allocation feature has been removed. Use CSV export instead." };
}

export async function assignGuideToRaft(
  _raftAllocationId: string,
  _guideId: string | null
): Promise<{ success: true } | { error: string }> {
  return { error: "Raft allocation feature has been removed." };
}

export async function assignToRaft(
  _participantId: string,
  _raftAllocationId: string | null
): Promise<{ success: true } | { error: string }> {
  return { error: "Raft allocation feature has been removed." };
}

export async function clearRaftManifest(
  _slotId: string
): Promise<{ success: true } | { error: string }> {
  return { error: "Raft allocation feature has been removed." };
}

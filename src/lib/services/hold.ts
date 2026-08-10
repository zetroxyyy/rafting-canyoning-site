/**
 * Seat hold service.
 * Creates and releases short-duration seat holds for web booking flow.
 *
 * Capacity check + hold-create runs at SERIALIZABLE isolation to eliminate
 * the TOCTOU race: two concurrent createSeatHold calls for the same slot
 * cannot both pass the capacity check.
 */
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export const HOLD_DURATION_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Create a seat hold for a slot.
 * Returns the hold ID, or throws if not enough capacity.
 */
export async function createSeatHold(
  slotId: string,
  paxCount: number
): Promise<string> {
  const hold = await prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      const slot = await tx.availabilitySlot.findUnique({ where: { id: slotId } });

      if (!slot) throw new Error("SLOT_NOT_FOUND");
      if (slot.isBlocked || slot.status === "BLOCKED" || slot.status === "CLOSED") {
        throw new Error("SLOT_UNAVAILABLE");
      }

      const now = new Date();

      const activeHolds = await tx.seatHold.aggregate({
        where: { slotId, isReleased: false, expiresAt: { gt: now } },
        _sum: { paxCount: true },
      });
      const heldSeats      = activeHolds._sum.paxCount ?? 0;
      const availableSeats = slot.maxCapacity - slot.bookedCount - heldSeats;

      if (availableSeats < paxCount) throw new Error("SLOT_FULL");

      const expiresAt = new Date(Date.now() + HOLD_DURATION_MS);

      const newHold = await tx.seatHold.create({
        data: { slotId, paxCount, expiresAt },
      });

      return newHold;
    },
    { isolationLevel: "Serializable" }
  );

  return hold.id;
}

/**
 * Release a specific seat hold.
 */
export async function releaseSeatHold(holdId: string): Promise<void> {
  await prisma.seatHold.updateMany({
    where: { id: holdId, isReleased: false },
    data:  { isReleased: true },
  });
}

/**
 * Release all expired holds. Returns count of released holds.
 */
export async function releaseExpiredHolds(): Promise<number> {
  const result = await prisma.seatHold.updateMany({
    where: { isReleased: false, expiresAt: { lt: new Date() } },
    data:  { isReleased: true },
  });
  return result.count;
}

/**
 * Get effective availability for a slot, accounting for active holds.
 */
export async function getEffectiveAvailability(slotId: string): Promise<{
  maxCapacity: number;
  bookedCount: number;
  heldCount:   number;
  available:   number;
  isBlocked:   boolean;
}> {
  const slot = await prisma.availabilitySlot.findUnique({ where: { id: slotId } });

  if (!slot) {
    return { maxCapacity: 0, bookedCount: 0, heldCount: 0, available: 0, isBlocked: true };
  }

  const now = new Date();
  const activeHolds = await prisma.seatHold.aggregate({
    where: { slotId, isReleased: false, expiresAt: { gt: now } },
    _sum:  { paxCount: true },
  });

  const heldCount = activeHolds._sum.paxCount ?? 0;
  const available = Math.max(0, slot.maxCapacity - slot.bookedCount - heldCount);

  return {
    maxCapacity: slot.maxCapacity,
    bookedCount: slot.bookedCount,
    heldCount,
    available,
    isBlocked: slot.isBlocked,
  };
}

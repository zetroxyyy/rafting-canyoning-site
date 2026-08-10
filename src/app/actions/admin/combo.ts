"use server";

/**
 * Combo Scheduling Server Action
 *
 * scheduleComboBooking:
 *   Assigns a Rafting slot (slotId) AND a Canyoning slot (secondarySlotId)
 *   to an existing Combo Package booking, deducting capacity from BOTH slots
 *   inside a single atomic transaction. Status is set to CONFIRMED on success.
 *
 * getComboQueue:
 *   Fetches all unscheduled combo bookings (isCombo:true where slotId OR
 *   secondarySlotId is null) ordered by urgency (comboDate asc, createdAt asc).
 *
 * getSlotsByDateAndType:
 *   Returns available AvailabilitySlots for a given date and activityType,
 *   with live bookedCount/remaining. Used by the slot picker in the modal.
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/services/audit";
import { revalidatePath } from "next/cache";
import { triggerPostBookingNotifications } from "@/lib/services/booking";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ScheduleComboInput {
  bookingId: string;
  raftingSlotId: string;    // saved to slotId (primary)
  canyoningSlotId: string;  // saved to secondarySlotId
}

export interface ScheduleComboResult {
  success: boolean;
  error?: string;
}

export interface ComboQueueBooking {
  id: string;
  reference: string;
  leadName: string;
  leadEmail: string;
  leadPhone: string | null;
  adultCount: number;
  childCount: number;
  totalJpy: number;
  status: string;
  paymentStatus: string;
  comboDate: Date | null;
  slotId: string | null;
  secondarySlotId: string | null;
  adminNote: string | null;
  createdAt: Date;
  // relations
  slot: { date: Date; startTime: string; product: { nameEn: string } } | null;
  secondarySlot: { date: Date; startTime: string; product: { nameEn: string } } | null;
}

export interface SlotOption {
  id: string;
  startTime: string;
  maxCapacity: number;
  bookedCount: number;
  remaining: number;
  isBlocked: boolean;
  date: string; // YYYY-MM-DD
}

// ─── getComboQueue ─────────────────────────────────────────────────────────────

/**
 * Returns all unscheduled Combo Package bookings.
 * "Unscheduled" = isCombo:true AND (slotId IS NULL OR secondarySlotId IS NULL).
 * Orders by comboDate asc (most urgent first), then createdAt asc.
 */
export async function getComboQueue(): Promise<{
  bookings: ComboQueueBooking[];
  error?: string;
}> {
  const session = await auth();
  if (!session?.user?.email) return { bookings: [], error: "Unauthorized" };

  try {
    const bookings = await prisma.booking.findMany({
      where: {
        isCombo: true,
        status: { notIn: ["CANCELLED", "COMPLETED"] },
        OR: [
          { slotId: null },
          { secondarySlotId: null },
        ],
      },
      orderBy: [
        { comboDate: { sort: "asc", nulls: "last" } },
        { createdAt: "asc" },
      ],
      select: {
        id: true,
        reference: true,
        leadName: true,
        leadEmail: true,
        leadPhone: true,
        adultCount: true,
        childCount: true,
        totalJpy: true,
        status: true,
        paymentStatus: true,
        comboDate: true,
        slotId: true,
        secondarySlotId: true,
        adminNote: true,
        createdAt: true,
        slot: {
          select: {
            date: true,
            startTime: true,
            product: { select: { nameEn: true } },
          },
        },
        secondarySlot: {
          select: {
            date: true,
            startTime: true,
            product: { select: { nameEn: true } },
          },
        },
      },
    });

    return { bookings: bookings as unknown as ComboQueueBooking[] };
  } catch (err) {
    console.error("[getComboQueue]", err);
    return { bookings: [], error: "Failed to load combo queue." };
  }
}

// ─── getComboQueueCount ────────────────────────────────────────────────────────

/**
 * Returns the count of unscheduled combos — used for the sidebar badge.
 */
export async function getComboQueueCount(): Promise<number> {
  try {
    return await prisma.booking.count({
      where: {
        isCombo: true,
        status: { notIn: ["CANCELLED", "COMPLETED"] },
        OR: [
          { slotId: null },
          { secondarySlotId: null },
        ],
      },
    });
  } catch {
    return 0;
  }
}

// ─── getSlotsByDateAndType ─────────────────────────────────────────────────────

/**
 * Returns availability slots for a given date and activity type.
 * Used by the slot picker dropdowns in the Schedule Combo modal.
 */
export async function getSlotsByDateAndType(
  dateStr: string, // YYYY-MM-DD
  activityType: "RAFTING" | "CANYONING"
): Promise<{ slots: SlotOption[]; error?: string }> {
  const session = await auth();
  if (!session?.user?.email) return { slots: [], error: "Unauthorized" };

  try {
    const [year, month, day] = dateStr.split("-").map(Number);
    const dayStart = new Date(Date.UTC(year, month - 1, day));
    const dayEnd   = new Date(Date.UTC(year, month - 1, day + 1));

    const rawSlots = await prisma.availabilitySlot.findMany({
      where: {
        isBlocked: false,
        status: { in: ["OPEN", "SPECIAL"] },
        date: { gte: dayStart, lt: dayEnd },
        product: { activityType },
      },
      orderBy: { startTime: "asc" },
      select: {
        id: true,
        startTime: true,
        maxCapacity: true,
        bookedCount: true,
        isBlocked: true,
        date: true,
      },
    });

    const slots: SlotOption[] = rawSlots.map((s) => ({
      id: s.id,
      startTime: s.startTime,
      maxCapacity: s.maxCapacity,
      bookedCount: s.bookedCount,
      remaining: Math.max(0, s.maxCapacity - s.bookedCount),
      isBlocked: s.isBlocked,
      date: s.date.toISOString().slice(0, 10),
    }));

    return { slots };
  } catch (err) {
    console.error("[getSlotsByDateAndType]", err);
    return { slots: [], error: "Failed to load slots." };
  }
}

// ─── scheduleComboBooking ─────────────────────────────────────────────────────

/**
 * Atomically assigns a Rafting slot + Canyoning slot to a Combo booking
 * and deducts the pax count from BOTH slots using the strict capacity math:
 *
 *   newCount = Math.min(slot.maxCapacity, slot.bookedCount + paxCount)
 *
 * On success, the booking status is set to CONFIRMED.
 * Revalidates all affected admin routes.
 */
export async function scheduleComboBooking(
  input: ScheduleComboInput
): Promise<ScheduleComboResult> {
  // ── Auth guard ──────────────────────────────────────────────────────────────
  const session = await auth();
  if (!session?.user?.email) {
    return { success: false, error: "Unauthorized. Please sign in." };
  }

  const { bookingId, raftingSlotId, canyoningSlotId } = input;

  // ── Basic validation ────────────────────────────────────────────────────────
  if (!bookingId)       return { success: false, error: "bookingId is required." };
  if (!raftingSlotId)   return { success: false, error: "Rafting slot is required." };
  if (!canyoningSlotId) return { success: false, error: "Canyoning slot is required." };

  try {
    // ── Fetch the booking ───────────────────────────────────────────────────
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        reference: true,
        isCombo: true,
        status: true,
        adultCount: true,
        childCount: true,
        slotId: true,
        secondarySlotId: true,
      },
    });

    if (!booking) return { success: false, error: "Booking not found." };
    if (!booking.isCombo) return { success: false, error: "Booking is not a Combo Package." };
    if (booking.status === "CANCELLED") {
      return { success: false, error: "Cannot schedule a cancelled booking." };
    }

    const paxCount = booking.adultCount + booking.childCount;

    await prisma.$transaction(async (tx) => {
      // 0. Release old slot capacities if this combo was already scheduled
      if (booking.slotId) {
        const oldRaftingSlot = await tx.availabilitySlot.findUnique({
          where: { id: booking.slotId },
          select: { bookedCount: true },
        });
        if (oldRaftingSlot) {
          const oldRaftingCount = Math.max(0, oldRaftingSlot.bookedCount - paxCount);
          await tx.availabilitySlot.update({
            where: { id: booking.slotId },
            data: { bookedCount: { set: oldRaftingCount } },
          });
        }
      }

      if (booking.secondarySlotId) {
        const oldCanyoningSlot = await tx.availabilitySlot.findUnique({
          where: { id: booking.secondarySlotId },
          select: { bookedCount: true },
        });
        if (oldCanyoningSlot) {
          const oldCanyoningCount = Math.max(0, oldCanyoningSlot.bookedCount - paxCount);
          await tx.availabilitySlot.update({
            where: { id: booking.secondarySlotId },
            data: { bookedCount: { set: oldCanyoningCount } },
          });
        }
      }

      const raftingSlot = await tx.availabilitySlot.findUnique({
        where: { id: raftingSlotId },
        select: { id: true, maxCapacity: true, bookedCount: true, isBlocked: true, product: { select: { activityType: true } } },
      });

      if (!raftingSlot) throw new Error("Rafting slot not found.");
      if (raftingSlot.isBlocked) throw new Error("Rafting slot is blocked.");
      if (raftingSlot.product.activityType !== "RAFTING") {
        throw new Error("Selected Rafting slot does not belong to a Rafting product.");
      }

      // Strict capacity check — throw if the slot genuinely cannot accommodate paxCount.
      // Note: the modal UI disables full slots and shows a warning confirm() dialog,
      // so this throw is a server-side safety net for any bypass attempts.
      const raftingAvailable = raftingSlot.maxCapacity - raftingSlot.bookedCount;
      if (raftingAvailable < paxCount) {
        throw new Error(
          `RAFTING_SLOT_FULL: Only ${raftingAvailable} seat(s) available but booking requires ${paxCount}. Select a different Rafting slot.`
        );
      }

      const newRaftingCount = raftingSlot.bookedCount + paxCount;

      await tx.availabilitySlot.update({
        where: { id: raftingSlotId },
        data: { bookedCount: { set: newRaftingCount } },
      });

      // ── Lock and update CANYONING slot ────────────────────────────────────
      const canyoningSlot = await tx.availabilitySlot.findUnique({
        where: { id: canyoningSlotId },
        select: { id: true, maxCapacity: true, bookedCount: true, isBlocked: true, product: { select: { activityType: true } } },
      });

      if (!canyoningSlot) throw new Error("Canyoning slot not found.");
      if (canyoningSlot.isBlocked) throw new Error("Canyoning slot is blocked.");
      if (canyoningSlot.product.activityType !== "CANYONING") {
        throw new Error("Selected Canyoning slot does not belong to a Canyoning product.");
      }

      // Strict capacity check — same guard as Rafting
      const canyoningAvailable = canyoningSlot.maxCapacity - canyoningSlot.bookedCount;
      if (canyoningAvailable < paxCount) {
        throw new Error(
          `CANYONING_SLOT_FULL: Only ${canyoningAvailable} seat(s) available but booking requires ${paxCount}. Select a different Canyoning slot.`
        );
      }

      const newCanyoningCount = canyoningSlot.bookedCount + paxCount;

      await tx.availabilitySlot.update({
        where: { id: canyoningSlotId },
        data: { bookedCount: { set: newCanyoningCount } },
      });

      // ── Update the booking ────────────────────────────────────────────────
      await tx.booking.update({
        where: { id: bookingId },
        data: {
          slotId: raftingSlotId,
          secondarySlotId: canyoningSlotId,
          status: "CONFIRMED",
          confirmedAt: new Date(),
        },
      });
    });

    // ── Audit log ───────────────────────────────────────────────────────────
    await logAudit({
      bookingId,
      action: "BOOKING_CONFIRMED",
      actorEmail: session.user.email,
      description: `Combo Package scheduled: Rafting slot ${raftingSlotId} + Canyoning slot ${canyoningSlotId}. ${paxCount} pax deducted from both slots. Status → CONFIRMED.`,
      after: { slotId: raftingSlotId, secondarySlotId: canyoningSlotId, status: "CONFIRMED" },
    });

    // ── Revalidate ──────────────────────────────────────────────────────────
    revalidatePath("/admin");
    revalidatePath("/admin/combos");
    revalidatePath("/admin/bookings");
    revalidatePath("/admin/availability");

    await triggerPostBookingNotifications(bookingId).catch((e) => {
      console.error("[scheduleComboBooking] failed notifications trigger:", e);
    });

    return { success: true };
  } catch (err) {
    console.error("[scheduleComboBooking]", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "An unexpected error occurred.",
    };
  }
}

/**
 * Unschedule a Combo booking, restoring capacities and resetting slot fields.
 */
export async function sendBackToComboQueue(
  bookingId: string
): Promise<{ success: boolean; error?: string }> {
  // ── Auth guard ──────────────────────────────────────────────────────────────
  const session = await auth();
  if (!session?.user?.email) {
    return { success: false, error: "Unauthorized. Please sign in." };
  }

  if (!bookingId) {
    return { success: false, error: "bookingId is required." };
  }

  try {
    // ── Fetch the booking ───────────────────────────────────────────────────
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        reference: true,
        isCombo: true,
        status: true,
        adultCount: true,
        childCount: true,
        slotId: true,
        secondarySlotId: true,
      },
    });

    if (!booking) return { success: false, error: "Booking not found." };
    if (!booking.isCombo) return { success: false, error: "Booking is not a Combo Package." };
    if (booking.status === "CANCELLED") {
      return { success: false, error: "Cannot modify a cancelled booking." };
    }

    const paxCount = booking.adultCount + booking.childCount;

    await prisma.$transaction(async (tx) => {
      // 1. Restore capacity to Rafting slot (slotId)
      if (booking.slotId) {
        const slot = await tx.availabilitySlot.findUnique({
          where: { id: booking.slotId },
          select: { id: true, bookedCount: true },
        });
        if (slot) {
          const newCount = Math.max(0, slot.bookedCount - paxCount);
          await tx.availabilitySlot.update({
            where: { id: booking.slotId },
            data: { bookedCount: { set: newCount } },
          });
        }
      }

      // 2. Restore capacity to Canyoning slot (secondarySlotId)
      if (booking.secondarySlotId) {
        const secondarySlot = await tx.availabilitySlot.findUnique({
          where: { id: booking.secondarySlotId },
          select: { id: true, bookedCount: true },
        });
        if (secondarySlot) {
          const newCount = Math.max(0, secondarySlot.bookedCount - paxCount);
          await tx.availabilitySlot.update({
            where: { id: booking.secondarySlotId },
            data: { bookedCount: { set: newCount } },
          });
        }
      }

      // 3. Update the booking: clear slots and set status back to PENDING
      await tx.booking.update({
        where: { id: bookingId },
        data: {
          slotId: null,
          secondarySlotId: null,
          status: "PENDING",
        },
      });
    });

    // ── Audit log ───────────────────────────────────────────────────────────
    await logAudit({
      bookingId,
      action: "BOOKING_STATUS_CHANGED",
      actorEmail: session.user.email,
      description: `Sent Combo booking ${booking.reference} back to Combo Queue. Restored capacity for Rafting slot ${booking.slotId ?? "none"} and Canyoning slot ${booking.secondarySlotId ?? "none"}. Status → PENDING.`,
      before: { slotId: booking.slotId, secondarySlotId: booking.secondarySlotId, status: booking.status },
      after: { slotId: null, secondarySlotId: null, status: "PENDING" },
    });

    // ── Revalidate ──────────────────────────────────────────────────────────
    revalidatePath("/admin");
    revalidatePath("/admin/combos");
    revalidatePath("/admin/bookings");
    revalidatePath(`/admin/bookings/${bookingId}`);
    revalidatePath("/admin/availability");

    return { success: true };
  } catch (err) {
    console.error("[sendBackToComboQueue]", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "An unexpected error occurred.",
    };
  }
}

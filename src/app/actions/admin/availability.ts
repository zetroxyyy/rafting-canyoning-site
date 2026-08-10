"use server";

/**
 * Admin Server Actions — Availability Management
 *
 * createCustomSlot: creates a single AvailabilitySlot with custom
 * date, time, and capacity values. Used by the 'Create Custom Slot'
 * modal on the Bookings tab.
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/services/audit";
import { revalidatePath } from "next/cache";
import { CAPACITY } from "@/lib/utils";

// ─── getAvailableProducts ─────────────────────────────────────────────────────

export interface ProductOption {
  id: string;
  nameEn: string;
  activityType: "RAFTING" | "CANYONING";
  defaultCapacity: number;
}

/**
 * Returns all active products sorted by sortOrder.
 * Used by the Create Custom Slot modal to populate the Activity dropdown
 * and derive a smart default capacity.
 */
export async function getAvailableProducts(): Promise<{
  products: ProductOption[];
  error?: string;
}> {
  const session = await auth();
  if (!session?.user?.email) return { products: [], error: "Unauthorized" };

  try {
    const raw = await prisma.product.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, nameEn: true, activityType: true },
    });

    const products: ProductOption[] = raw.map((p) => ({
      id: p.id,
      nameEn: p.nameEn,
      activityType: p.activityType as "RAFTING" | "CANYONING",
      defaultCapacity:
        p.activityType === "CANYONING" ? CAPACITY.CANYONING : CAPACITY.RAFTING,
    }));

    return { products };
  } catch (err) {
    console.error("[getAvailableProducts]", err);
    return { products: [], error: "Failed to load products." };
  }
}


// ─── Input / Output types ─────────────────────────────────────────────────────

export interface CreateCustomSlotInput {
  productId: string;
  date: string;       // YYYY-MM-DD
  startTime: string;  // HH:mm (e.g. "09:00", "11:30", "13:30")
  maxCapacity: number;
}

export interface CreateCustomSlotResult {
  success: boolean;
  slotId?: string;
  error?: string;
}

// ─── Validation helpers ───────────────────────────────────────────────────────

const DATE_RE     = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE     = /^\d{2}:\d{2}$/;

function validateInput(input: CreateCustomSlotInput): string | null {
  if (!input.productId?.trim()) return "productId is required.";
  if (!DATE_RE.test(input.date))  return "date must be in YYYY-MM-DD format.";
  if (!TIME_RE.test(input.startTime)) return "startTime must be in HH:mm format.";
  if (
    isNaN(input.maxCapacity) ||
    !Number.isInteger(input.maxCapacity) ||
    input.maxCapacity < 1 ||
    input.maxCapacity > 500
  ) {
    return "maxCapacity must be a whole number between 1 and 500.";
  }
  return null;
}

// ─── createCustomSlot ─────────────────────────────────────────────────────────

/**
 * Creates a single AvailabilitySlot with the given custom values.
 *
 * - Defaults status to 'OPEN' (the enum value for an open, bookable slot).
 * - Uses an upsert so that running it twice on the same (product, date, time)
 *   combo is safe — the existing slot's maxCapacity will be updated rather
 *   than throwing a unique-constraint error.
 * - Revalidates all admin paths that display slot / booking data so the UI
 *   reflects the new slot without requiring a manual refresh.
 */
export async function createCustomSlot(
  input: CreateCustomSlotInput
): Promise<CreateCustomSlotResult> {
  // ── Auth guard ──────────────────────────────────────────────────────────────
  const session = await auth();
  if (!session?.user?.email) {
    return { success: false, error: "Unauthorized. Please sign in." };
  }

  // Sanitize startTime format (e.g. "9:00" -> "09:00")
  if (input.startTime) {
    const parts = input.startTime.trim().split(":");
    if (parts.length === 2) {
      input.startTime = `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`;
    }
  }

  // ── Input validation ────────────────────────────────────────────────────────
  const validationError = validateInput(input);
  if (validationError) {
    return { success: false, error: validationError };
  }

  const { productId, date, startTime, maxCapacity } = input;

  // ── Parse date to UTC midnight for the DB ───────────────────────────────────
  // The AvailabilitySlot.date column is @db.Date — Prisma expects a Date object
  // representing UTC midnight for the desired calendar day.
  const [year, month, day] = date.split("-").map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day));

  try {
    // ── Verify the product exists ───────────────────────────────────────────
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, nameEn: true, activityType: true },
    });

    if (!product) {
      return { success: false, error: `Product '${productId}' not found.` };
    }

    // ── Upsert the slot ─────────────────────────────────────────────────────
    // upsert instead of create so an admin can safely re-run the action for
    // the same (product, date, time) triple without getting a 409 error.
    const slot = await prisma.availabilitySlot.upsert({
      where: {
        productId_date_startTime: {
          productId,
          date: utcDate,
          startTime,
        },
      },
      create: {
        productId,
        date: utcDate,
        startTime,
        maxCapacity,
        status: "OPEN",
        isBlocked: false,
      },
      update: {
        maxCapacity,
        status: "OPEN",
        isBlocked: false,
      },
      select: { id: true },
    });

    // ── Audit log ───────────────────────────────────────────────────────────
    await logAudit({
      action: "SLOT_UPDATED",
      actorEmail: session.user.email,
      description: `Created custom slot: ${product.nameEn} on ${date} at ${startTime} (capacity: ${maxCapacity}) — slot ID: ${slot.id}`,
    });

    // ── Revalidate affected admin routes ────────────────────────────────────
    revalidatePath("/admin");
    revalidatePath("/admin/bookings");
    revalidatePath("/admin/availability");

    return { success: true, slotId: slot.id };
  } catch (err) {
    console.error("[createCustomSlot]", err);
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "An unexpected error occurred while creating the slot.",
    };
  }
}

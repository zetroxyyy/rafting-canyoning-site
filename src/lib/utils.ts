/**
 * Dream Adventure — Global Utility Functions & Hardcoded Business Constants
 *
 * All core operational values (times, capacities, pricing) are hardcoded here.
 * No database lookups for these values. Update this file to change business rules.
 */

// ─── Booking Reference ────────────────────────────────────────────────────────

/**
 * Generates a unique booking reference in the format DA-YYMMDD-XXXX
 * e.g. DA-240619-A3F9
 */
export function generateBookingReference(): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const rand = Math.random().toString(36).toUpperCase().slice(2, 6);
  return `DA-${yy}${mm}${dd}-${rand}`;
}

// ─── Currency Formatting ──────────────────────────────────────────────────────

/**
 * Format JPY amount — no decimals, ¥ prefix
 */
export function formatJpy(amount: number): string {
  return `¥${amount.toLocaleString("ja-JP")}`;
}

// ─── Date Utilities ───────────────────────────────────────────────────────────

/**
 * Convert a Date to a YYYY-MM-DD string in UTC
 */
export function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// ─── Hardcoded Departure Times ────────────────────────────────────────────────
//
// These are the ONLY valid departure times for the operation.
// Do NOT read from database — hardcoded for reliability and simplicity.

export const DEPARTURE_TIMES = ["09:00", "11:30", "13:30"] as const;
export type DepartureTime = (typeof DEPARTURE_TIMES)[number];

// ─── Hardcoded Slot Capacities ────────────────────────────────────────────────
//
// Maximum number of participants per activity per slot.
// Rafting:   21 guests per departure
// Canyoning: 35 guests per departure

export const CAPACITY = {
  RAFTING:   21,
  CANYONING: 35,
} as const;

/** @deprecated use CAPACITY.RAFTING instead */
export const RAFTING_MAX_CAPACITY = CAPACITY.RAFTING;

// ─── Hardcoded Pricing (JPY, tax-inclusive) ───────────────────────────────────
//
// All prices are fixed — no dynamic DB pricing lookups.
//
//   Rafting:       Adult ¥6,000 / Child ¥4,000
//   Canyoning:     Adult ¥6,000 / Child ¥4,000
//   Combo Package: Adult ¥10,000 / Child ¥6,000

export const PRICING = {
  RAFTING_ADULT:    6000,
  RAFTING_CHILD:    4000,
  CANYONING_ADULT:  6000,
  CANYONING_CHILD:  4000,
  COMBO_ADULT:      10000,
  COMBO_CHILD:      6000,
} as const;

// ─── calcSubtotal ─────────────────────────────────────────────────────────────
//
// Computes the booking subtotal from hardcoded pricing.
// Supports Rafting, Canyoning, and Combo Package activity types.

export function calcSubtotal({
  activityType,
  adultCount,
  childCount,
}: {
  activityType: "RAFTING" | "CANYONING" | "COMBO";
  adultCount: number;
  childCount: number;
}): number {
  let adultRate: number;
  let childRate: number;

  if (activityType === "COMBO") {
    adultRate = PRICING.COMBO_ADULT;
    childRate = PRICING.COMBO_CHILD;
  } else if (activityType === "CANYONING") {
    adultRate = PRICING.CANYONING_ADULT;
    childRate = PRICING.CANYONING_CHILD;
  } else {
    adultRate = PRICING.RAFTING_ADULT;
    childRate = PRICING.RAFTING_CHILD;
  }

  return adultCount * adultRate + childCount * childRate;
}

// ─── Apply Promo ──────────────────────────────────────────────────────────────

export function applyPromo(
  subtotal: number,
  promo: { type: "PERCENT" | "FIXED"; value: number } | null
): { discount: number; total: number } {
  if (!promo) return { discount: 0, total: subtotal };

  const discount =
    promo.type === "PERCENT"
      ? Math.floor((subtotal * promo.value) / 100)
      : Math.min(promo.value, subtotal);

  return { discount, total: subtotal - discount };
}

// ─── Clamp ────────────────────────────────────────────────────────────────────

/**
 * Clamp a number between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// ─── Payment Status Constants ─────────────────────────────────────────────────
//
// The only two payment states used in the system.

export const PAYMENT_STATUSES = ["PAID", "PENDING"] as const;
export type PaymentStatusValue = (typeof PAYMENT_STATUSES)[number];

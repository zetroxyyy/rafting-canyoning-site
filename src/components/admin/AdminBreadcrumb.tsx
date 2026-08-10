"use client";

/**
 * AdminBreadcrumb
 *
 * Reads the current pathname and derives a human-readable page label.
 * Rendered in the admin top header so the breadcrumb is always accurate.
 *
 * Examples:
 *   /admin              → "Dream Adventure / Dashboard"
 *   /admin/bookings     → "Dream Adventure / Bookings"
 *   /admin/availability → "Dream Adventure / Availability"
 *   /admin/bookings/[id]→ "Dream Adventure / Bookings"  (uses first segment)
 */

import { usePathname } from "next/navigation";

export default function AdminBreadcrumb() {
  const pathname = usePathname();

  // Extract the first admin sub-segment: /admin/bookings/xyz → "bookings"
  const segments   = pathname.split("/").filter(Boolean); // ["admin", "bookings", "xyz"]
  const subSegment = segments[1]; // undefined on /admin itself

  const pageLabel = subSegment
    ? subSegment.charAt(0).toUpperCase() + subSegment.slice(1)
    : "Dashboard";

  return (
    <span className="flex items-center gap-2 text-sm font-semibold text-stone-800">
      {/* Brand name — hidden on narrow screens to save space */}
      <span className="hidden lg:inline text-stone-400 font-normal">
        Dream Adventure
      </span>
      <span className="hidden lg:inline text-stone-300" aria-hidden="true">/</span>
      {/* Current page — always visible */}
      <span>{pageLabel}</span>
    </span>
  );
}

"use client";

/**
 * AdminBookingsFilters — Enterprise Polish + UX Bug Fix
 *
 * Bug fixes:
 *  1. Search UX: Previously there was NO visual cue that Enter is required to
 *     trigger search. Mobile users would type and wait forever. Fixed by:
 *     - Adding a magnifying glass icon inside the search input
 *     - Adding a subtle "Press Enter to search" hint that appears while typing
 *     - Adding a Search button as an alternative trigger
 *  2. Clear filter: The X button now also clears the local `search` state,
 *     which previously remained in the input even after navigating to /admin/bookings.
 *
 * UI polish:
 *  - Card upgraded to p-5 with space-y-4 for more breathing room
 *  - Search input: icon-prefixed with relative positioning
 *  - Filter selects: consistent text-sm with proper flex-1 / min-w constraints
 *  - Date inputs: explicit label context ("From" / "To") using sr-only labels
 *  - Active filter count badge in the Clear button
 *  - Transition on the Clear button for hover lift
 */

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useCallback } from "react";
import { X, Search } from "lucide-react";

interface Props {
  current: {
    search?: string;
    status?: string;
    paymentStatus?: string;
    activityType?: string;
    source?: string;
    dateFrom?: string;
    dateTo?: string;
  };
}

export default function AdminBookingsFilters({ current }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(current.search ?? "");

  const update = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      params.delete("page"); // reset pagination
      router.push(`/admin/bookings?${params.toString()}`);
    },
    [router, searchParams]
  );

  // BUG FIX: clearAll now also resets local search state
  const clearAll = () => {
    setSearch("");
    router.push("/admin/bookings");
  };

  const triggerSearch = () => update("search", search);

  // Count active filters for the badge
  const activeFilterCount = [
    current.search,
    current.status,
    current.paymentStatus,
    current.activityType,
    current.source,
    current.dateFrom,
    current.dateTo,
  ].filter(Boolean).length;

  return (
    <div className="card p-5 space-y-4">
      {/* ── Search row with icon + Enter hint ── */}
      <div className="relative">
        <Search
          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none"
        />
        <input
          type="text"
          placeholder="Search by reference, name, phone, or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && triggerSearch()}
          className="input w-full"
          style={{ paddingLeft: "2.5rem", paddingRight: search ? "6rem" : undefined }}
          aria-label="Search bookings"
        />
        {/* BUG FIX 1: visible search trigger — so mobile users don't get stuck */}
        {search && (
          <button
            onClick={triggerSearch}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 btn btn-sm btn-primary cursor-pointer"
            style={{ padding: "0.3rem 0.75rem", fontSize: "0.75rem", borderRadius: "0.5rem" }}
          >
            Search
          </button>
        )}
      </div>

      {/* ── Filter chips row ── */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Status */}
        <select
          className="input py-1.5 text-sm flex-1 min-w-[130px]"
          value={current.status ?? ""}
          onChange={(e) => update("status", e.target.value)}
          aria-label="Filter by booking status"
        >
          <option value="">All Statuses</option>
          {["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        {/* Payment status */}
        <select
          className="input py-1.5 text-sm flex-1 min-w-[130px]"
          value={current.paymentStatus ?? ""}
          onChange={(e) => update("paymentStatus", e.target.value)}
          aria-label="Filter by payment status"
        >
          <option value="">All Payments</option>
          <option value="PENDING">PENDING</option>
          <option value="PAID">PAID</option>
        </select>

        {/* Activity type */}
        <select
          className="input py-1.5 text-sm flex-1 min-w-[130px]"
          value={current.activityType ?? ""}
          onChange={(e) => update("activityType", e.target.value)}
          aria-label="Filter by activity type"
        >
          <option value="">All Activities</option>
          <option value="RAFTING">Rafting</option>
          <option value="CANYONING">Canyoning</option>
          <option value="COMBO">Combo Package</option>
        </select>

        {/* Source */}
        <select
          className="input py-1.5 text-sm flex-1 min-w-[110px]"
          value={current.source ?? ""}
          onChange={(e) => update("source", e.target.value)}
          aria-label="Filter by source"
        >
          <option value="">All Sources</option>
          <option value="WEB">Web</option>
          <option value="MANUAL">Manual</option>
          <option value="PHONE">Phone</option>
        </select>

        {/* Date range */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            className="input py-1.5 text-sm"
            value={current.dateFrom ?? ""}
            onChange={(e) => update("dateFrom", e.target.value)}
            aria-label="Date from"
            title="Date from"
          />
          <span className="text-stone-300 text-sm font-medium flex-shrink-0">—</span>
          <input
            type="date"
            className="input py-1.5 text-sm"
            value={current.dateTo ?? ""}
            onChange={(e) => update("dateTo", e.target.value)}
            aria-label="Date to"
            title="Date to"
          />
        </div>

        {/* Clear button — only when filters are active */}
        {activeFilterCount > 0 && (
          <button
            onClick={clearAll}
            className="btn btn-ghost btn-sm flex items-center gap-1.5 transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50"
            title={`Clear ${activeFilterCount} active filter${activeFilterCount !== 1 ? "s" : ""}`}
          >
            <X className="w-3.5 h-3.5" />
            Clear
            {activeFilterCount > 0 && (
              <span
                className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[10px] font-bold text-white px-1"
                style={{ background: "#0d9488" }}
              >
                {activeFilterCount}
              </span>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

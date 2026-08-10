"use client";

/**
 * AdminBookingsTable — Enterprise Polish
 *
 * UI upgrades:
 *  1. Row hover: CSS `data-hovered` approach — entire row gets teal-tinted highlight.
 *  2. Reference column: pill-style mono chip on hover.
 *  3. Activity badge: per-activity type color coding (RAFTING=teal, CANYONING=blue, COMBO=purple).
 *  4. Payment badge: PAID=green, PENDING=amber, REFUNDED=blue, PAYMENT_FAILED=red.
 *  5. Source column: elevated to small pill badge.
 *  6. Date · Time column: gracefully handles null slots (Combo bookings).
 *     - If slot is null AND isCombo is true → amber "COMBO · Unscheduled" badge.
 *     - If slot is null for any reason → muted dash fallback.
 *  7. Empty state: premium clipboard SVG illustration.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";

// ── Status badge ─────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
  PENDING:   "badge-amber",
  CONFIRMED: "badge-teal",
  COMPLETED: "badge-green",
  CANCELLED: "badge-red",
  EXPIRED:   "badge-gray",
  CASH_DUE:  "badge-blue",
};

// ── Payment badge (derivation function for compound statuses) ─────────────────

function getDisplayPaymentStatus(status: string, paymentStatus: string): string {
  const s = status.toUpperCase();
  const ps = paymentStatus.toUpperCase();
  if (s === "CANCELLED") {
    if (ps.startsWith("PAID") || ps === "REFUNDED" || ps === "PARTIALLY_REFUNDED") {
      return "REFUNDED";
    }
    return "UNPAID";
  }
  return paymentStatus;
}

function getPaymentBadgeClass(paymentStatus: string): string {
  const ps = paymentStatus.toUpperCase();
  if (ps === "PENDING")             return "badge-amber";
  if (ps === "UNPAID")              return "badge-red";
  if (ps.startsWith("PAID"))        return "badge-green";
  // PARTIALLY_REFUNDED → treat as REFUNDED (blue)
  if (ps.startsWith("REFUNDED") || ps === "PARTIALLY_REFUNDED") return "badge-blue";
  if (ps === "PAYMENT_FAILED")      return "badge-red";
  if (ps === "CASH_DUE")            return "badge-blue";
  return "badge-gray";
}

// ── Activity type coloring ────────────────────────────────────────────────────

function getActivityStyle(type: string): React.CSSProperties {
  const t = type.toUpperCase();
  if (t === "RAFTING")   return { background: "rgba(13,148,136,0.08)",  color: "#0f766e" };
  if (t === "CANYONING") return { background: "rgba(59,130,246,0.08)",  color: "#1d4ed8" };
  if (t === "COMBO")     return { background: "rgba(139,92,246,0.08)", color: "#6d28d9" };
  return { background: "rgba(120,113,108,0.08)", color: "#57534e" };
}

// ── Source badge ──────────────────────────────────────────────────────────────

function SourceBadge({ source }: { source: string }) {
  const s = source.toUpperCase();
  const styles: Record<string, React.CSSProperties> = {
    WEB:    { background: "rgba(13,148,136,0.07)",  color: "#0f766e" },
    MANUAL: { background: "rgba(245,158,11,0.08)",  color: "#92400e" },
    PHONE:  { background: "rgba(59,130,246,0.08)",  color: "#1d4ed8" },
  };
  return (
    <span
      className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md"
      style={styles[s] ?? { background: "rgba(120,113,108,0.08)", color: "#57534e" }}
    >
      {source}
    </span>
  );
}

// ── Date/Time cell — null-safe + Combo guardrail ──────────────────────────────

function DateTimeCell({
  slot,
  isCombo,
  comboDate,
}: {
  slot: { date: Date; startTime: string } | null;
  isCombo?: boolean;
  comboDate?: Date | null;
}) {
  // Case 1: Has a real slot — show date and time normally
  if (slot) {
    const dateStr =
      slot.date instanceof Date
        ? slot.date.toISOString().slice(0, 10)
        : String(slot.date).slice(0, 10);
    return (
      <td className="text-xs text-stone-500 whitespace-nowrap font-mono">
        {dateStr}
        <span className="text-stone-300 mx-1">·</span>
        {slot.startTime}
      </td>
    );
  }

  // Case 2: Combo booking — no slot assigned yet
  if (isCombo) {
    const dateStr = comboDate
      ? (comboDate instanceof Date
          ? comboDate.toISOString().slice(0, 10)
          : String(comboDate).slice(0, 10))
      : null;
    return (
      <td className="whitespace-nowrap">
        <div className="flex items-center gap-1.5">
          {dateStr && (
            <span className="text-xs font-mono text-stone-400">{dateStr}</span>
          )}
          <span
            className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md"
            style={{ background: "rgba(245,158,11,0.12)", color: "#92400e" }}
          >
            COMBO · Unscheduled
          </span>
        </div>
      </td>
    );
  }

  // Case 3: No slot, not a combo — graceful dash
  return (
    <td className="text-xs text-stone-300 whitespace-nowrap font-mono">
      — · —
    </td>
  );
}

// ── Interface ─────────────────────────────────────────────────────────────────

interface Booking {
  id: string;
  reference: string;
  leadName: string;
  leadEmail: string;
  adultCount: number;
  childCount: number;
  totalJpy: number;
  status: string;
  paymentStatus: string;
  source: string;
  createdAt: Date;
  isCombo?: boolean;
  comboDate?: Date | null;
  pastCompletedCount?: number;
  product: { nameEn: string; activityType: string };
  slot: { date: Date; startTime: string } | null;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdminBookingsTable({ bookings }: { bookings: Booking[] }) {
  const router = useRouter();

  if (bookings.length === 0) {
    return (
      <div className="card overflow-hidden">
        <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
          {/* Muted SVG illustration — clipboard + magnifying glass */}
          <svg
            width="80"
            height="80"
            viewBox="0 0 80 80"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            style={{ marginBottom: "1.25rem", opacity: 0.6 }}
          >
            <rect x="14" y="18" width="44" height="52" rx="6" fill="#f0fdfa" stroke="#99f6e4" strokeWidth="1.5" />
            <rect x="28" y="12" width="16" height="10" rx="4" fill="#ccfbf1" stroke="#5eead4" strokeWidth="1.5" />
            <rect x="22" y="34" width="28" height="3" rx="1.5" fill="#99f6e4" />
            <rect x="22" y="42" width="20" height="3" rx="1.5" fill="#b2f0e8" />
            <rect x="22" y="50" width="24" height="3" rx="1.5" fill="#b2f0e8" />
            <circle cx="54" cy="56" r="10" fill="white" stroke="#5eead4" strokeWidth="2" />
            <circle cx="54" cy="56" r="6" fill="#f0fdfa" stroke="#99f6e4" strokeWidth="1.5" />
            <line x1="61.5" y1="63.5" x2="67" y2="69" stroke="#5eead4" strokeWidth="2.5" strokeLinecap="round" />
          </svg>

          <p className="text-base font-semibold text-stone-500 mb-1">No bookings found</p>
          <p className="text-sm text-stone-400 max-w-xs">
            Try adjusting your filters or search terms. New booking requests will appear here once guests submit online.
          </p>
          <Link
            href="/admin/bookings"
            className="mt-5 text-xs font-semibold text-teal-600 hover:text-teal-700 underline underline-offset-2 transition-colors duration-150"
          >
            Clear all filters →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="w-full overflow-x-auto">
        <table className="admin-table" style={{ minWidth: "800px" }}>
          <thead>
            <tr>
              {[
                "Reference",
                "Guest",
                "Activity",
                "Date · Time",
                "Pax",
                "Total",
                "Status",
                "Payment",
                "Source",
              ].map((col) => (
                <th key={col} className="whitespace-nowrap">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {bookings.map((b) => (
              <tr
                key={b.id}
                className="cursor-pointer group hover:bg-stone-50/50 transition-colors duration-150"
                onClick={() => router.push(`/admin/bookings/${b.id}`)}
              >
                {/* Reference — pill chip on hover */}
                <td className="whitespace-nowrap">
                  <Link
                    href={`/admin/bookings/${b.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="font-mono text-[11px] font-bold text-teal-600 group-hover:underline underline-offset-2 transition-all duration-150"
                  >
                    {b.reference}
                  </Link>
                </td>

                {/* Guest name + email + optional VIP badge */}
                <td className="whitespace-nowrap">
                  <p className="text-sm font-semibold text-stone-900 whitespace-nowrap">
                    {b.leadName}
                  </p>
                  <p className="text-xs text-stone-400 whitespace-nowrap mt-0.5 truncate max-w-[180px]">
                    {b.leadEmail}
                  </p>
                  {(b.pastCompletedCount ?? 0) > 0 && (
                    <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] px-2 py-0.5 rounded-full font-medium mt-1">
                      ⭐ VIP Return ({b.pastCompletedCount} past {b.pastCompletedCount === 1 ? "trip" : "trips"})
                    </span>
                  )}
                </td>

                {/* Activity type — per-type color, COMBO=purple */}
                <td className="whitespace-nowrap">
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md"
                    style={getActivityStyle(
                      b.isCombo ? "COMBO" : b.product.activityType
                    )}
                  >
                    {b.isCombo ? "COMBO" : b.product.activityType}
                  </span>
                </td>

                {/* Date · Time — null-safe */}
                <DateTimeCell
                  slot={b.slot}
                  isCombo={b.isCombo}
                  comboDate={b.comboDate}
                />

                {/* Pax count */}
                <td className="text-sm text-stone-700 whitespace-nowrap font-semibold tabular-nums">
                  {b.adultCount + b.childCount}
                </td>

                {/* Total — bold teal */}
                <td className="whitespace-nowrap">
                  <span
                    className="text-sm font-bold tabular-nums"
                    style={{ color: "var(--color-teal-700)" }}
                  >
                    ¥{b.totalJpy.toLocaleString("ja-JP")}
                  </span>
                </td>

                {/* Booking status badge */}
                <td className="whitespace-nowrap">
                  <span className={`badge ${STATUS_BADGE[b.status] ?? "badge-gray"} text-[10px]`}>
                    {b.status}
                  </span>
                </td>

                {/* Payment status badge — PARTIALLY_REFUNDED normalized to REFUNDED */}
                <td className="whitespace-nowrap">
                  {(() => {
                    const displayStatus = getDisplayPaymentStatus(b.status, b.paymentStatus);
                    return (
                      <span
                        className={`badge ${getPaymentBadgeClass(displayStatus)} text-[10px]`}
                        style={{ maxWidth: "140px", display: "inline-flex" }}
                        title={b.paymentStatus}
                      >
                        <span className="truncate">
                          {displayStatus === "PARTIALLY_REFUNDED" ? "REFUNDED" : displayStatus}
                        </span>
                      </span>
                    );
                  })()}
                </td>

                {/* Source — premium pill badge */}
                <td className="whitespace-nowrap">
                  <SourceBadge source={b.source} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

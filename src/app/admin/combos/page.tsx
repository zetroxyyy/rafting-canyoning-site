/**
 * /admin/combos — Combo Package Queue
 *
 * Displays all unscheduled Combo Package bookings in priority order.
 * Admins schedule each booking by assigning a Rafting slot (slotId)
 * and a Canyoning slot (secondarySlotId), which atomically deducts
 * capacity from both slots and sets the booking to CONFIRMED.
 */

import { getComboQueue } from "@/app/actions/admin/combo";
import ComboQueueClient from "@/components/admin/ComboQueueClient";
import { Waves, Mountain, CalendarSearch, AlertTriangle } from "lucide-react";
import AutoMarkRead from "@/components/admin/AutoMarkRead";

export const metadata = {
  title: "Combo Queue | Dream Adventure Admin",
  description: "Schedule unscheduled Combo Package bookings",
};

export default async function AdminCombosPage() {
  const { bookings, error } = await getComboQueue();

  const urgentCount = bookings.filter((b) => {
    if (!b.comboDate) return false;
    const days = Math.ceil(
      // eslint-disable-next-line react-hooks/purity
      (new Date(b.comboDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return days <= 2;
  }).length;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Auto-mark relevant notifications read */}
      <AutoMarkRead category="bookings" />

      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {/* Combo icon */}
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, #f0fdf9 0%, #f5f3ff 100%)",
                border: "1px solid rgba(13,148,136,0.2)",
              }}
            >
              <Waves className="w-4 h-4 text-teal-600 absolute -translate-x-0.5" />
              <Mountain className="w-4 h-4 text-violet-600 absolute translate-x-0.5" />
            </div>

            <h1 className="text-xl font-bold text-stone-900">Combo Queue</h1>

            {bookings.length > 0 && (
              <span
                className="ml-1 inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-sm font-bold"
                style={{
                  background: urgentCount > 0
                    ? "linear-gradient(135deg, #ef4444 0%, #f97316 100%)"
                    : "linear-gradient(135deg, #0d9488 0%, #6d28d9 100%)",
                  color: "white",
                  minWidth: "1.75rem",
                }}
              >
                {bookings.length}
              </span>
            )}
          </div>
          <p className="text-sm text-stone-500">
            {bookings.length === 0
              ? "All Combo Packages have been scheduled."
              : `${bookings.length} Combo Package${bookings.length !== 1 ? "s" : ""} awaiting slot assignment.`}
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs text-stone-400 flex-shrink-0 flex-wrap">
          <span className="flex items-center gap-1">
            <Waves className="w-3.5 h-3.5 text-teal-500" />
            Rafting slot
          </span>
          <span className="flex items-center gap-1">
            <Mountain className="w-3.5 h-3.5 text-violet-500" />
            Canyoning slot
          </span>
          <span className="flex items-center gap-1">
            <CalendarSearch className="w-3.5 h-3.5 text-amber-500" />
            Guest-requested date
          </span>
        </div>
      </div>

      {/* ── Urgent alert banner ───────────────────────────────────────────── */}
      {urgentCount > 0 && (
        <div
          className="flex items-start gap-3 rounded-2xl px-5 py-4"
          style={{
            background: "linear-gradient(135deg, #fff7ed 0%, #fef2f2 100%)",
            border: "1px solid rgba(249,115,22,0.3)",
          }}
        >
          <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-stone-800 text-sm">
              {urgentCount} booking{urgentCount !== 1 ? "s" : ""} require immediate attention
            </p>
            <p className="text-xs text-stone-500 mt-0.5">
              {urgentCount} Combo Package{urgentCount !== 1 ? "s" : ""} with activity date within 48 hours
              {urgentCount !== 1 ? " have" : " has"} not been scheduled yet. Call the guest now.
            </p>
          </div>
        </div>
      )}

      {/* ── Error state ───────────────────────────────────────────────────── */}
      {error && (
        <div className="rounded-2xl px-5 py-4 bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ── Booking instructions ──────────────────────────────────────────── */}
      {bookings.length > 0 && (
        <div
          className="rounded-2xl px-5 py-4 text-sm"
          style={{
            background: "linear-gradient(135deg, #f8faf9 0%, #f5f3ff 100%)",
            border: "1px solid rgba(0,0,0,0.06)",
          }}
        >
          <p className="font-semibold text-stone-700 mb-1">How to schedule a Combo Package</p>
          <ol className="list-decimal list-inside space-y-1 text-stone-500 text-xs">
            <li>Call the guest to confirm their preferred date.</li>
            <li>Click <strong className="text-stone-600">Schedule</strong> on their booking card.</li>
            <li>Choose a Rafting slot and a Canyoning slot for the activity date.</li>
            <li>Click <strong className="text-stone-600">Schedule &amp; Confirm</strong> — both slots are locked instantly and the booking becomes <span className="text-teal-600 font-semibold">CONFIRMED</span>.</li>
          </ol>
        </div>
      )}

      {/* ── Queue ─────────────────────────────────────────────────────────── */}
      <ComboQueueClient bookings={bookings} />
    </div>
  );
}

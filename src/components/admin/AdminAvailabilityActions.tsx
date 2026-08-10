"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

interface Props {
  productId: string;
  activityType?: "RAFTING" | "CANYONING";
  year: number;
  month: number;
}

export default function AdminAvailabilityActions({ productId, activityType, year, month }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const call = async (body: object) => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/admin/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      setSuccess(data.message ?? "Done!");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  // ── Smart current-month generation state ──────────────────────────────────
  //
  // If the selected month == today's month, we show a notice and the API will
  // skip past dates automatically. The label reflects this.
  //
  const today = new Date();
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth() + 1; // 1-indexed
  const todayDate = today.getDate();
  const isCurrentMonth = year === todayYear && month === todayMonth;
  const daysInMonth = new Date(year, month, 0).getDate();

  // Days that will actually be generated (today onward for current month)
  const generationStart = isCurrentMonth ? todayDate : 1;
  const daysToGenerate = daysInMonth - generationStart + 1;

  const monthLabel = new Date(year, month - 1).toLocaleString("en", { month: "long" });

  const [blockStart, setBlockStart] = useState(
    `${year}-${String(month).padStart(2, "0")}-01`
  );
  const [blockEnd, setBlockEnd] = useState(
    `${year}-${String(month).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`
  );
  const [blockReason, setBlockReason] = useState("");
  const [capacity, setCapacity] = useState(activityType === "CANYONING" ? "35" : "21");
  const [times, setTimes] = useState("09:00,11:30,13:30");

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
      {success && <p className="text-sm text-teal-600 bg-teal-50 p-3 rounded-lg">{success}</p>}
      {loading && (
        <div className="flex items-center gap-2 text-sm text-stone-500">
          <Loader2 className="w-4 h-4 animate-spin" /> Processing...
        </div>
      )}

      {/* ── Generate Slots ───────────────────────────────────────────────── */}
      <div className="card p-4">
        <p className="text-xs font-semibold text-stone-500 uppercase mb-1">Generate Slots</p>

        {isCurrentMonth ? (
          <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 mb-3">
            <strong>Current month selected.</strong> Past dates (1–{todayDate - 1}) will be
            skipped. Generating {daysToGenerate} day{daysToGenerate !== 1 ? "s" : ""} from
            today ({todayDate} {monthLabel}).
          </div>
        ) : (
          <p className="text-xs text-stone-500 mb-3">
            Create default time slots for the whole month if missing. Existing slots are not overwritten.
          </p>
        )}

        <div className="space-y-2">
          <div>
            <label className="text-xs text-stone-500 mb-1 block">Capacity per slot</label>
            <input
              type="number"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              className="input text-sm py-1.5 w-full"
              min={1}
              max={200}
            />
          </div>
          <div>
            <label className="text-xs text-stone-500 mb-1 block">
              Start times (comma-separated, 24h format)
            </label>
            <input
              type="text"
              value={times}
              onChange={(e) => setTimes(e.target.value)}
              className="input text-sm py-1.5 w-full font-mono"
              placeholder="09:00,11:30,13:30"
            />
          </div>
          <button
            onClick={() =>
              call({
                action: "ENSURE_MONTH",
                productId,
                year,
                month,
                maxCapacity: parseInt(capacity),
                startTimes: times.split(",").map((t) => t.trim()).filter(Boolean),
                // fromDay tells API to skip days before this (1 = whole month)
                fromDay: generationStart,
              })
            }
            disabled={loading}
            className="btn btn-outline btn-sm w-full"
          >
            Generate for {isCurrentMonth ? `Today – End of ${monthLabel}` : `${monthLabel} ${year}`}
          </button>
        </div>
      </div>

      {/* ── Block Date Range ─────────────────────────────────────────────── */}
      <div className="card p-4">
        <p className="text-xs font-semibold text-stone-500 uppercase mb-3">Block Date Range</p>
        <div className="space-y-2">
          <input
            type="date"
            value={blockStart}
            onChange={(e) => setBlockStart(e.target.value)}
            className="input text-sm py-1.5 w-full"
          />
          <input
            type="date"
            value={blockEnd}
            onChange={(e) => setBlockEnd(e.target.value)}
            className="input text-sm py-1.5 w-full"
          />
          <input
            type="text"
            placeholder="Reason (e.g. Bad weather, Staff training)"
            value={blockReason}
            onChange={(e) => setBlockReason(e.target.value)}
            className="input text-sm py-1.5 w-full"
          />
          <button
            onClick={() =>
              call({
                action: "BLOCK_RANGE",
                productId,
                startDate: blockStart,
                endDate: blockEnd,
                reason: blockReason,
              })
            }
            disabled={loading || !blockStart || !blockEnd}
            className="btn btn-outline btn-sm w-full text-red-600"
          >
            Block Range
          </button>
        </div>
      </div>

      {/* ── Unblock Date Range ───────────────────────────────────────────── */}
      <div className="card p-4">
        <p className="text-xs font-semibold text-stone-500 uppercase mb-3">Unblock Date Range</p>
        <div className="space-y-2">
          <input
            type="date"
            value={blockStart}
            onChange={(e) => setBlockStart(e.target.value)}
            className="input text-sm py-1.5 w-full"
          />
          <input
            type="date"
            value={blockEnd}
            onChange={(e) => setBlockEnd(e.target.value)}
            className="input text-sm py-1.5 w-full"
          />
          <button
            onClick={() =>
              call({
                action: "UNBLOCK_RANGE",
                productId,
                startDate: blockStart,
                endDate: blockEnd,
              })
            }
            disabled={loading || !blockStart || !blockEnd}
            className="btn btn-outline btn-sm w-full text-teal-600"
          >
            Unblock Range
          </button>
        </div>
      </div>
    </div>
  );
}

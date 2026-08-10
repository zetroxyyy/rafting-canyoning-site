"use client";

/**
 * ComboScheduleModal
 *
 * Premium modal for the Combo Queue page. Admin selects:
 *   1. A date (defaults to comboDate if present)
 *   2. A Rafting slot for that date  → saved as slotId
 *   3. A Canyoning slot for that date → saved as secondarySlotId
 *
 * On submit, calls scheduleComboBooking server action which atomically
 * deducts capacity from both slots and sets status → CONFIRMED.
 */

import { useState, useTransition, useEffect, useCallback } from "react";
import { X, Loader2, Calendar, Waves, Mountain, CheckCircle2, AlertCircle, ChevronDown } from "lucide-react";
import {
  scheduleComboBooking,
  getSlotsByDateAndType,
  type SlotOption,
  type ComboQueueBooking,
} from "@/app/actions/admin/combo";
import { cn } from "@/lib/cn";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function todayString(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
}

function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12  = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function formatJpy(n: number) {
  return `¥${n.toLocaleString("en-US")}`;
}

// ─── SlotPicker sub-component ─────────────────────────────────────────────────

interface SlotPickerProps {
  label: string;
  icon: React.ReactNode;
  color: "teal" | "violet";
  slots: SlotOption[];
  loading: boolean;
  error: string;
  value: string;
  onChange: (id: string) => void;
  paxCount: number;
  disabled?: boolean;
}

function SlotPicker({
  label, icon, color, slots, loading, error,
  value, onChange, paxCount, disabled,
}: SlotPickerProps) {
  const ringColor   = color === "teal" ? "ring-teal-400" : "ring-violet-400";
  const badgeOpen   = color === "teal" ? "bg-teal-50 text-teal-700 border-teal-200"  : "bg-violet-50 text-violet-700 border-violet-200";
  const badgeFull   = "bg-red-50 text-red-600 border-red-200";

  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-2 text-xs font-semibold text-stone-600 uppercase tracking-wide">
        {icon}
        {label}
      </label>

      {loading ? (
        <div className="flex items-center gap-2 h-10 px-3 rounded-xl border border-stone-200 text-sm text-stone-400">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Loading slots…
        </div>
      ) : error ? (
        <p className="text-sm text-red-500 py-1">{error}</p>
      ) : slots.length === 0 ? (
        <div className="flex items-center gap-2 h-10 px-3 rounded-xl border border-stone-200 text-sm text-stone-400 italic">
          No slots on this date
        </div>
      ) : (
        <div className={cn(
          "relative rounded-xl border ring-0 focus-within:ring-2 transition-all",
          ringColor,
          disabled ? "opacity-60" : ""
        )} style={{ borderColor: "rgba(0,0,0,0.12)" }}>
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled || slots.length === 0}
            className="w-full h-10 pl-3 pr-8 bg-transparent text-sm text-stone-800 appearance-none focus:outline-none rounded-xl"
          >
            <option value="">— Select time —</option>
            {slots.map((s) => {
              const tightFit = s.remaining < paxCount;
              return (
                <option key={s.id} value={s.id} disabled={tightFit}>
                  {formatTime(s.startTime)} — {s.remaining}/{s.maxCapacity} seats
                  {tightFit ? " ⚠ insufficient" : ""}
                </option>
              );
            })}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400 pointer-events-none" />
        </div>
      )}

      {/* Selected slot info pill */}
      {value && (() => {
        const s = slots.find((x) => x.id === value);
        if (!s) return null;
        const hasRoom = s.remaining >= paxCount;
        return (
          <div className={cn(
            "flex items-center justify-between px-3 py-1.5 rounded-lg border text-xs font-medium",
            hasRoom ? badgeOpen : badgeFull
          )}>
            <span>{formatTime(s.startTime)} departure</span>
            <span>{s.remaining} seats remaining{!hasRoom ? " ⚠" : ""}</span>
          </div>
        );
      })()}
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

interface Props {
  booking: ComboQueueBooking;
  onClose: () => void;
  onSuccess: (ref: string) => void;
}

export default function ComboScheduleModal({ booking, onClose, onSuccess }: Props) {
  const paxCount = booking.adultCount + booking.childCount;

  // Default to comboDate if present, else today
  const defaultDate = booking.comboDate
    ? new Date(booking.comboDate).toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" })
    : todayString();

  const [date, setDate]               = useState(defaultDate);
  const [raftingSlotId, setRafting]   = useState(booking.slotId ?? "");
  const [canyoningSlotId, setCanyoning] = useState(booking.secondarySlotId ?? "");

  // Rafting slots state
  const [raftingSlots, setRaftingSlots]     = useState<SlotOption[]>([]);
  const [raftingLoading, setRaftingLoading] = useState(false);
  const [raftingError, setRaftingError]     = useState("");

  // Canyoning slots state
  const [canyoningSlots, setCanyoningSlots]     = useState<SlotOption[]>([]);
  const [canyoningLoading, setCanyoningLoading] = useState(false);
  const [canyoningError, setCanyoningError]     = useState("");

  // Submission
  const [submitting, startSubmit] = useTransition();
  const [fieldError, setFieldError] = useState("");

  // ── Load slots when date changes ─────────────────────────────────────────
  const fetchSlots = useCallback((d: string) => {
    // Reset selections
    setRafting("");
    setCanyoning("");

    // Rafting
    setRaftingLoading(true);
    setRaftingError("");
    getSlotsByDateAndType(d, "RAFTING").then(({ slots, error }) => {
      setRaftingLoading(false);
      if (error) setRaftingError(error);
      else setRaftingSlots(slots);
    });

    // Canyoning
    setCanyoningLoading(true);
    setCanyoningError("");
    getSlotsByDateAndType(d, "CANYONING").then(({ slots, error }) => {
      setCanyoningLoading(false);
      if (error) setCanyoningError(error);
      else setCanyoningSlots(slots);
    });
  }, []);

  useEffect(() => {
    fetchSlots(date);
  }, [date, fetchSlots]);

  // ── Escape key ───────────────────────────────────────────────────────────
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose, submitting]);

  // ── Submit handler ────────────────────────────────────────────────────────
  const handleSubmit = () => {
    setFieldError("");
    if (!date)           { setFieldError("Please select a date."); return; }
    if (!raftingSlotId)  { setFieldError("Please select a Rafting slot."); return; }
    if (!canyoningSlotId){ setFieldError("Please select a Canyoning slot."); return; }

    // Warn if insufficient seats (but still allow — Math.min caps it server-side)
    const r = raftingSlots.find((s) => s.id === raftingSlotId);
    const c = canyoningSlots.find((s) => s.id === canyoningSlotId);
    if (r && r.remaining < paxCount) {
      const yes = window.confirm(
        `Warning: The Rafting slot only has ${r.remaining} seat(s) remaining but you have ${paxCount} pax. Proceed anyway? (capacity will be capped at maximum)`
      );
      if (!yes) return;
    }
    if (c && c.remaining < paxCount) {
      const yes = window.confirm(
        `Warning: The Canyoning slot only has ${c.remaining} seat(s) remaining but you have ${paxCount} pax. Proceed anyway?`
      );
      if (!yes) return;
    }

    startSubmit(async () => {
      const result = await scheduleComboBooking({
        bookingId: booking.id,
        raftingSlotId,
        canyoningSlotId,
      });

      if (result.success) {
        onSuccess(booking.reference);
      } else {
        setFieldError(result.error ?? "Scheduling failed. Please try again.");
      }
    });
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}
      onClick={(e) => { if (e.target === e.currentTarget && !submitting) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">

        {/* ── Header ── */}
        <div
          className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(0,0,0,0.07)" }}
        >
          <div>
            <h2 className="font-bold text-stone-900 text-base leading-tight">
              Schedule Combo Package
            </h2>
            <p className="text-xs text-stone-400 mt-0.5">
              {booking.reference} · {booking.leadName} · {paxCount} pax
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="w-8 h-8 rounded-full hover:bg-stone-100 flex items-center justify-center text-stone-400 hover:text-stone-700 transition-colors flex-shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1">

          {/* Booking summary card */}
          <div
            className="rounded-xl p-4 grid grid-cols-3 gap-3 text-center text-xs"
            style={{ background: "linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%)", border: "1px solid rgba(13,148,136,0.18)" }}
          >
            <div>
              <p className="text-stone-400 mb-0.5">Adults</p>
              <p className="font-bold text-stone-800 text-base">{booking.adultCount}</p>
            </div>
            <div>
              <p className="text-stone-400 mb-0.5">Children</p>
              <p className="font-bold text-stone-800 text-base">{booking.childCount}</p>
            </div>
            <div>
              <p className="text-stone-400 mb-0.5">Total</p>
              <p className="font-bold text-teal-700 text-base">{formatJpy(booking.totalJpy)}</p>
            </div>
          </div>

          {/* Requested date chip */}
          {booking.comboDate && (
            <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
              <span>
                Guest requested:{" "}
                <strong>
                  {new Date(booking.comboDate).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    timeZone: "Asia/Tokyo",
                  })}
                </strong>
              </span>
            </div>
          )}

          {/* Date picker */}
          <div>
            <label htmlFor="combo-schedule-date" className="text-xs font-semibold text-stone-600 uppercase tracking-wide block mb-1.5">
              Activity Date
            </label>
            <input
              id="combo-schedule-date"
              type="date"
              value={date}
              min={todayString()}
              onChange={(e) => setDate(e.target.value)}
              disabled={submitting}
              className="w-full h-10 px-3 text-sm rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-teal-400 transition-all"
            />
          </div>

          {/* Slot pickers */}
          <SlotPicker
            label="Rafting Slot"
            icon={<Waves className="w-3.5 h-3.5 text-teal-600" />}
            color="teal"
            slots={raftingSlots}
            loading={raftingLoading}
            error={raftingError}
            value={raftingSlotId}
            onChange={setRafting}
            paxCount={paxCount}
            disabled={submitting}
          />

          <SlotPicker
            label="Canyoning Slot"
            icon={<Mountain className="w-3.5 h-3.5 text-violet-600" />}
            color="violet"
            slots={canyoningSlots}
            loading={canyoningLoading}
            error={canyoningError}
            value={canyoningSlotId}
            onChange={setCanyoning}
            paxCount={paxCount}
            disabled={submitting}
          />

          {/* Field-level error */}
          {fieldError && (
            <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{fieldError}</span>
            </div>
          )}

          {/* Confirmation summary */}
          {raftingSlotId && canyoningSlotId && (() => {
            const r = raftingSlots.find((s) => s.id === raftingSlotId);
            const c = canyoningSlots.find((s) => s.id === canyoningSlotId);
            if (!r || !c) return null;
            return (
              <div
                className="rounded-xl px-4 py-3 space-y-2 text-xs"
                style={{ background: "linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%)", border: "1px solid rgba(13,148,136,0.18)" }}
              >
                <p className="font-semibold text-stone-700">Scheduling Summary</p>
                <div className="flex items-center gap-2 text-stone-600">
                  <Waves className="w-3 h-3 text-teal-500 flex-shrink-0" />
                  <span>Rafting at {formatTime(r.startTime)} — {paxCount} seats from {r.remaining} remaining</span>
                </div>
                <div className="flex items-center gap-2 text-stone-600">
                  <Mountain className="w-3 h-3 text-violet-500 flex-shrink-0" />
                  <span>Canyoning at {formatTime(c.startTime)} — {paxCount} seats from {c.remaining} remaining</span>
                </div>
                <p className="text-stone-400 pt-1 border-t border-stone-100">
                  Booking status will be set to <strong className="text-teal-700">CONFIRMED</strong>.
                </p>
              </div>
            );
          })()}
        </div>

        {/* ── Footer ── */}
        <div
          className="flex gap-3 px-6 py-4 flex-shrink-0"
          style={{ borderTop: "1px solid rgba(0,0,0,0.07)" }}
        >
          <button
            onClick={onClose}
            disabled={submitting}
            className="btn btn-outline btn-sm flex-1"
          >
            Cancel
          </button>
          <button
            id="combo-schedule-submit"
            onClick={handleSubmit}
            disabled={submitting || !raftingSlotId || !canyoningSlotId || raftingLoading || canyoningLoading}
            className="btn btn-primary btn-sm flex-[2] flex items-center justify-center gap-2"
            style={{
              background:
                submitting || !raftingSlotId || !canyoningSlotId
                  ? undefined
                  : "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)",
            }}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Scheduling…
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Schedule & Confirm
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useTranslations, useLocale } from "next-intl";
import { useBooking } from "../BookingContext";
import {
  ChevronLeft,
  Clock,
  Users,
  Loader2,
  AlertTriangle,
  Phone,
} from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

// ─── Hardcoded canonical schedule ───────────────────────────────────────────────
//
// These are the three fixed departure times across ALL days and activities.
// Times are in "HH:MM" 24h format internally; formatted for display below.

const CANONICAL_TIMES = ["09:00", "11:30", "13:30"] as const;

// ─── Types ──────────────────────────────────────────────────────────────────────

interface SlotInfo {
  id: string;
  startTime: string;
  remaining: number;
  status: "available" | "limited" | "full" | "blocked" | "special" | "closed";
  isBlocked: boolean;
  weatherNote?: string | null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function formatTime(time: string, locale: string): string {
  const [h, m] = time.split(":");
  const hour = parseInt(h);
  if (locale === "ja") return `${hour}:${m}`;
  const ampm = hour < 12 ? "AM" : "PM";
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

// ─── Component ──────────────────────────────────────────────────────────────────

export default function Step3Time() {
  const t = useTranslations("booking");
  const locale = useLocale();
  const { state, dispatch, nextStep, prevStep } = useBooking();

  const [slots, setSlots] = useState<SlotInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tooClose, setTooClose] = useState(false);

  // ── Fetch slots for the selected date — filtered to canonical times ───────────

  useEffect(() => {
    if (!state.productId || !state.selectedDate) return;

    const fetchSlots = async () => {
      setLoading(true);
      setError(null);
      setTooClose(false);

      try {
        const res = await fetch(
          `/api/availability/slots?productId=${encodeURIComponent(state.productId)}&date=${state.selectedDate}`
        );
        const data = await res.json();

        if (data.error === "TOO_CLOSE") {
          setTooClose(true);
          setSlots([]);
          return;
        }

        // Filter fetched slots to only those matching our canonical schedule
        const rawSlots: SlotInfo[] = data.slots ?? [];
        const filtered = rawSlots.filter((s) =>
          CANONICAL_TIMES.includes(s.startTime as typeof CANONICAL_TIMES[number])
        );

        // Sort by canonical order
        filtered.sort(
          (a, b) =>
            CANONICAL_TIMES.indexOf(a.startTime as typeof CANONICAL_TIMES[number]) -
            CANONICAL_TIMES.indexOf(b.startTime as typeof CANONICAL_TIMES[number])
        );

        setSlots(filtered);
      } catch {
        setError(
          locale === "en"
            ? "Failed to load time slots. Please try again."
            : "時間枠の読み込みに失敗しました。"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchSlots();
  }, [state.productId, state.selectedDate, locale]);

  // ── Slot selection ────────────────────────────────────────────────────────────

  const selectSlot = (slot: SlotInfo) => {
    if (isSlotUnselectable(slot)) return;
    dispatch({
      type: "SET_SLOT",
      payload: { slotId: slot.id, startTime: slot.startTime },
    });
  };

  const paxNeeded = state.adultCount + state.childCount;

  function isSlotUnselectable(slot: SlotInfo): boolean {
    if (slot.status === "special") return true;
    if (slot.status === "full" || slot.isBlocked) return true;
    if (paxNeeded > 0 && slot.remaining < paxNeeded) return true;
    return false;
  }

  // ── Loading skeleton ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-stone-900">{t("time.choose")}</h2>
        <div className="flex items-center justify-center py-12 gap-3 text-stone-500">
          <Loader2 className="w-5 h-5 animate-spin text-teal-500" />
          <span>
            {locale === "en" ? "Loading available times..." : "時間を読み込み中..."}
          </span>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Heading */}
      <div>
        <h2 className="text-2xl font-bold text-stone-900">{t("time.choose")}</h2>
        <p className="text-stone-500 text-sm mt-1">
          {locale === "en"
            ? `Departure times for ${new Date(state.selectedDate + "T00:00:00").toLocaleDateString(
                "en-US",
                { month: "long", day: "numeric" }
              )}`
            : `${new Date(state.selectedDate + "T00:00:00").toLocaleDateString("ja-JP", {
                month: "long",
                day: "numeric",
              })}の出発時間`}
        </p>
      </div>

      {/* Schedule info banner */}
      <div
        className="rounded-xl p-4 flex gap-3 items-center text-sm"
        style={{ background: "var(--color-teal-50)", border: "1px solid var(--color-teal-200)" }}
      >
        <Clock className="w-4 h-4 text-teal-600 flex-shrink-0" />
        <p className="text-teal-800">
          {locale === "en"
            ? "Daily departures at 9:00 AM · 11:30 AM · 1:30 PM"
            : "毎日出発 9:00 · 11:30 · 13:30"}
        </p>
      </div>

      {/* Too close warning */}
      {tooClose && (
        <div
          className="rounded-xl p-5 flex gap-3 items-start"
          style={{ background: "#fef9c3", borderLeft: "4px solid #d97706" }}
        >
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800">
              {locale === "en" ? "Booking Unavailable" : "予約できません"}
            </p>
            <p className="text-amber-700 text-sm mt-1">
              {locale === "en"
                ? "Bookings require at least 1 day advance notice. Please select a different date."
                : "ご予約は前日までにお願いします。別の日程をお選びください。"}
            </p>
          </div>
        </div>
      )}

      {/* Fetch error */}
      {error && (
        <div className="rounded-xl p-4 bg-red-50 text-red-700 text-sm">{error}</div>
      )}

      {/* No slots */}
      {!loading && !tooClose && slots.length === 0 && !error && (
        <div className="card p-8 text-center">
          <p className="text-stone-500 font-medium">
            {locale === "en"
              ? "No available time slots on this date. Please select a different date."
              : "この日の利用可能な時間枠はありません。別の日程をお選びください。"}
          </p>
        </div>
      )}

      {/* Slot list */}
      {slots.length > 0 && (
        <div className="space-y-3">
          {slots.map((slot) => {
            const isSpecial   = slot.status === "special";
            const isFull      = !isSpecial && (slot.status === "full" || slot.isBlocked);
            const isLimited   = slot.status === "limited";
            const isSelected  = state.slotId === slot.id;
            const notEnough   = !isSpecial && !isFull && paxNeeded > 0 && slot.remaining < paxNeeded;
            const unselectable = isSlotUnselectable(slot);

            return (
              <button
                key={slot.id}
                id={`slot-${slot.startTime.replace(":", "")}`}
                onClick={() => selectSlot(slot)}
                disabled={unselectable}
                aria-pressed={isSelected}
                className={cn(
                  // Base card
                  "card p-5 flex items-center justify-between transition-all w-full text-left",
                  // Selected
                  isSelected && "outline outline-2 outline-teal-600",
                  // Normal hover (only when selectable)
                  !unselectable && !isSelected && "hover:shadow-md cursor-pointer",
                  // Full / not-enough-seats → muted
                  (isFull || notEnough) && "opacity-50 cursor-not-allowed",
                  // SPECIAL styling — Purple left-border + soft purple background
                  isSpecial && [
                    "border-l-4 border-l-purple-500",
                    "bg-purple-50 hover:bg-purple-50",
                    "cursor-not-allowed",
                    "opacity-95",
                  ],
                )}
              >
                {/* Left — clock icon + time + weather note */}
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{
                      background: isSpecial
                        ? "#ede9fe" // purple-100
                        : isSelected
                        ? "var(--color-teal-600)"
                        : "var(--color-teal-50)",
                    }}
                  >
                    {isSpecial ? (
                      <Phone className="w-5 h-5 text-purple-600" />
                    ) : (
                      <Clock
                        className={cn(
                          "w-5 h-5",
                          isSelected ? "text-white" : "text-teal-600"
                        )}
                      />
                    )}
                  </div>
                  <div>
                    <p className={cn(
                      "font-bold text-lg",
                      isSpecial ? "text-purple-900" : "text-stone-900"
                    )}>
                      {formatTime(slot.startTime, locale)}
                    </p>
                    {/* Special sub-label */}
                    {isSpecial && (
                      <p className="text-xs text-purple-600 font-medium mt-0.5">
                        {locale === "en" ? "Special Event" : "特別イベント"}
                      </p>
                    )}
                    {/* Weather note */}
                    {slot.weatherNote && !isSpecial && (
                      <p className="text-xs text-amber-600 mt-0.5">{slot.weatherNote}</p>
                    )}
                  </div>
                </div>

                {/* Right — badge / spots */}
                <div className="text-right shrink-0">
                  {isSpecial ? (
                    // SPECIAL: "Special" badge with phone icon
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 border border-purple-200">
                      <Phone className="w-3 h-3" />
                      {locale === "en" ? "Special" : "スペシャル"}
                    </span>
                  ) : isFull ? (
                    <span className="badge badge-red">
                      {locale === "en" ? "Full" : "満席"}
                    </span>
                  ) : notEnough ? (
                    <span className="badge badge-amber text-xs">
                      {locale === "en" ? "Insufficient Seats" : "空席不足"}
                    </span>
                  ) : (
                    <div className="flex items-center gap-1.5 text-sm">
                      <Users
                        className={cn(
                          "w-4 h-4",
                          isLimited ? "text-amber-500" : "text-teal-500"
                        )}
                      />
                      <span
                        className={cn(
                          "font-medium",
                          isLimited ? "text-amber-600" : "text-teal-600"
                        )}
                      >
                        {isLimited
                          ? (locale === "en" ? "Limited" : "残りわずか")
                          : (locale === "en" ? "Available" : "空席あり")}
                      </span>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Special-event phone note */}
      {slots.some((s) => s.status === "special") && (
        <div className="rounded-xl p-4 bg-purple-50 border border-purple-200 flex gap-3 items-start text-sm">
          <Phone className="w-4 h-4 text-purple-500 mt-0.5 shrink-0" />
          <p className="text-purple-700">
            {locale === "en"
              ? "Special event slots require a phone reservation. Please call us to arrange your booking."
              : "特別イベントのご予約はお電話にて承っております。スタッフまでお電話ください。"}
          </p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-2">
        <button onClick={prevStep} className="btn btn-ghost flex items-center gap-1">
          <ChevronLeft className="w-4 h-4" />
          {locale === "en" ? "Back" : "戻る"}
        </button>
        <button
          id="step3-next"
          onClick={nextStep}
          disabled={!state.slotId}
          className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {locale === "en" ? "Continue" : "次へ"}
        </button>
      </div>
    </div>
  );
}

"use client";

import { useTranslations, useLocale } from "next-intl";
import { useBooking } from "../BookingContext";
import { ChevronLeft, ChevronRight, Loader2, Phone } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/cn";

// ─── Types ─────────────────────────────────────────────────────────────────────

/**
 * Every status that can come from the API.
 * "none" is a client-only sentinel meaning "this date has no DB slots at all".
 */
type DateStatus =
  | "available"
  | "limited"
  | "full"
  | "special"
  | "blocked"
  | "closed"
  | "none"; // ← no slots in DB — greyed out, unclickable

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getDaysInMonth(year: number, month: number) {
  // month is 0-indexed here (JS convention used internally)
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

const MONTH_NAMES_EN = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const MONTH_NAMES_JA = [
  "1月","2月","3月","4月","5月","6月",
  "7月","8月","9月","10月","11月","12月",
];

// ─── Status dot colors ─────────────────────────────────────────────────────────

const STATUS_DOT: Record<Exclude<DateStatus, "none">, string> = {
  available: "bg-teal-400",
  limited:   "bg-amber-400",
  full:      "bg-red-400",
  special:   "bg-purple-500",
  blocked:   "bg-stone-300",
  closed:    "bg-stone-300",
};

// ─── Which statuses block selection ────────────────────────────────────────────
//
// "none"    → no slots at all for this date — unclickable (greyed)
// "blocked" → admin blocked
// "closed"  → admin closed
// "full"    → no seats left
// "special" → "Special" days; not self-service online
//
const UNSELECTABLE: Set<DateStatus> = new Set([
  "none",
  "blocked",
  "closed",
  "full",
  "special",
]);

// ─── Component ─────────────────────────────────────────────────────────────────

export default function Step2Date() {
  const t = useTranslations("booking");
  const locale = useLocale();
  const { state, dispatch, nextStep, prevStep } = useBooking();

  // Use JST for all date logic — all trips are in Gunma, Japan.
  // `todayJstStr` is the current calendar date in JST ("YYYY-MM-DD").
  // `minDate` is the earliest selectable date: tomorrow in JST.
  const todayJstStr = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
  const todayJst = new Date(todayJstStr + "T00:00:00Z"); // UTC midnight of the JST "today"
  const minDate = new Date(todayJst.getTime() + 24 * 60 * 60 * 1000); // +1 day

  const [viewYear, setViewYear] = useState(() => {
    const [y] = todayJstStr.split("-").map(Number);
    return y;
  });
  const [viewMonth, setViewMonth] = useState(() => {
    const [, m] = todayJstStr.split("-").map(Number);
    return m - 1; // 0-indexed
  });

  // Map from "YYYY-MM-DD" → DateStatus.
  // Keys that exist = dates that have at least one DB slot.
  // Dates NOT in the map = no slots at all → "none".
  const [availability, setAvailability] = useState<Record<string, DateStatus>>({});
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);

  // ── Fetch availability for current viewMonth ──────────────────────────────

  const fetchAvailability = useCallback(async () => {
    if (!state.productId) return;
    setLoading(true);
    setFetchError(false);
    try {
      const res = await fetch(
        `/api/availability/month?productId=${encodeURIComponent(state.productId)}&year=${viewYear}&month=${viewMonth + 1}`
      );
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json();

      const map: Record<string, DateStatus> = {};
      for (const item of data.availability ?? []) {
        map[item.date] = item.status as DateStatus;
      }
      setAvailability(map);
    } catch {
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, [state.productId, viewYear, viewMonth]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  // ── Month navigation ──────────────────────────────────────────────────────

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  // ── Date selection ────────────────────────────────────────────────────────

  const selectDate = (day: number) => {
    const d = new Date(viewYear, viewMonth, day);
    if (d < minDate) return; // past / today

    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const status: DateStatus = availability[dateStr] ?? "none";

    if (UNSELECTABLE.has(status)) return; // hard block
    dispatch({ type: "SET_DATE", payload: dateStr });
    // Clear previously selected slot when date changes
    dispatch({ type: "SET_SLOT", payload: { slotId: "", startTime: "" } });
  };

  // ── Labels ────────────────────────────────────────────────────────────────

  const monthLabel = locale === "ja"
    ? `${viewYear}年 ${MONTH_NAMES_JA[viewMonth]}`
    : `${MONTH_NAMES_EN[viewMonth]} ${viewYear}`;

  const dayLabels = locale === "ja"
    ? ["日","月","火","水","木","金","土"]
    : ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  // ── Determine if the entire month has any available dates ─────────────────
  const hasAnyBookable = Object.values(availability).some(
    (s) => !UNSELECTABLE.has(s)
  );

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-stone-900">{t("date.choose")}</h2>
        <p className="text-stone-500 text-sm mt-1">
          {locale === "en"
            ? "Select your preferred date. Bookings require at least 1 day advance notice."
            : "ご希望の日程を選んでください（前日まで予約可能）。"}
        </p>
      </div>

      <div className="card p-6 max-w-md mx-auto">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={prevMonth}
            className="p-2 rounded-lg hover:bg-stone-100 transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-5 h-5 text-stone-600" />
          </button>
          <span className="font-semibold text-stone-900 flex items-center gap-2">
            {monthLabel}
            {loading && <Loader2 className="w-4 h-4 animate-spin text-teal-500" />}
          </span>
          <button
            onClick={nextMonth}
            className="p-2 rounded-lg hover:bg-stone-100 transition-colors"
            aria-label="Next month"
          >
            <ChevronRight className="w-5 h-5 text-stone-600" />
          </button>
        </div>

        {/* Fetch-error banner */}
        {fetchError && !loading && (
          <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 mb-3 text-center">
            {locale === "en"
              ? "Could not load availability. Please try refreshing."
              : "空き情報を取得できませんでした。再読み込みしてください。"}
          </div>
        )}

        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 mb-1">
          {dayLabels.map(d => (
            <div key={d} className="text-center text-xs font-medium text-stone-400 py-1">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells for days before month start */}
          {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const d = new Date(viewYear, viewMonth, day);
            const isPast = d < minDate;

            // "none" = date has NO slots in DB (never came back from API)
            const status: DateStatus = loading
              ? "none"                                    // show skeleton while fetching
              : (availability[dateStr] ?? "none");        // undefined → "none"

            const isUnselectable = isPast || UNSELECTABLE.has(status);
            const isSelected = state.selectedDate === dateStr;
            const isToday = dateStr === todayJstStr;

            // Determine visual appearance
            const showDot = !isSelected && status !== "none" && !isPast;
            const showSpecialIcon = status === "special" && !isPast && !isSelected;

            return (
              <button
                key={day}
                id={`cal-day-${dateStr}`}
                onClick={() => selectDate(day)}
                disabled={isUnselectable}
                aria-pressed={isSelected}
                aria-label={`${dateStr}${status === "none" ? " (no availability)" : ""}`}
                title={
                  status === "special"
                    ? locale === "en" ? "Special — call us to arrange" : "スペシャル — お電話ください"
                    : status === "none" && !isPast
                    ? locale === "en" ? "No availability" : "空きなし"
                    : undefined
                }
                className={cn(
                  "relative h-10 w-full rounded-lg text-sm font-medium transition-all flex flex-col items-center justify-center gap-0.5",
                  // Selected state
                  isSelected && "text-white",
                  // Available / normal hover
                  !isSelected && !isUnselectable && "hover:bg-teal-50 text-stone-700",
                  // Past dates
                  isPast && "text-stone-200 cursor-not-allowed",
                  // No slots (not past)
                  !isPast && status === "none" && "text-stone-300 cursor-not-allowed",
                  // Blocked / full
                  !isPast && (status === "blocked" || status === "closed" || status === "full") &&
                    "text-stone-300 cursor-not-allowed",
                  // Special — purple styling
                  !isPast && status === "special" &&
                    "text-purple-700 cursor-not-allowed opacity-90",
                  // Today ring
                  isToday && !isSelected && "ring-1 ring-teal-400 font-bold",
                )}
                style={isSelected ? { background: "var(--color-teal-600)" } : {}}
              >
                <span>{day}</span>

                {/* Status dot — only shown when date has real slots */}
                {showDot && (
                  <span
                    className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      STATUS_DOT[status as keyof typeof STATUS_DOT]
                    )}
                  />
                )}

                {/* Small phone icon for special days — "Special" */}
                {showSpecialIcon && (
                  <Phone className="w-2 h-2 text-purple-400 absolute top-0.5 right-0.5" />
                )}
              </button>
            );
          })}
        </div>

        {/* "No available dates this month" helper */}
        {!loading && !fetchError && !hasAnyBookable && (
          <p className="text-center text-xs text-stone-400 mt-4">
            {locale === "en"
              ? "No slots available this month. Try the next month →"
              : "今月は空きがありません。翌月をご確認ください →"}
          </p>
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-stone-100 text-xs text-stone-500">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-teal-400 inline-block" />
            {t("date.available")}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
            {t("date.limited")}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
            {t("date.full")}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-0.5">
              <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" />
              <Phone className="w-2.5 h-2.5 text-purple-500" />
            </span>
            {/* "Special" — updated from "Call to Book" */}
            {locale === "en" ? "Special" : "スペシャル"}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-stone-300 inline-block" />
            {t("date.blocked")}
          </span>
        </div>
      </div>

      {/* Selected date confirmation */}
      {state.selectedDate && (
        <p className="text-center text-sm font-medium" style={{ color: "var(--color-teal-700)" }}>
          ✓{" "}
          {new Date(state.selectedDate + "T00:00:00").toLocaleDateString(
            locale === "ja" ? "ja-JP" : "en-US",
            { year: "numeric", month: "long", day: "numeric" }
          )}
        </p>
      )}

      <div className="flex justify-between pt-2">
        <button onClick={prevStep} className="btn btn-ghost flex items-center gap-1">
          <ChevronLeft className="w-4 h-4" /> {locale === "en" ? "Back" : "戻る"}
        </button>
        <button
          id="step2-next"
          onClick={nextStep}
          disabled={!state.selectedDate}
          className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {locale === "en" ? "Continue" : "次へ"}
        </button>
      </div>
    </div>
  );
}

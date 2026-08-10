"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useBooking } from "../BookingContext";
import {
  ChevronLeft,
  Minus,
  Plus,
  UtensilsCrossed,
  Users,
} from "lucide-react";
import { clamp } from "@/lib/utils";
import { cn } from "@/lib/cn";

// ─── Counter sub-component ────────────────────────────────────────────────────

function Counter({
  id,
  label,
  sublabel,
  value,
  min,
  max,
  onChange,
}: {
  id: string;
  label: string;
  sublabel?: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="card p-5 flex items-center justify-between">
      <div>
        <p className="font-semibold text-stone-900">{label}</p>
        {sublabel && <p className="text-sm text-stone-400 mt-0.5">{sublabel}</p>}
      </div>
      <div className="flex items-center gap-3">
        <button
          id={`${id}-dec`}
          onClick={() => onChange(clamp(value - 1, min, max))}
          disabled={value <= min}
          className="w-9 h-9 rounded-full flex items-center justify-center border-2 transition-colors disabled:opacity-30"
          style={{ borderColor: "var(--color-teal-300)", color: "var(--color-teal-700)" }}
          aria-label={`Decrease ${label}`}
        >
          <Minus className="w-4 h-4" />
        </button>
        <span
          className="w-8 text-center font-bold text-lg text-stone-900"
          aria-live="polite"
        >
          {value}
        </span>
        <button
          id={`${id}-inc`}
          onClick={() => onChange(clamp(value + 1, min, max))}
          disabled={value >= max}
          className="w-9 h-9 rounded-full flex items-center justify-center text-white transition-colors disabled:opacity-30"
          style={{ background: "var(--color-teal-600)" }}
          aria-label={`Increase ${label}`}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Step4People() {
  const t      = useTranslations("booking.people");
  const locale = useLocale();
  const { state, dispatch, nextStep, prevStep } = useBooking();

  const [remainingCapacity, setRemainingCapacity] = useState<number | null>(null);

  useEffect(() => {
    const defaultMax = state.activityType === "CANYONING" ? 35 : 21;
    if (!state.slotId || !state.selectedDate || !state.productId) {
      setRemainingCapacity(defaultMax);
      return;
    }

    let active = true;
    const fetchRemaining = async () => {
      try {
        const res = await fetch(
          `/api/availability/slots?productId=${encodeURIComponent(state.productId)}&date=${state.selectedDate}`
        );
        if (!res.ok) return;
        const data = await res.json();
        const slot = (data.slots ?? []).find((s: { id: string; remaining: number }) => s.id === state.slotId);
        if (slot && active) {
          setRemainingCapacity(slot.remaining);
        }
      } catch (err) {
        console.error("Failed to fetch slot remaining capacity:", err);
      }
    };
    fetchRemaining();
    return () => {
      active = false;
    };
  }, [state.slotId, state.selectedDate, state.productId, state.activityType]);

  // ── Participant counter handlers ───────────────────────────────────────────
  const setAdults = (v: number) =>
    dispatch({ type: "SET_PEOPLE", payload: { adultCount: v, childCount: state.childCount } });
  const setChildren = (v: number) =>
    dispatch({ type: "SET_PEOPLE", payload: { adultCount: state.adultCount, childCount: v } });

  const childAgeLabel =
    state.activityType === "CANYONING" ? t("child_age_canyoning") : t("child_age_rafting");

  const totalPax    = state.adultCount + state.childCount;
  const activeLimit = remainingCapacity ?? (state.activityType === "CANYONING" ? 35 : 21);
  const isPaxOverLimit = totalPax > activeLimit;
  const canProceed = state.adultCount >= 1 && !isPaxOverLimit;

  const maxAdults = Math.max(1, activeLimit - state.childCount);
  const maxChildren = Math.max(0, activeLimit - state.adultCount);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-stone-900">{t("title")}</h2>
        <p className="text-stone-500 text-sm mt-1">
          {locale === "en" ? "Minimum 1 adult required." : "大人が最低1名必要です。"}
        </p>
      </div>

      {/* ── Participant counters ─────────────────────────────────────────── */}
      <div className="space-y-3">
        <Counter
          id="adults"
          label={`${t("adults")} (${t("adult_age")})`}
          value={state.adultCount}
          min={1}
          max={maxAdults}
          onChange={setAdults}
        />
        <Counter
          id="children"
          label={`${t("children")} (${childAgeLabel})`}
          value={state.childCount}
          min={0}
          max={maxChildren}
          onChange={setChildren}
        />
      </div>

      {/* ── Add-ons ──────────────────────────────────────────────────────── */}
      {state.activityType && (
        <div className="space-y-3 pt-2">
          <h3 className="font-semibold text-stone-700 text-sm uppercase tracking-wide">
            {locale === "en" ? "Optional Add-ons" : "オプション追加"}
          </h3>

          {/* BBQ add-on — all activities */}
          <label
            htmlFor="addon-bbq"
            className={cn(
              "card flex items-start gap-4 p-4 cursor-pointer transition-all",
              state.hasBbq ? "outline outline-2 outline-teal-400" : ""
            )}
          >
            <input
              id="addon-bbq"
              type="checkbox"
              checked={state.hasBbq}
              onChange={(e) =>
                dispatch({ type: "SET_BBQ_ADDON", payload: e.target.checked })
              }
              className="mt-1 accent-teal-600 w-4 h-4 flex-shrink-0"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <UtensilsCrossed
                  className="w-4 h-4"
                  style={{ color: "var(--color-teal-600)" }}
                />
                <span className="font-semibold text-stone-900">
                  {t("bbq_addon")}
                </span>
                <span className="badge badge-amber text-xs">
                  {locale === "en" ? "Pay on arrival" : "現地払い"}
                </span>
              </div>
              <p className="text-sm text-stone-500">
                {t("bbq_addon_desc")}
              </p>
            </div>
          </label>
        </div>
      )}

      {/* ── Participant summary ───────────────────────────────────────────── */}
      <div
        className="rounded-xl p-4 flex items-center gap-3"
        style={{
          background: "var(--color-teal-50)",
          border: "1px solid var(--color-border-light)",
        }}
      >
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: "var(--color-teal-100)" }}
        >
          <Users className="w-5 h-5" style={{ color: "var(--color-teal-700)" }} />
        </div>
        <div>
          <p className="font-semibold text-stone-900">
            {locale === "en"
              ? `${totalPax} participant${totalPax !== 1 ? "s" : ""}`
              : `${totalPax}名`}
          </p>
          <p className="text-sm text-stone-500">
            {state.adultCount} {t("adults").toLowerCase()} ·{" "}
            {state.childCount} {t("children").toLowerCase()}
          </p>
        </div>
      </div>

      {!canProceed && state.adultCount < 1 && (
        <p className="text-sm" style={{ color: "#ef4444" }}>
          {t("min_adults")}
        </p>
      )}
      {isPaxOverLimit && (
        <p className="text-sm" style={{ color: "#ef4444" }}>
          {locale === "en"
            ? `Only ${activeLimit} spots are available for this slot. Please reduce the count.`
            : `この時間枠は残り${activeLimit}名様まで予約可能です。参加者数を減らしてください。`}
        </p>
      )}

      {/* ── Navigation ───────────────────────────────────────────────────── */}
      <div className="flex justify-between pt-2">
        <button
          onClick={prevStep}
          className="btn btn-ghost flex items-center gap-1"
        >
          <ChevronLeft className="w-4 h-4" />
          {locale === "en" ? "Back" : "戻る"}
        </button>
        <button
          id="step4-next"
          onClick={nextStep}
          disabled={!canProceed}
          className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {locale === "en" ? "Continue" : "次へ"}
        </button>
      </div>
    </div>
  );
}

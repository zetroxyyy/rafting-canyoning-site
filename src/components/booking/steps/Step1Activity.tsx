"use client";

import { useLocale } from "next-intl";
import { useBooking } from "../BookingContext";
import { Waves, Mountain, Zap, Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatJpy } from "@/lib/utils";

// Product IDs from seeded DB (set via env vars, fallback to seed values)
const PRODUCT_IDS = {
  RAFTING:   process.env.NEXT_PUBLIC_RAFTING_PRODUCT_ID   ?? "cmo7ffeih0000eguxbmagdoxp",
  CANYONING: process.env.NEXT_PUBLIC_CANYONING_PRODUCT_ID ?? "cmo7fff7m0001eguxz2pbd1sj",
  // Combo uses rafting product ID as primary (ops desk handles the second activity)
  COMBO:     process.env.NEXT_PUBLIC_RAFTING_PRODUCT_ID   ?? "cmo7ffeih0000eguxbmagdoxp",
};

export default function Step1Activity() {
  const locale = useLocale();
  const { state, prices, dispatch, nextStep } = useBooking();

  const selectActivity = (type: "RAFTING" | "CANYONING" | "COMBO") => {
    dispatch({
      type:    "SET_ACTIVITY",
      payload: { activityType: type, productId: PRODUCT_IDS[type] },
    });
  };

  const canProceed = state.activityType !== null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-stone-900 mb-1">
          {locale === "en" ? "Choose Your Adventure" : "アクティビティを選択"}
        </h2>
        <p className="text-stone-500 text-sm">
          {locale === "en"
            ? "Select an activity below. BBQ add-ons can be added after selecting your date."
            : "アクティビティをお選びください。BBQは日程選択後に追加できます。"}
        </p>
      </div>

      {/* ── COMBO PACK — premium hero card ────────────────────────────────── */}
      <button
        id="select-combo"
        onClick={() => selectActivity("COMBO")}
        className={cn(
          "w-full text-left rounded-2xl transition-all duration-200 relative overflow-hidden",
          state.activityType === "COMBO"
            ? "ring-2 ring-teal-600 shadow-xl shadow-teal-500/20"
            : "shadow-md hover:shadow-xl hover:shadow-teal-500/15 hover:-translate-y-0.5"
        )}
        style={{
          background:
            state.activityType === "COMBO"
              ? "linear-gradient(135deg, #0d9488 0%, #0f766e 60%, #115e59 100%)"
              : "linear-gradient(135deg, #0f766e 0%, #0d9488 60%, #14b8a6 100%)",
          padding: "1.75rem",
        }}
        aria-pressed={state.activityType === "COMBO"}
      >
        {/* Background shimmer */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 80% 20%, rgba(255,255,255,0.12) 0%, transparent 60%)",
          }}
        />

        {/* Best Value badge */}
        <div className="flex items-start justify-between mb-4 relative">
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
            style={{ background: "rgba(255,255,255,0.22)", color: "white" }}
          >
            <Zap className="w-3 h-3" />
            {locale === "en" ? "Best Value — Combo Pack" : "お得なコンボパック"}
          </span>

          {state.activityType === "COMBO" && (
            <span
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
              style={{ background: "rgba(255,255,255,0.25)", color: "white" }}
            >
              <Check className="w-3.5 h-3.5" />
              {locale === "en" ? "Selected" : "選択済み"}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-2xl font-extrabold text-white mb-1 relative tracking-tight">
          {locale === "en" ? "Rafting + Canyoning" : "ラフティング＋キャニオニング"}
        </h3>
        <p className="text-teal-100 text-sm mb-5 relative">
          {locale === "en"
            ? "Experience both adventures in one unforgettable day"
            : "1日で2つのアドベンチャーを体験しよう"}
        </p>

        {/* Pricing blocks */}
        <div className="flex items-center gap-3 mb-5 relative flex-wrap">
          <div
            className="flex-1 min-w-[130px] rounded-xl p-3 text-center"
            style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}
          >
            <p className="text-teal-100 text-xs font-semibold uppercase tracking-wider mb-1">
              {locale === "en" ? "Adult" : "大人"}
            </p>
            <p className="text-white font-extrabold text-2xl">
              {formatJpy(prices.comboAdult)}
            </p>
            <p className="text-teal-200 text-xs mt-0.5">
              {locale === "en" ? "per person" : "お一人様"}
            </p>
          </div>
          <div
            className="flex-1 min-w-[130px] rounded-xl p-3 text-center"
            style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}
          >
            <p className="text-teal-100 text-xs font-semibold uppercase tracking-wider mb-1">
              {locale === "en" ? "Child" : "子ども"}
            </p>
            <p className="text-white font-extrabold text-2xl">
              {formatJpy(prices.comboChild)}
            </p>
            <p className="text-teal-200 text-xs mt-0.5">
              {locale === "en" ? "per person" : "お一人様"}
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="flex flex-wrap gap-3 relative">
          {[
            locale === "en" ? "River Rafting" : "ラフティング",
            locale === "en" ? "Canyoning" : "キャニオニング",
            locale === "en" ? "Flexible Schedule" : "フレキシブル時間",
          ].map((feat) => (
            <span
              key={feat}
              className="text-xs font-semibold text-white px-3 py-1.5 rounded-lg"
              style={{ background: "rgba(255,255,255,0.12)" }}
            >
              {feat}
            </span>
          ))}
        </div>

        {/* Combo notice */}
        <p
          className="text-teal-100 text-xs mt-4 relative"
          style={{ borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: "0.75rem" }}
        >
          {locale === "en"
            ? "Flexible timing — our team will call to schedule your perfect day."
            : "フレキシブルな時間設定 — スタッフがお電話でご連絡します。"}
        </p>
      </button>

      {/* ── Standard activity cards ────────────────────────────────────────── */}
      <div className="grid sm:grid-cols-2 gap-4">
        {/* Rafting */}
        <button
          id="select-rafting"
          onClick={() => selectActivity("RAFTING")}
          className={cn(
            "card p-6 text-left transition-all cursor-pointer w-full",
            state.activityType === "RAFTING"
              ? "outline outline-2 outline-offset-1 outline-teal-600"
              : "hover:shadow-md"
          )}
          aria-pressed={state.activityType === "RAFTING"}
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
            style={{
              background:
                state.activityType === "RAFTING"
                  ? "var(--color-teal-600)"
                  : "var(--color-teal-50)",
            }}
          >
            <Waves
              className="w-6 h-6"
              style={{
                color:
                  state.activityType === "RAFTING"
                    ? "white"
                    : "var(--color-teal-600)",
              }}
            />
          </div>
          <h3 className="font-bold text-stone-900 mb-1">
            {locale === "en" ? "River Rafting" : "リバーラフティング"}
          </h3>
          <p className="text-sm text-stone-500 mb-1">
            {locale === "en"
              ? `Ages 6+ · ${formatJpy(prices.raftingAdult)} adult · ${formatJpy(prices.raftingChild)} child`
              : `6歳以上 · 大人${formatJpy(prices.raftingAdult)} · 子ども${formatJpy(prices.raftingChild)}`}
          </p>
          <p className="text-xs text-stone-400 mb-3">
            {locale === "en" ? "9:00 AM · 11:30 AM · 1:30 PM" : "9:00 · 11:30 · 13:30"}
          </p>
          {state.activityType === "RAFTING" && (
            <span className="badge badge-teal">
              {locale === "en" ? "Selected" : "選択済み"}
            </span>
          )}
        </button>

        {/* Canyoning */}
        <button
          id="select-canyoning"
          onClick={() => selectActivity("CANYONING")}
          className={cn(
            "card p-6 text-left transition-all cursor-pointer w-full",
            state.activityType === "CANYONING"
              ? "outline outline-2 outline-offset-1 outline-teal-600"
              : "hover:shadow-md"
          )}
          aria-pressed={state.activityType === "CANYONING"}
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
            style={{
              background:
                state.activityType === "CANYONING"
                  ? "var(--color-teal-600)"
                  : "var(--color-teal-50)",
            }}
          >
            <Mountain
              className="w-6 h-6"
              style={{
                color:
                  state.activityType === "CANYONING"
                    ? "white"
                    : "var(--color-teal-600)",
              }}
            />
          </div>
          <h3 className="font-bold text-stone-900 mb-1">
            {locale === "en" ? "Canyoning" : "キャニオニング"}
          </h3>
          <p className="text-sm text-stone-500 mb-1">
            {locale === "en"
              ? `Ages 12+ · ${formatJpy(prices.canyoningAdult)} adult · ${formatJpy(prices.canyoningChild)} child`
              : `12歳以上 · 大人${formatJpy(prices.canyoningAdult)} · 子ども${formatJpy(prices.canyoningChild)}`}
          </p>
          <p className="text-xs text-stone-400 mb-3">
            {locale === "en" ? "9:00 AM · 11:30 AM · 1:30 PM" : "9:00 · 11:30 · 13:30"}
          </p>
          {state.activityType === "CANYONING" && (
            <span className="badge badge-teal">
              {locale === "en" ? "Selected" : "選択済み"}
            </span>
          )}
        </button>
      </div>

      <div className="flex justify-end pt-2">
        <button
          id="step1-next"
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

"use client";

import { useTranslations, useLocale } from "next-intl";
import { useBooking } from "./BookingContext";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

// Full 6-step list (step 3 = Time is skipped for COMBO)
const STEPS = ["activity", "date", "time", "people", "details", "payment"] as const;

export default function BookingStepIndicator() {
  const t = useTranslations("booking.steps");
  const locale = useLocale();
  const { state } = useBooking();
  const current = state.currentStep;
  const isCombo = state.activityType === "COMBO";

  // For COMBO: filter out step 3 for display purposes.
  // The visible steps become: 1=activity, 2=date, 4=people, 5=details, 6=payment
  // mapped to display positions 1–5.
  const visibleSteps = isCombo
    ? STEPS.filter((_, i) => i !== 2) // exclude index 2 = "time"
    : STEPS;

  // Map real step numbers to visual positions for COMBO
  const getVisualStep = (realStep: number): number => {
    if (!isCombo) return realStep;
    // Real: 1→1, 2→2, 4→3, 5→4, 6→5
    if (realStep <= 2) return realStep;
    return realStep - 1;
  };

  const visualCurrent = getVisualStep(current);
  const totalVisible = visibleSteps.length;

  // Labels for mobile progress
  const currentStepKey = STEPS[current - 1];

  return (
    <div className="w-full" aria-label="Booking progress">
      {/* Desktop: horizontal steps */}
      <ol className="hidden md:flex items-center justify-between">
        {visibleSteps.map((step, i) => {
          const num = i + 1;
          const isDone = num < visualCurrent;
          const isActive = num === visualCurrent;

          return (
            <li key={step} className="flex-1 flex items-center">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all",
                    isDone && "text-white",
                    isActive && "text-white ring-4",
                    !isDone && !isActive && "bg-stone-100 text-stone-400"
                  )}
                  style={
                    isDone || isActive
                      ? { background: "var(--color-teal-600)" }
                      : {}
                  }
                >
                  {isDone ? <Check className="w-4 h-4" /> : num}
                </div>
                <span
                  className={cn(
                    "text-sm font-medium",
                    isActive ? "step-active" : isDone ? "step-done" : "step-upcoming"
                  )}
                >
                  {t(step)}
                </span>
              </div>
              {i < visibleSteps.length - 1 && (
                <div
                  className="flex-1 h-0.5 mx-3 transition-colors"
                  style={{
                    background: num < visualCurrent
                      ? "var(--color-teal-400)"
                      : "var(--color-stone-200)",
                  }}
                />
              )}
            </li>
          );
        })}
      </ol>

      {/* Mobile: compact */}
      <div className="md:hidden flex items-center justify-between">
        <span className="text-sm font-medium" style={{ color: "var(--color-teal-700)" }}>
          {t(currentStepKey)}
        </span>
        <span className="text-sm text-stone-400">
          {visualCurrent} / {totalVisible}
        </span>
      </div>

      {/* Mobile progress bar */}
      <div className="md:hidden mt-2 h-1.5 rounded-full" style={{ background: "var(--color-stone-200)" }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            background: "var(--color-teal-600)",
            width: `${(visualCurrent / totalVisible) * 100}%`,
          }}
        />
      </div>
    </div>
  );
}

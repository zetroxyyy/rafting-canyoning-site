"use client";

import { useBooking } from "./BookingContext";
import BookingStepIndicator from "./BookingStepIndicator";
import Step1Activity from "./steps/Step1Activity";
import Step2Date    from "./steps/Step2Date";
import Step3Time    from "./steps/Step3Time";
import Step4People  from "./steps/Step4People";
import Step5Details from "./steps/Step5Details";
import Step6Payment from "./steps/Step6Payment";

const STEPS = [
  Step1Activity,
  Step2Date,
  Step3Time,
  Step4People,
  Step5Details,
  Step6Payment,
];

export default function BookingWizard() {
  const { state } = useBooking();

  // For COMBO bookings, step 3 (Time) is bypassed in the context nav logic.
  // The wizard still uses the same STEPS array — step 3 simply never gets
  // rendered because the context skips from step 2 → 4.
  const StepComponent = STEPS[state.currentStep - 1];

  return (
    <div className="min-h-screen" style={{ background: "var(--color-teal-50)" }}>
      {/*
        Mobile: py-4 px-0 (container handles horizontal padding)
        Tablet+: py-10
      */}
      <div className="container-site py-4 sm:py-10">
        {/* Step indicator — tighter padding on mobile */}
        <div className="card p-4 sm:p-6 mb-4 sm:mb-6">
          <BookingStepIndicator />
        </div>

        {/* Step content — p-4 on mobile, p-8 on md+ */}
        <div className="card p-4 sm:p-6 md:p-8">
          <StepComponent />
        </div>
      </div>
    </div>
  );
}

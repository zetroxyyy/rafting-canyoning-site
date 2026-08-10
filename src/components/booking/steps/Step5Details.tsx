"use client";

import { useTranslations, useLocale } from "next-intl";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useBooking } from "../BookingContext";
import { ChevronLeft } from "lucide-react";
import {
  AGE_ADULT_MIN,
  AGE_CHILD_MAX,
  AGE_CHILD_MIN_RAFTING,
  AGE_CHILD_MIN_CANYONING,
} from "@/lib/schemas";
import { makeBookingDetailsSchema, type BookingDetailsInput } from "@/lib/schemas";

// ─── Inline field-error styles (identical to admin ManualBookingForm) ──────────
//
// The `.error` CSS class sets border-color: red on the input.
// `.field-error` is a small red helper text beneath the field.
// Both are already defined in globals.css.
//
// We deliberately do NOT pass `min` or `max` HTML attributes to the age
// inputs so that no native browser tooltip validation fires.  All age
// validation is handled by Zod (server-safe rules) and surfaced as
// custom inline error text.

export default function Step5Details() {
  const t      = useTranslations("booking.details");
  const locale = useLocale();
  const { state, dispatch, nextStep, prevStep } = useBooking();

  const totalPax = state.adultCount + state.childCount;

  // Determine activity-specific child age minimum for placeholder text.
  const childMin =
    state.activityType === "CANYONING"
      ? AGE_CHILD_MIN_CANYONING
      : AGE_CHILD_MIN_RAFTING;

  const defaultParticipants = Array.from({
    length: totalPax,
  }).map((_, i) => ({
    participantType: (i < state.adultCount ? "ADULT" : "CHILD") as "ADULT" | "CHILD",
    firstName:       state.participants[i]?.firstName ?? "",
    lastName:        state.participants[i]?.lastName  ?? "",
    age:
      state.participants[i]?.age !== undefined
        ? Number(state.participants[i].age)
        : undefined,
    waiverAccepted: false,
  })) as unknown as BookingDetailsInput["participants"];

  // Build an activity-aware schema so client-side inline validation uses the
  // correct child-age minimum (6 for Rafting, 12 for Canyoning).
  const activityAwareSchema = makeBookingDetailsSchema(state.activityType);

  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
  } = useForm<BookingDetailsInput>({
    resolver: zodResolver(activityAwareSchema) as never,
    defaultValues: {
      leadName:     state.leadName,
      leadEmail:    state.leadEmail,
      leadPhone:    state.leadPhone,
      leadCountry:  state.leadCountry,
      customerNote: state.customerNote,
      participants: defaultParticipants,
    },
  });

  const { fields } = useFieldArray({ control, name: "participants" });

  const onSubmit = (data: BookingDetailsInput) => {
    const mapped = data.participants.map((p) => ({
      participantType: p.participantType,
      firstName:       p.firstName,
      lastName:        p.lastName ?? "",
      age:             p.age !== undefined ? String(p.age) : "",
      waiverAccepted:  p.waiverAccepted,
    }));
    dispatch({
      type: "SET_DETAILS",
      payload: {
        leadName:     data.leadName,
        leadEmail:    data.leadEmail,
        leadPhone:    data.leadPhone     ?? "",
        leadCountry:  data.leadCountry   ?? "",
        customerNote: data.customerNote  ?? "",
        participants: mapped,
      },
    });
    nextStep();
  };

  // ── Inline age-error helper ────────────────────────────────────────────────
  //
  // The Zod schema already validates age ranges via superRefine, so
  // errors.participants[i].age.message will always contain the right copy
  // when age rules are violated.  We additionally run a lightweight client-
  // side check to produce friendly, context-aware placeholder text.

  function agePlaceholder(pType: "ADULT" | "CHILD"): string {
    if (pType === "ADULT") return `${AGE_ADULT_MIN}–99`;
    return `${childMin}–${AGE_CHILD_MAX}`;
  }

  function ageHint(pType: "ADULT" | "CHILD"): string {
    if (pType === "ADULT") {
      return locale === "en"
        ? `Age ${AGE_ADULT_MIN}+`
        : `${AGE_ADULT_MIN}歳以上`;
    }
    return locale === "en"
      ? `Age ${childMin}–${AGE_CHILD_MAX}`
      : `${childMin}〜${AGE_CHILD_MAX}歳`;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8" noValidate>
      <div>
        <h2 className="text-2xl font-bold text-stone-900">{t("title")}</h2>
      </div>

      {/* ── Lead Contact ──────────────────────────────────────────────────── */}
      <div className="card p-6 space-y-4">
        <h3 className="font-semibold text-stone-900">
          {locale === "en" ? "Contact Information" : "連絡先情報"}
        </h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="leadName">
              {t("lead_name")} *
            </label>
            <input
              id="leadName"
              {...register("leadName")}
              className={`input ${errors.leadName ? "error" : ""}`}
              placeholder={locale === "en" ? "Full name" : "氏名"}
              maxLength={200}
            />
            {errors.leadName && (
              <p className="field-error">{errors.leadName.message}</p>
            )}
          </div>
          <div>
            <label className="label" htmlFor="leadEmail">
              {t("email")} *
            </label>
            <input
              id="leadEmail"
              type="email"
              {...register("leadEmail")}
              className={`input ${errors.leadEmail ? "error" : ""}`}
              placeholder="you@example.com"
            />
            {errors.leadEmail && (
              <p className="field-error">{errors.leadEmail.message}</p>
            )}
          </div>
          <div>
            <label className="label" htmlFor="leadPhone">
              {t("phone")}
            </label>
            <input
              id="leadPhone"
              type="tel"
              {...register("leadPhone")}
              className="input"
              placeholder={locale === "en" ? "+81 xxx xxx xxxx" : "電話番号"}
              maxLength={30}
            />
          </div>
          <div>
            <label className="label" htmlFor="leadCountry">
              {t("country")}
            </label>
            <input
              id="leadCountry"
              {...register("leadCountry")}
              className="input"
              placeholder={locale === "en" ? "Australia, Japan..." : "日本、オーストラリアなど"}
              maxLength={100}
            />
          </div>
        </div>
      </div>

      {/* ── Participants ──────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <h3 className="font-semibold text-stone-900">{t("participants")}</h3>
        {fields.map((field, i) => {
          const pType = i < state.adultCount ? "ADULT" : "CHILD";
          const label =
            pType === "ADULT"
              ? locale === "en"
                ? `Adult ${i + 1}`
                : `大人${i + 1}`
              : locale === "en"
              ? `Child ${i - state.adultCount + 1}`
              : `子ども${i - state.adultCount + 1}`;

          // Resolve the Zod field-level error message for the age field.
          // errors.participants[i].age.message is populated by the superRefine
          // logic in makeParticipantSchema — activity-aware, server-identical.
          const ageError = errors.participants?.[i]?.age?.message;

          return (
            <div key={field.id} className="card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-stone-700">{label}</h4>
                <span
                  className={pType === "ADULT" ? "badge badge-teal" : "badge badge-blue"}
                >
                  {pType === "ADULT"
                    ? locale === "en" ? "Adult" : "大人"
                    : locale === "en" ? "Child" : "子ども"}
                </span>
              </div>

              {/* Hidden participantType — must be in form payload */}
              <input
                type="hidden"
                {...register(`participants.${i}.participantType`)}
                value={pType}
              />

              <div className="grid sm:grid-cols-3 gap-3">
                {/* First name */}
                <div>
                  <label className="label" htmlFor={`p-${i}-firstName`}>
                    {t("first_name")} *
                  </label>
                  <input
                    id={`p-${i}-firstName`}
                    {...register(`participants.${i}.firstName`)}
                    className={`input ${
                      errors.participants?.[i]?.firstName ? "error" : ""
                    }`}
                    maxLength={100}
                  />
                  {errors.participants?.[i]?.firstName && (
                    <p className="field-error">
                      {errors.participants[i]!.firstName!.message}
                    </p>
                  )}
                </div>

                {/* Last name */}
                <div>
                  <label className="label" htmlFor={`p-${i}-lastName`}>
                    {t("last_name")}
                  </label>
                  <input
                    id={`p-${i}-lastName`}
                    {...register(`participants.${i}.lastName`)}
                    className="input"
                  />
                </div>

                {/* Age — NO native min/max; all validation via Zod inline errors */}
                <div>
                  <label className="label" htmlFor={`p-${i}-age`}>
                    {t("age")}
                    <span className="ml-1.5 text-xs font-normal text-stone-400">
                      ({ageHint(pType)})
                    </span>
                  </label>
                  <input
                    id={`p-${i}-age`}
                    type="number"
                    inputMode="numeric"
                    {...register(`participants.${i}.age`, {
                      setValueAs: (v) => (v === "" ? undefined : Number(v)),
                    })}
                    className={`input ${ageError ? "error" : ""}`}
                    placeholder={agePlaceholder(pType)}
                    // ⚠ NO min/max attributes — prevents native browser tooltip.
                    // Validation is done by Zod superRefine; error shown inline below.
                  />
                  {ageError && (
                    <p className="field-error" role="alert">
                      {/* Translate the schema message when in Japanese locale */}
                      {locale === "ja"
                        ? translateAgeError(ageError, pType, childMin)
                        : ageError}
                    </p>
                  )}
                </div>
              </div>

              {/* Safety waiver — required per participant */}
              <div
                className="rounded-lg p-4"
                style={{ background: "var(--color-teal-50)" }}
              >
                <p className="text-sm text-stone-600 mb-3">{t("waiver_text")}</p>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    id={`p-${i}-waiver`}
                    type="checkbox"
                    {...register(`participants.${i}.waiverAccepted`)}
                    className="accent-teal-600 w-4 h-4 mt-0.5 flex-shrink-0"
                  />
                  <span className="text-sm font-medium text-stone-700">
                    {locale === "en"
                      ? "I accept the safety waiver for this participant"
                      : "この参加者の安全確認同意書に同意します"}{" "}
                    *
                  </span>
                </label>
                {errors.participants?.[i]?.waiverAccepted && (
                  <p className="field-error mt-1">{t("waiver_required")}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Notes ─────────────────────────────────────────────────────────── */}
      <div>
        <label className="label" htmlFor="customerNote">
          {t("notes")}
        </label>
        <textarea
          id="customerNote"
          {...register("customerNote")}
          className="input min-h-[100px] resize-y"
          placeholder={t("notes_placeholder")}
          maxLength={2000}
        />
      </div>

      {/* ── Navigation ────────────────────────────────────────────────────── */}
      <div className="flex justify-between pt-2">
        <button
          type="button"
          onClick={prevStep}
          className="btn btn-ghost flex items-center gap-1"
        >
          <ChevronLeft className="w-4 h-4" />
          {locale === "en" ? "Back" : "戻る"}
        </button>
        <button type="submit" id="step5-next" className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
          {locale === "en" ? "Continue to Booking" : "予約に進む"}
        </button>
      </div>
    </form>
  );
}

// ─── Japanese error message translation ───────────────────────────────────────
//
// The Zod schema messages are in English (single source of truth).
// Map common patterns to Japanese equivalents for the JA locale.

function translateAgeError(
  msg: string,
  pType: "ADULT" | "CHILD",
  childMin: number
): string {
  if (pType === "ADULT") {
    if (msg.includes("18")) return `大人は18歳以上である必要があります。`;
    if (msg.includes("99")) return `有効な年齢を入力してください（最大99歳）。`;
  }
  if (pType === "CHILD") {
    if (msg.includes("younger") || msg.includes("17")) {
      return `子どもは17歳以下である必要があります。18歳以上は大人としてご予約ください。`;
    }
    if (msg.includes("at least") || msg.includes(String(childMin))) {
      return `このアクティビティの子ども参加者は${childMin}歳以上である必要があります。`;
    }
  }
  return msg; // fallback: return English message
}

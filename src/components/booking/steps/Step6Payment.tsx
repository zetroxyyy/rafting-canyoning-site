"use client";

import { useTranslations, useLocale } from "next-intl";
import { useBooking } from "../BookingContext";
import type { BookingPrices } from "../BookingContext";
import {
  ChevronLeft,
  Loader2,
  Lock,
  Phone,
  CheckCircle2,
  ClipboardList,
  Calendar,
  Users,
} from "lucide-react";
import { useState, useTransition } from "react";
import { formatJpy } from "@/lib/utils";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";

// ─── Derived pricing ──────────────────────────────────────────────────────────

function deriveLineItems(
  activityType: "RAFTING" | "CANYONING" | "COMBO" | null,
  adultCount: number,
  childCount: number,
  locale: string,
  prices: BookingPrices
): { label: string; amount: number }[] {
  const items: { label: string; amount: number }[] = [];
  if (!activityType) return items;

  const isEn = locale === "en";

  if (activityType === "COMBO") {
    items.push({
      label: isEn
        ? `Rafting + Canyoning Combo × ${adultCount} adult${adultCount !== 1 ? "s" : ""}`
        : `ラフティング＋キャニオニング コンボ × 大人${adultCount}名`,
      amount: adultCount * prices.comboAdult,
    });
    if (childCount > 0) {
      items.push({
        label: isEn
          ? `Rafting + Canyoning Combo × ${childCount} child${childCount !== 1 ? "ren" : ""}`
          : `ラフティング＋キャニオニング コンボ × 子ども${childCount}名`,
        amount: childCount * prices.comboChild,
      });
    }
  } else if (activityType === "RAFTING") {
    items.push({
      label: isEn
        ? `River Rafting × ${adultCount} adult${adultCount !== 1 ? "s" : ""}`
        : `ラフティング × 大人${adultCount}名`,
      amount: adultCount * prices.raftingAdult,
    });
    if (childCount > 0) {
      items.push({
        label: isEn
          ? `River Rafting × ${childCount} child${childCount !== 1 ? "ren" : ""}`
          : `ラフティング × 子ども${childCount}名`,
        amount: childCount * prices.raftingChild,
      });
    }
  } else {
    // Canyoning
    items.push({
      label: isEn
        ? `Canyoning × ${adultCount} adult${adultCount !== 1 ? "s" : ""}`
        : `キャニオニング × 大人${adultCount}名`,
      amount: adultCount * prices.canyoningAdult,
    });
    if (childCount > 0) {
      items.push({
        label: isEn
          ? `Canyoning × ${childCount} child${childCount !== 1 ? "ren" : ""}`
          : `キャニオニング × 子ども${childCount}名`,
        amount: childCount * prices.canyoningChild,
      });
    }
  }

  return items;
}

// ─── Success screen ───────────────────────────────────────────────────────────

function SuccessScreen({
  reference,
  locale,
}: {
  reference: string;
  locale: string;
}) {
  // Root-domain Japanese: 'ja' uses root paths, 'en' uses /en prefix
  const lp = (href: string) => locale === "ja" ? href : `/en${href}`;

  return (
    <div className="space-y-6 text-center py-4">
      {/* Success icon */}
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
        style={{ background: "linear-gradient(135deg, var(--color-teal-500), var(--color-teal-700))" }}
      >
        <CheckCircle2 className="w-10 h-10 text-white" />
      </div>

      <div>
        <h2 className="text-2xl font-extrabold text-stone-900 mb-2">
          {locale === "en" ? "Request Submitted!" : "リクエスト送信完了！"}
        </h2>
        <p className="text-stone-500 text-sm">
          {locale === "en"
            ? "Your reservation request has been successfully logged."
            : "ご予約リクエストが正常に受け付けられました。"}
        </p>
      </div>

      {/* Reference number */}
      <div
        className="rounded-2xl p-5 mx-auto max-w-xs"
        style={{ background: "var(--color-teal-50)", border: "1px solid var(--color-teal-200)" }}
      >
        <p className="text-xs font-semibold uppercase tracking-wider text-teal-600 mb-1">
          {locale === "en" ? "Reference Number" : "予約参照番号"}
        </p>
        <p className="font-extrabold text-2xl text-stone-900 tracking-widest">
          {reference}
        </p>
      </div>

      {/* What happens next */}
      <div
        className="rounded-2xl p-6 text-left space-y-4"
        style={{ background: "linear-gradient(135deg, #f0fdfa, #e6fffa)", border: "1px solid #99f6e4" }}
      >
        <p className="font-bold text-stone-900 text-sm uppercase tracking-wide">
          {locale === "en" ? "What Happens Next" : "次のステップ"}
        </p>
        <div className="space-y-3">
          {[
            {
              icon: <ClipboardList className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />,
              text: locale === "en"
                ? "Your request is temporarily booked in our system under the reference above."
                : "上記の参照番号でシステムに一時的に確保されました。",
            },
            {
              icon: <Phone className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />,
              text: locale === "en"
                ? "A concierge specialist will reach out via call or email within 24 hours to confirm your schedule and complete the reservation."
                : "コンシェルジュがお電話またはメールにて24時間以内にご連絡し、日程の確認と予約を完了いたします。",
            },
            {
              icon: <Calendar className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />,
              text: locale === "en"
                ? "Payment will be arranged directly with our team — no online payment is required at this stage."
                : "お支払いはスタッフと直接調整いたします。この段階でオンライン決済は不要です。",
            },
          ].map((item, i) => (
            <div key={i} className="flex gap-3 items-start text-sm text-stone-600">
              {item.icon}
              <p>{item.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Japanese carrier email warning */}
      {locale === "ja" && (
        <div
          className="rounded-2xl p-5 text-left"
          style={{
            background: "#fffbeb",
            border: "1px solid #fde68a",
          }}
        >
          <p className="font-bold text-amber-800 text-sm mb-2 flex items-center gap-2">
            <span>⚠️</span>
            キャリアメールをご利用の方へ
          </p>
          <p className="text-amber-700 text-xs leading-relaxed">
            docomo・au（ezweb）・softbankなどのキャリアメール（@docomo.ne.jp, @ezweb.ne.jp, @softbank.ne.jp など）をご利用の場合、
            <strong>迷惑メールフィルターにより弊社からのメールが届かない場合</strong>があります。
            お手数ですが「thedreamadventure.com」からのメールを受信できるよう設定いただくか、
            <strong>GmailやYahooメール等のフリーメール</strong>でのご予約をおすすめします。
          </p>
        </div>
      )}

      {/* CTA */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href={lp("/")}
          className="btn btn-outline"
        >
          {locale === "en" ? "Return to Home" : "トップへ戻る"}
        </Link>
        <Link
          href={lp("/contact")}
          className="btn btn-primary"
        >
          {locale === "en" ? "Contact Us" : "お問い合わせ"}
        </Link>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Step6Payment() {
  const t = useTranslations("booking.payment");
  const locale = useLocale();
  // Root-domain Japanese: 'ja' uses root paths, 'en' uses /en prefix
  const lp = (href: string) => locale === "ja" ? href : `/en${href}`;
  const { state, prices, dispatch, prevStep } = useBooking();
  const router = useRouter();
  const pathname = usePathname();

  // SAFEGUARD: If the URL has no /en prefix (root domain = Japanese),
  // explicitly use 'ja' for the booking payload. Never default to English on root.
  const bookingLocale = pathname.startsWith("/en") ? "en" : "ja";

  const [promoInput, setPromoInput] = useState(state.promoCode ?? "");
  const [promoError, setPromoError] = useState("");
  const [isCheckingPromo, startPromoCheck] = useTransition();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [successRef, setSuccessRef] = useState<string | null>(null);

  const isCombo = state.activityType === "COMBO";

  // ── Derived totals ─────────────────────────────────────────────────────────
  const lineItems = deriveLineItems(
    state.activityType,
    state.adultCount,
    state.childCount,
    locale,
    prices
  );
  const subtotal = lineItems.reduce((s, i) => s + i.amount, 0);
  const total = subtotal - state.discountJpy;

  // ── Promo ──────────────────────────────────────────────────────────────────
  const applyPromo = () => {
    setPromoError("");
    startPromoCheck(async () => {
      try {
        const res = await fetch("/api/promo/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: promoInput, bookingSubtotal: subtotal }),
        });
        const data = await res.json();
        if (data.valid) {
          dispatch({
            type: "SET_PROMO",
            payload: { code: promoInput, valid: true, discountJpy: data.discountJpy },
          });
        } else {
          setPromoError(t("promo_invalid"));
          dispatch({
            type: "SET_PROMO",
            payload: { code: promoInput, valid: false, discountJpy: 0 },
          });
        }
      } catch {
        setPromoError(
          locale === "en"
            ? "Could not validate promo code."
            : "プロモーションコードを確認できませんでした。"
        );
      }
    });
  };

  // ── Submit Reservation Request ─────────────────────────────────────────────
  const handleSubmit = async () => {
    setSubmitError("");
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/booking/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activityType: state.activityType === "COMBO" ? "RAFTING" : state.activityType,
          productId: state.productId,
          slotId: state.slotId || "COMBO_FLEXIBLE",
          hasBbq: state.hasBbq,
          adultCount: state.adultCount,
          childCount: state.childCount,
          leadName: state.leadName,
          leadEmail: state.leadEmail,
          leadPhone: state.leadPhone,
          leadCountry: state.leadCountry,
          customerNote: isCombo
            ? `[COMBO PACKAGE] ${state.customerNote || ""}`.trim()
            : state.customerNote,
          promoCode: state.promoValid ? state.promoCode : undefined,
          // bookingLocale is derived from the URL pathname — if no /en prefix,
          // this is root domain Japanese and MUST send 'ja' to the API.
          locale: bookingLocale,
          termsAccepted: true,
          waiverAccepted: true,
          cancellationPolicyAccepted: true,
          marketingConsent: false,
          photoConsent: false,
          participants: state.participants,
          isComboBooking: isCombo,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const errMap: Record<string, string> = {
          SLOT_FULL: locale === "en"
            ? "Sorry, this time slot just became full. Please go back and choose another."
            : "申し訳ありません、このスロットは満席になりました。別の時間をお選びください。",
          SLOT_UNAVAILABLE: locale === "en"
            ? "This slot is no longer available. Please go back and choose a different time."
            : "このスロットは利用できません。別の時間をお選びください。",
          BOOKING_TOO_LATE: locale === "en"
            ? "Online bookings require at least 1 day advance notice. Please contact us directly for last-minute reservations."
            : "オンライン予約は前日までにお願いします。当日のご予約は直接お問い合わせください。",
          SLOT_NOT_FOUND: locale === "en"
            ? "The selected time slot is no longer available. Please go back and choose a new date."
            : "選択された時間帯はご利用いただけません。別の日程をお選びください。",
        };
        throw new Error(
          errMap[data.error] ??
          (locale === "en" ? "Something went wrong. Please try again." : "エラーが発生しました。")
        );
      }

      // Show success screen with reference number
      setSuccessRef(data.reference ?? data.bookingId ?? "PENDING");
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : locale === "en"
            ? "An unexpected error occurred."
            : "予期せぬエラーが発生しました。"
      );
      setIsSubmitting(false);
    }
  };

  // ── Show success screen ────────────────────────────────────────────────────
  if (successRef) {
    return <SuccessScreen reference={successRef} locale={locale} />;
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 w-full box-border overflow-hidden">
      <div>
        <h2 className="text-2xl font-bold text-stone-900">
          {locale === "en" ? "Review & Request Reservation" : "予約内容確認・リクエスト"}
        </h2>
        <p className="text-stone-500 text-sm mt-1">
          {locale === "en"
            ? "Review your booking details below, then submit your reservation request."
            : "予約内容をご確認のうえ、予約リクエストを送信してください。"}
        </p>
      </div>

      {/* ── Combo flexible timing notice ─────────────────────────────────── */}
      {isCombo && (
        <div
          className="rounded-2xl p-5 flex gap-4 items-start"
          style={{
            background: "linear-gradient(135deg, #0f766e08, #0d948808)",
            border: "1px solid var(--color-teal-200)",
          }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "var(--color-teal-100)" }}
          >
            <Phone className="w-5 h-5 text-teal-700" />
          </div>
          <div>
            <p className="font-bold text-stone-900 text-sm mb-1">
              {locale === "en" ? "Flexible Timeline — Concierge Scheduling" : "フレキシブルスケジュール"}
            </p>
            <p className="text-stone-600 text-sm leading-relaxed">
              {locale === "en"
                ? "Standalone activity choices lock explicit hour blocks from our daily schedule (9:00 AM, 11:30 AM, or 1:30 PM). By selecting the Combo Pack, you have activated a priority request — our operations desk will call you directly to align your ideal sequence for both activities across the day."
                : "単独のアクティビティ選択では、毎日のスケジュールから時間枠（9:00・11:30・13:30）を確定します。コンボパックをお選びいただくと優先リクエストが発動し、オペレーションチームが直接お電話して、1日を通じた2つのアクティビティの理想的なスケジュールを調整いたします。"}
            </p>
          </div>
        </div>
      )}

      {/* ── Order summary card ──────────────────────────────────────────── */}
      <div className="card p-6 space-y-3">
        <h3 className="font-semibold text-stone-900 mb-3">{t("summary")}</h3>

        {/* Activity type */}
        <div className="flex justify-between text-sm pb-3 border-b border-stone-100">
          <span className="text-stone-500">
            {locale === "en" ? "Activity" : "アクティビティ"}
          </span>
          <span className="font-medium text-stone-800">
            {state.activityType === "COMBO"
              ? (locale === "en" ? "Rafting + Canyoning Combo" : "ラフティング＋キャニオニング")
              : state.activityType === "RAFTING"
                ? (locale === "en" ? "River Rafting" : "ラフティング")
                : (locale === "en" ? "Canyoning" : "キャニオニング")}
          </span>
        </div>

        {/* Date / time */}
        <div className="flex justify-between text-sm pb-3 border-b border-stone-100">
          <span className="text-stone-500">
            {locale === "en" ? "Date & Time" : "日程・時間"}
          </span>
          <span className="font-medium text-stone-800">
            {state.selectedDate &&
              new Date(state.selectedDate + "T00:00:00").toLocaleDateString(
                locale === "ja" ? "ja-JP" : "en-US",
                { month: "short", day: "numeric", year: "numeric" }
              )}{" "}
            {isCombo
              ? (locale === "en" ? "· Flexible (TBD)" : "· フレキシブル（要調整）")
              : state.startTime
                ? `· ${state.startTime}`
                : ""}
          </span>
        </div>

        {/* Participants */}
        <div className="flex justify-between text-sm pb-3 border-b border-stone-100">
          <span className="text-stone-500">
            {locale === "en" ? "Participants" : "参加者"}
          </span>
          <span className="font-medium text-stone-800 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-stone-400" />
            {locale === "en"
              ? `${state.adultCount} adult${state.adultCount !== 1 ? "s" : ""}${state.childCount > 0 ? `, ${state.childCount} child${state.childCount !== 1 ? "ren" : ""}` : ""}`
              : `大人${state.adultCount}名${state.childCount > 0 ? `・子ども${state.childCount}名` : ""}`}
          </span>
        </div>

        {/* Line items — one per pricing category */}
        {lineItems.map((item, idx) => (
          <div key={idx} className="flex justify-between text-sm">
            <span className="text-stone-600">{item.label}</span>
            <span className="font-medium text-stone-900">{formatJpy(item.amount)}</span>
          </div>
        ))}

        {/* BBQ — pay on arrival notice */}
        {state.hasBbq && (
          <div className="flex justify-between text-sm pt-2 border-t border-stone-100">
            <span className="text-stone-500">{t("bbq_excluded")}</span>
            <span className="badge badge-amber text-xs">
              {locale === "en" ? "On arrival" : "現地払い"}
            </span>
          </div>
        )}

        {/* Totals */}
        <div className="border-t border-stone-200 pt-3 mt-2 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-stone-600">{t("subtotal")}</span>
            <span className="text-stone-900">{formatJpy(subtotal)}</span>
          </div>
          {state.discountJpy > 0 && (
            <div className="flex justify-between text-sm">
              <span style={{ color: "var(--color-teal-600)" }}>{t("discount")}</span>
              <span style={{ color: "var(--color-teal-600)" }}>
                - {formatJpy(state.discountJpy)}
              </span>
            </div>
          )}
          <div className="flex justify-between font-bold text-xl pt-2">
            <span className="text-stone-900">{t("total")}</span>
            <span style={{ color: "var(--color-teal-700)" }}>{formatJpy(total)}</span>
          </div>
          <p className="text-xs text-stone-400 text-right">
            {locale === "en" ? "Tax included · JPY only" : "税込・円のみ"}
          </p>
        </div>
      </div>

      {/* ── Payment details notice ───────────────────────────────────────── */}
      <div
        className="rounded-xl p-4 space-y-2"
        style={{ background: "#fafaf9", border: "1px solid #e7e5e4" }}
      >
        <p className="font-semibold text-stone-800 text-sm flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-teal-600" />
          {locale === "en" ? "Payment Information" : "お支払いについて"}
        </p>
        <p className="text-stone-600 text-sm leading-relaxed">
          {locale === "en"
            ? "No payment is collected online. Our team will contact you within 24 hours to confirm your booking and arrange payment by cash or bank transfer directly on arrival."
            : "オンラインでのお支払いは不要です。スタッフが24時間以内にご連絡し、現地での現金または銀行振込によるお支払いを調整いたします。"}
        </p>
      </div>

      {/* ── Promo code ──────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <label className="label" htmlFor="promo-input">
          {t("promo")}
        </label>
        <div className="flex gap-2">
          <input
            id="promo-input"
            type="text"
            value={promoInput}
            onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
            className="input flex-1 min-w-0"
            placeholder={locale === "en" ? "PROMO2026" : "コードを入力"}
            disabled={state.promoValid === true || isSubmitting}
            maxLength={50}
            autoCapitalize="characters"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            inputMode="text"
          />
          <button
            id="promo-apply"
            onClick={applyPromo}
            disabled={!promoInput || state.promoValid === true || isCheckingPromo || isSubmitting}
            className="btn btn-outline"
          >
            {isCheckingPromo ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              t("promo_apply")
            )}
          </button>
        </div>
        {state.promoValid === true && (
          <p className="text-sm font-medium flex items-center gap-1.5 min-w-0" style={{ color: "var(--color-teal-600)" }}>
            <span className="flex-shrink-0">✓</span>
            <span className="truncate" style={{ maxWidth: "180px" }}>{t("promo_valid")} — {state.promoCode}</span>
            <span className="flex-shrink-0">{formatJpy(state.discountJpy)} {locale === "en" ? "off" : "割引"}</span>
          </p>
        )}
        {promoError && <p className="field-error">{promoError}</p>}
      </div>

      {/* ── Terms ───────────────────────────────────────────────────────── */}
      <p className="text-xs text-stone-500 leading-relaxed">
        {t("terms_agree")}{" "}
        <Link href={lp("/terms")} className="underline" target="_blank">
          {locale === "en" ? "Terms & Conditions" : "利用規約"}
        </Link>
      </p>

      {/* ── Submit error ─────────────────────────────────────────────────── */}
      {submitError && (
        <div className="rounded-lg p-4 bg-red-50 border border-red-200">
          <p className="text-sm text-red-700">{submitError}</p>
        </div>
      )}

      {/* ── Navigation ──────────────────────────────────────────────────── */}
      <div className="flex justify-between pt-2">
        <button
          onClick={prevStep}
          disabled={isSubmitting}
          className="btn btn-ghost flex items-center gap-1"
        >
          <ChevronLeft className="w-4 h-4" />
          {locale === "en" ? "Back" : "戻る"}
        </button>
        <button
          id="step6-submit"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="btn btn-primary py-3 px-6 text-sm md:text-base whitespace-normal text-center flex items-center gap-2 max-w-[260px] sm:max-w-none disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: "linear-gradient(135deg, var(--color-teal-600), var(--color-teal-700))",
            boxShadow: "0 4px 14px rgba(13,148,136,0.35)",
          }}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
              {locale === "en" ? "Submitting…" : "送信中…"}
            </>
          ) : (
            <>
              <ClipboardList className="w-4 h-4 flex-shrink-0" />
              {locale === "en" ? "Submit Reservation Request" : "予約リクエストを送信"}
            </>
          )}
        </button>
      </div>
    </div>
  );
}

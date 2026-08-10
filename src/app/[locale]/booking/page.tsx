/**
 * Public Booking Page (Server Component)
 *
 * Responsibilities:
 *   1. Check grandOpeningMode — if ON, render the premium "Grand Opening Soon"
 *      full-page screen so the booking engine never mounts.
 *   2. Check maintenanceMode — if ON, render a maintenance screen.
 *   3. Check isOffSeasonMode — if ON, render the off-season screen.
 *   4. Mount BookingProvider (with DEFAULT_PRICES from context) and BookingWizard.
 *
 * Grand Opening Mode is controlled by the GRAND_OPENING_SOON env var (default: true).
 * Set GRAND_OPENING_SOON=false in Vercel to open bookings when ready.
 */

import { BookingProvider } from "@/components/booking/BookingContext";
import BookingWizard       from "@/components/booking/BookingWizard";
import GrandOpeningGate    from "@/components/ui/GrandOpeningGate";
import { getSettings }     from "@/app/actions/admin/settings";
import { getGrandOpeningMode } from "@/lib/maintenance";
import { getLocale }          from "next-intl/server";
import { Wrench, Calendar }   from "lucide-react";
import type { Metadata }      from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isJa = locale === "ja";
  return {
    title: isJa ? "ご予約" : "Book Your Adventure",
    alternates: {
      canonical: isJa ? "/booking" : "/en/booking",
      languages: {
        ja: "/booking",
        en: "/en/booking",
        "x-default": "/booking",
      },
    },
  };
}

export default async function BookingPage() {
  const [settings, locale] = await Promise.all([
    getSettings(),
    getLocale(),
  ]);

  const { maintenanceMode, isOffSeasonMode } = settings;
  const grandOpeningSoon = getGrandOpeningMode();

  // ── Grand Opening gate (highest priority) ──────────────────────────────────
  if (grandOpeningSoon) {
    return <GrandOpeningGate locale={locale} fullPage />;
  }

  // ── Full-page maintenance gate ─────────────────────────────────────────────
  if (maintenanceMode) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4 py-16 text-center"
        style={{ background: "var(--color-teal-50)" }}
      >
        <div className="max-w-md mx-auto">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
            style={{ background: "var(--color-amber-100)" }}
          >
            <Wrench className="w-8 h-8 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold text-stone-900 mb-3">
            {locale === "ja"
              ? "予約システムメンテナンス中"
              : "Booking Temporarily Unavailable"}
          </h1>
          <p className="text-stone-500 text-sm leading-relaxed mb-8">
            {locale === "ja"
              ? "現在、予約システムのメンテナンスを行っております。大変ご不便をおかけしますが、しばらくしてから再度お試しください。"
              : "We are currently performing scheduled maintenance on our booking system. Please check back shortly — we'll be back online very soon!"}
          </p>
          <a href={locale === "ja" ? "/" : "/en"} className="btn btn-outline">
            {locale === "ja" ? "トップページへ戻る" : "Return to Home"}
          </a>
        </div>
      </div>
    );
  }

  // ── Full-page off-season gate ─────────────────────────────────────────────
  if (isOffSeasonMode) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4 py-16 text-center"
        style={{ background: "var(--color-teal-50)" }}
      >
        <div className="max-w-md mx-auto">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
            style={{ background: "rgba(13,148,136,0.1)" }}
          >
            <Calendar className="w-8 h-8 text-teal-600" />
          </div>
          <h1 className="text-2xl font-bold text-stone-900 mb-3">
            {locale === "ja"
              ? "今シーズンの営業終了"
              : "Season Concluded"}
          </h1>
          <p className="text-stone-500 text-sm leading-relaxed mb-8">
            {locale === "ja"
              ? "今シーズンの営業は終了いたしました。素晴らしい1年をありがとうございました！来シーズンの予約受付は間もなく開始いたします。"
              : "Our current season has concluded. Thank you for an amazing year! Bookings for next season will open soon."}
          </p>
          <a href={locale === "ja" ? "/" : "/en"} className="btn btn-outline">
            {locale === "ja" ? "トップページへ戻る" : "Return to Home"}
          </a>
        </div>
      </div>
    );
  }

  return (
    <BookingProvider>
      <BookingWizard />
    </BookingProvider>
  );
}

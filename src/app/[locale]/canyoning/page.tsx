import { getTranslations, getLocale } from "next-intl/server";
import Link from "next/link";
import { ArrowRight, Check, Shield, Clock, Users, Wrench, Calendar, Sparkles } from "lucide-react";
import type { Metadata }      from "next";
import { getSettings } from "@/app/actions/admin/settings";
import { getGrandOpeningMode } from "@/lib/maintenance";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isJa = locale === "ja";
  return {
    title: isJa
      ? "キャニオニング＆シャワークライミングツアー | 群馬県沼田市"
      : "Canyoning in Gunma | Explore Natural Waterslides near Numata",
    description: isJa
      ? "群馬県沼田市の美しい渓谷で、天然のウォータースライダーや滝壺へのジャンプに挑戦！プロのガイドが安全にサポートします。"
      : "Experience canyoning in Gunma! Slither down natural rock slides and jump into deep pools near Numata. Dynamic guided canyoning tours with safety gear included.",
    alternates: {
      canonical: locale === "ja" ? "/canyoning" : `/en/canyoning`,
      languages: {
        en: "/en/canyoning",
        ja: "/canyoning",
        "x-default": "/canyoning",
      },
    },
    openGraph: {
      title: isJa
        ? "キャニオニング＆シャワークライミングツアー | 群馬県沼田市"
        : "Canyoning in Gunma | Explore Natural Waterslides near Numata",
      description: isJa
        ? "群馬県沼田市の美しい渓谷で、天然のウォータースライダーや滝壺へのジャンプに挑戦！"
        : "Experience canyoning in Gunma! Slither down natural rock slides and jump into deep pools near Numata.",
      url: locale === "ja" ? "https://thedreamadventure.com/canyoning" : `https://thedreamadventure.com/en/canyoning`,
      type: "article",
    },
  };
}

export default async function CanyoningPage() {
  const t      = await getTranslations("canyoning");
  const locale = await getLocale();
  const lp = (href: string) => locale === "ja" ? href : `/en${href}`;
  const included = t.raw("included_items") as string[];
  const settings = await getSettings();
  const maintenanceMode = settings.maintenanceMode;
  const isOffSeasonMode = settings.isOffSeasonMode;
  const grandOpeningSoon = getGrandOpeningMode();

  return (
    <>
      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-24 md:py-32 bg-gradient-to-br from-teal-950 via-teal-900 to-emerald-950" id="canyoning-hero">
        {/* Subtle geometric light or abstract overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(20,184,166,0.15),transparent_50%)]" aria-hidden="true" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.1),transparent_50%)]" aria-hidden="true" />
        <div className="absolute inset-0 bg-black/10" aria-hidden="true" />

        <div className="container-site relative">
          <div className="max-w-2xl">
            <span className="text-teal-300 text-sm font-medium uppercase tracking-wider block mb-4">
              {locale === "en" ? "Outdoor Adventure in Gunma" : "群馬アウトドア・アドベンチャー"}
            </span>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-5">
              {locale === "en" ? "Gunma Canyoning Tours" : "群馬キャニオニング・シャワークライミング体験ツアー"}
            </h1>
            <p className="text-teal-100 text-lg mb-8">
              {locale === "en"
                ? "Explore beautiful hidden gorges, slide down natural rock waterslides, and dive into crystal-clear mountain pools. Professional-guided canyoning tours in Gunma."
                : "群馬県沼田市の美しい秘境渓谷を舞台に、天然の岩肌ウォータースライダーを滑り降り、澄み切った滝壺へダイブ！経験豊富なプロのガイドが完全サポートする、安全で爽快な群馬キャニオニング体験をご提供します。"}
            </p>
            {grandOpeningSoon ? (
              <span className="inline-flex items-center gap-2 text-sm font-bold text-white bg-white/20 rounded-xl px-5 py-3 border border-white/30">
                <Sparkles className="w-4 h-4 animate-pulse" />
                {locale === "en" ? "Grand Opening Soon!" : "近日グランドオープン！"}
              </span>
            ) : maintenanceMode ? (
              <span className="inline-flex items-center gap-2 text-sm text-white/70 bg-white/10 rounded-xl px-5 py-3 border border-white/20">
                <Wrench className="w-4 h-4" />
                {locale === "en" ? "Booking temporarily unavailable" : "予約は一時的にご利用いただけません"}
              </span>
            ) : isOffSeasonMode ? (
              <div className="bg-white/10 border border-white/20 rounded-xl px-5 py-4 text-white text-sm max-w-md flex items-start gap-3">
                <Calendar className="w-5 h-5 text-teal-300 flex-shrink-0 mt-0.5" />
                <span>
                  {locale === "en"
                    ? "Our current season has concluded. Thank you for an amazing year! Bookings for next season will open soon."
                    : "今シーズンの営業は終了いたしました。素晴らしい1年をありがとうございました！来シーズンの予約受付は間もなく開始いたします。"}
                </span>
              </div>
            ) : (
              <Link
                href={lp("/booking")}
                id="canyoning-book-btn"
                className="btn btn-lg"
                style={{ background: "white", color: "var(--color-teal-700)" }}
              >
                {locale === "en" ? "Book Now" : "予約する"}
                <ArrowRight className="w-5 h-5" />
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ── Key stats bar ─────────────────────────────────────────────── */}
      <section className="bg-white border-b border-stone-100">
        <div className="container-site py-5">
          <div className="flex flex-wrap items-center justify-center gap-8 text-sm">
            <div className="flex items-center gap-2 text-stone-600">
              <Users className="w-4 h-4 text-teal-500 flex-shrink-0" />
              <span>
                {locale === "en" ? "Max 35 participants per departure" : "1便あたり最大35名"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-stone-600">
              <Clock className="w-4 h-4 text-teal-500 flex-shrink-0" />
              <span>
                {locale === "en" ? "Three daily departures: 9:00 AM · 11:30 AM · 1:30 PM" : "1日3便: 9:00 · 11:30 · 13:30"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-stone-600">
              <Shield className="w-4 h-4 text-teal-500 flex-shrink-0" />
              <span>
                {locale === "en" ? "Ages 12 and up" : "12歳以上"}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Quick Answer (GEO/AEO) ─────────────────────────────────────── */}
      {/* Statically server-rendered — AI crawlers read this from raw HTML  */}
      <section className="bg-stone-50 border-b border-stone-100">
        <div className="container-site py-6">
          <div className="card p-5 max-w-3xl mx-auto">
            <p className="text-sm text-stone-700 leading-relaxed">
              {t("quick_answer")}
            </p>
          </div>
        </div>
      </section>

      {/* ── Pricing ───────────────────────────────────────────────────── */}
      <section className="section bg-white" id="canyoning-pricing">
        <div className="container-site">
          <div className="grid md:grid-cols-2 gap-12 items-start">
            <div>
              <span className="section-label">{locale === "en" ? "Pricing" : "料金"}</span>
              <h2 className="text-3xl font-bold text-stone-900 mb-4">
                {locale === "en" ? "Gunma Canyoning Tour Prices" : "群馬キャニオニングツアー料金体系"}
              </h2>
              <p className="text-stone-600 mb-6">{t("age_rule")}</p>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="card p-5 text-center">
                  <p className="text-sm text-stone-500 mb-1">{locale === "en" ? "Adult" : "大人"}</p>
                  <p className="text-3xl font-bold" style={{ color: "var(--color-teal-700)" }}>¥6,000</p>
                  <p className="text-xs text-stone-400 mt-1">{locale === "en" ? "Tax included" : "税込"}</p>
                </div>
                <div className="card p-5 text-center">
                  <p className="text-sm text-stone-500 mb-1">{locale === "en" ? "Child (12–17)" : "子ども（12〜17歳）"}</p>
                  <p className="text-3xl font-bold" style={{ color: "var(--color-teal-700)" }}>¥4,000</p>
                  <p className="text-xs text-stone-400 mt-1">{locale === "en" ? "Tax included" : "税込"}</p>
                </div>
              </div>

              {/* Pay on Arrival note */}
              <div
                className="rounded-xl p-4 flex items-start gap-3 text-sm"
                style={{ background: "var(--color-teal-50)", border: "1px solid var(--color-teal-100)" }}
              >
                <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "var(--color-teal-600)" }} />
                <div>
                  <p className="font-semibold text-stone-900 mb-0.5">
                    {locale === "en" ? "Call to Confirm · Pay on Arrival" : "お電話で確認 · 現地払い"}
                  </p>
                  <p className="text-stone-600 text-xs leading-relaxed">
                    {locale === "en"
                      ? "Submit your request online and our team will call you to confirm your schedule. Full payment is collected at our base on the day."
                      : "オンラインでリクエストを送信していただくと、スタッフがお電話にてご予約内容を確認します。お支払いは当日ベースにて承ります。"}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <span className="section-label">{t("what_included")}</span>
              <h2 className="text-2xl font-bold text-stone-900 mb-6">
                {locale === "en" ? "Canyoning Gear & Amenities Included" : "ツアー料金に含まれる装備・サービス"}
              </h2>
              <ul className="space-y-3">
                {included.map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: "var(--color-teal-100)" }}
                    >
                      <Check className="w-3.5 h-3.5" style={{ color: "var(--color-teal-700)" }} />
                    </div>
                    <span className="text-stone-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Schedule ──────────────────────────────────────────────────── */}
      <section className="section" style={{ background: "var(--color-teal-50)" }} id="canyoning-schedule">
        <div className="container-site">
          <div className="max-w-2xl mx-auto text-center">
            <span className="section-label">{locale === "en" ? "Schedule" : "スケジュール"}</span>
            <h2 className="text-3xl font-bold text-stone-900 mb-3">
              {locale === "en" ? "Daily Gunma Canyoning Schedule" : "群馬キャニオニング運行スケジュール"}
            </h2>
            <p className="text-stone-500 text-sm mb-8">
              {locale === "en"
                ? "Our team will confirm your exact departure time when we call."
                : "スタッフがお電話にて正確な出発時間をご案内します。"}
            </p>
            <div className="grid grid-cols-3 gap-4 mb-6">
              {(["9:00 AM", "11:30 AM", "1:30 PM"] as const).map((time, i) => (
                <div key={i} className="card p-5 text-center">
                  <Clock className="w-6 h-6 mx-auto mb-2" style={{ color: "var(--color-teal-600)" }} />
                  <p className="font-bold text-stone-900">{time}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-stone-600">
              <Users className="w-4 h-4 text-teal-500" />
              {locale === "en" ? "Max 35 participants per departure" : "1便あたり最大35名"}
            </div>
          </div>
        </div>
      </section>

      {/* ── Safety note ───────────────────────────────────────────────── */}
      <section className="section bg-white" id="canyoning-safety">
        <div className="container-site max-w-2xl mx-auto text-center">
          <span className="section-label">{locale === "en" ? "Safety" : "安全"}</span>
          <h2 className="text-3xl font-bold text-stone-900 mb-4">
            {locale === "en" ? "Gunma Canyoning Safety Protocols" : "群馬キャニオニング安全基準と参加条件"}
          </h2>
          <p className="text-stone-600 mb-8">
            {locale === "en"
              ? "Canyoning is a physically demanding activity. All participants must be aged 12+, comfortable in water, and in good health. Our guides assess conditions before every trip."
              : "キャニオニングは体力を使うアクティビティです。12歳以上・水に慣れていること・健康状態に問題がないことが参加条件です。ガイドが毎回コンディションを確認します。"}
          </p>
          <div className="flex justify-center">
            <div className="flex items-center gap-2 text-teal-700 font-medium">
              <Shield className="w-5 h-5 text-teal-600" />
              {locale === "en" ? "Safety briefing before every departure" : "出発前に必ず安全レクチャーを実施"}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────── */}
      <section className="relative py-16 overflow-hidden bg-gradient-to-br from-teal-950 via-teal-900 to-emerald-950" id="canyoning-cta">
        {/* Subtle geometric light or abstract overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.15),transparent_50%)]" aria-hidden="true" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.1),transparent_50%)]" aria-hidden="true" />
        <div className="absolute inset-0 bg-black/20" aria-hidden="true" />

        <div className="container-site text-center relative">
          <h2 className="text-3xl font-bold text-white mb-4">
            {locale === "en" ? "Book Your Gunma Canyoning Tour Today" : "群馬キャニオニングツアーを予約する"}
          </h2>
          <p className="text-teal-100 mb-8 max-w-md mx-auto text-sm">
            {locale === "en"
              ? "Submit your request online. Our team calls you to confirm. Pay on arrival."
              : "オンラインでリクエスト送信。スタッフがお電話で確認。お支払いは当日現地にて。"}
          </p>
          {grandOpeningSoon ? (
            <span className="inline-flex items-center gap-2 text-sm font-bold text-white bg-white/20 rounded-xl px-5 py-3 border border-white/30">
              <Sparkles className="w-4 h-4 animate-pulse" />
              {locale === "en" ? "Grand Opening Soon!" : "近日グランドオープン！"}
            </span>
          ) : maintenanceMode ? (
            <span className="inline-flex items-center gap-2 text-sm text-white/70 bg-white/10 rounded-xl px-5 py-3 border border-white/20">
              <Wrench className="w-4 h-4" />
              {locale === "en" ? "Booking temporarily unavailable" : "予約は一時的にご利用いただけません"}
            </span>
          ) : isOffSeasonMode ? (
            <div className="bg-white/10 border border-white/20 rounded-xl px-5 py-4 text-white text-sm max-w-md mx-auto flex items-start text-left gap-3">
              <Calendar className="w-5 h-5 text-teal-300 flex-shrink-0 mt-0.5" />
              <span>
                {locale === "en"
                  ? "Our current season has concluded. Thank you for an amazing year! Bookings for next season will open soon."
                  : "今シーズンの営業は終了いたしました。素晴らしい1年をありがとうございました！来シーズンの予約受付は間もなく開始いたします。"}
              </span>
            </div>
          ) : (
            <Link
              href={lp("/booking")}
              className="btn btn-lg"
              style={{ background: "white", color: "var(--color-teal-700)" }}
            >
              {locale === "en" ? "Book Now" : "今すぐ予約"}
              <ArrowRight className="w-5 h-5" />
            </Link>
          )}
        </div>
      </section>
    </>
  );
}

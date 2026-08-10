import { getTranslations, getLocale } from "next-intl/server";
import Link from "next/link";
import {
  ArrowRight, Users, Clock, Shield, AlertCircle, Waves, Wrench,
  CheckCircle2, Compass, Activity, ArrowLeftRight, Calendar, Check,
  MapPin, Sparkles
} from "lucide-react";
import type { Metadata } from "next";
import { getSettings } from "@/app/actions/admin/settings";
import { getGrandOpeningMode } from "@/lib/maintenance";
import {
  TRANSIT_DESC_JA,
  TRANSIT_DESC_EN,
} from "@/lib/constants/business";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isJa = locale === "ja";
  // Root-domain Japanese: ja canonical is /rafting (no prefix), en is /en/rafting
  const canonicalSelf = isJa ? "/rafting" : "/en/rafting";
  return {
    title: isJa
      ? "水上ラフティングの時期と季節 | 利根川のアドベンチャースポーツ"
      : "Tone River Japan: Gunma Rafting Seasons & Guide",
    description: isJa
      ? "水上ラフティングの時期と季節をご案内。群馬県大穴ベースでのアドベンチャースポーツ体験。JR水上駅からのアクセスや川下りプランを紹介。"
      : `The complete guide to Gunma Rafting seasons & outdoor activities on the Tone River, Japan. ${TRANSIT_DESC_EN}.`,
    alternates: {
      canonical: canonicalSelf,
      languages: {
        en: "/en/rafting",
        ja: "/rafting",
        "x-default": "/rafting",
      },
    },
    openGraph: {
      title: isJa
        ? "水上ラフティングの時期と季節 | 利根川のアドベンチャースポーツ"
        : "Tone River Japan: Gunma Rafting Seasons & Guide",
      description: isJa
        ? "水上ラフティングの時期と季節をご案内。群馬県大穴ベースでのアドベンチャースポーツ体験。JR水上駅からのアクセスや川下りプランを紹介。"
        : `The complete guide to Gunma Rafting seasons & outdoor activities on the Tone River, Japan. ${TRANSIT_DESC_EN}.`,
      url: isJa
        ? "https://thedreamadventure.com/rafting"
        : "https://thedreamadventure.com/en/rafting",
      type: "article",
    },
  };
}

export default async function RaftingPage() {
  const t = await getTranslations("rafting");
  const tSched = await getTranslations("schedule");
  const locale = await getLocale();

  const schemas: object[] = [];
  if (locale === "ja") {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "ラフティング 関東でおすすめのスポットはどこですか？",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": `群馬県沼田市の利根川で、ドリームアドベンチャーがラフティングツアーを開催しています。6歳から参加可能で、1日3便（9:00・11:30・13:30）を運行しています（${TRANSIT_DESC_JA}）。`
          }
        },
        {
          "@type": "Question",
          "name": "群馬 ラフティング おすすめの時期や季節はいつですか？",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "群馬でラフティングをする最適な時期は、雪解け水で利根川ラフティングが激流になる春（5月〜6月）と、穏やかな水流で川遊びが楽しめる夏（7月〜9月）です。季節ごとの魅力を是非体験してください。"
          }
        }
      ]
    });
  } else {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Where is the best rafting near Tokyo for a day trip?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": `Dream Adventure runs whitewater rafting on the Tone River in Numata, Gunma — ${TRANSIT_DESC_EN}. Departures are at 9:00, 11:30, and 13:30, and trips are open to ages 6 and up.`
          }
        },
        {
          "@type": "Question",
          "name": "What is the best season for Tone River Rafting in Gunma?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Dream Adventure operates from April to October. April through June has the highest water from snowmelt and the strongest rapids; July and August have warmer water that suits families with children; September and October are calmer, with autumn colours through the valley."
          }
        }
      ]
    });
  }

  const lp = (href: string) => locale === "ja" ? href : `/en${href}`;
  const included = t.raw("included_items") as string[];
  const settings = await getSettings();
  const maintenanceMode = settings.maintenanceMode;
  const isOffSeasonMode = settings.isOffSeasonMode;
  const grandOpeningSoon = getGrandOpeningMode();

  return (
    <>
      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-24 md:py-32 bg-gradient-to-br from-teal-950 via-teal-900 to-emerald-950" id="rafting-hero">
        {/* Subtle geometric light or abstract overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(20,184,166,0.15),transparent_50%)]" aria-hidden="true" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.1),transparent_50%)]" aria-hidden="true" />
        <div className="absolute inset-0 bg-black/10" aria-hidden="true" />

        <div className="container-site relative">
          <div className="max-w-2xl">
            <span className="text-teal-300 text-sm font-medium uppercase tracking-wider block mb-4">
              {locale === "en" ? "River Rafting in Gunma" : "群馬・リバーラフティング"}
            </span>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-5">
              {t("hero_headline")}
            </h1>
            <p className="text-teal-100 text-lg mb-8">
              {locale === "en"
                ? "Experience the best white water rafting in Japan on the beautiful Tone River. High-quality equipment, professional safety guides, and breathtaking views of Gunma's natural scenery."
                : "利根川の急流を下る、日本屈指の本格リバーラフティング！美しくダイナミックな群馬の大自然に囲まれながら、経験豊富なプロのガイドと一緒にスリル満点の川下りを体験しましょう。"}
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
                id="rafting-book-btn"
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
                {locale === "en" ? "Max 21 participants per departure" : "1便あたり最大21名"}
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
                {locale === "en" ? "Ages 6 and up" : "6歳以上"}
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
      <section className="section bg-white" id="rafting-pricing">
        <div className="container-site">
          <div className="grid md:grid-cols-2 gap-12 items-start">
            <div>
              <span className="section-label">{locale === "en" ? "Pricing" : "料金"}</span>
              <h2 className="text-3xl font-bold text-stone-900 mb-6">
                {locale === "en" ? "Gunma River Rafting Tour Prices" : "群馬ラフティングツアー料金体系"}
              </h2>
              <p className="text-stone-600 mb-6">{t("age_rule")}</p>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="card p-5 text-center">
                  <p className="text-sm text-stone-500 mb-1">{locale === "en" ? "Adult" : "大人"}</p>
                  <p className="text-3xl font-bold" style={{ color: "var(--color-teal-700)" }}>¥6,000</p>
                  <p className="text-xs text-stone-400 mt-1">{locale === "en" ? "Tax included" : "税込"}</p>
                </div>
                <div className="card p-5 text-center">
                  <p className="text-sm text-stone-500 mb-1">{locale === "en" ? "Child (6–17)" : "子ども（6〜17歳）"}</p>
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

            {/* What's included */}
            <div>
              <span className="section-label">{t("what_included")}</span>
              <h2 className="text-2xl font-bold text-stone-900 mb-6">
                {locale === "en" ? "Rafting Gear & Amenities Included" : "ツアー料金に含まれる装備・サービス"}
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

          {/* Group Booking Note (JA only) */}
          {locale === "ja" && (
            <div className="mt-8 rounded-2xl p-5 border border-teal-100" style={{ background: "var(--color-teal-50)" }}>
              <p className="text-sm font-semibold text-teal-800 mb-1">社員旅行・団体・貸切ラフティングにも対応</p>
              <p className="text-stone-600 text-xs leading-relaxed">
                <strong>社員旅行</strong>や<strong>団体・グループ</strong>でのご利用はお任せください。
                <strong>貸切ラフティング</strong>のご相談もお気軽にどうぞ。
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ── Schedule ──────────────────────────────────────────────────── */}
      <section className="section" style={{ background: "var(--color-teal-50)" }} id="rafting-schedule">
        <div className="container-site">
          <div className="max-w-2xl mx-auto text-center">
            <span className="section-label">{tSched("title")}</span>
            <h2 className="text-3xl font-bold text-stone-900 mb-3">
              {locale === "en" ? "Daily Gunma Rafting Schedule" : "群馬ラフティング運行スケジュール"}
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
              {locale === "en" ? "Max 21 participants per departure" : "1便あたり最大21名"}
            </div>
          </div>
        </div>
      </section>

      {/* ── Safety ────────────────────────────────────────────────────── */}
      <section className="section bg-white" id="rafting-safety">
        <div className="container-site max-w-2xl mx-auto text-center">
          <span className="section-label">{locale === "en" ? "Safety" : "安全"}</span>
          <h2 className="text-3xl font-bold text-stone-900 mb-4">
            {locale === "en" ? "Gunma River Rafting Safety Guidelines" : "群馬ラフティング安全への取り組みとガイド基準"}
          </h2>
          <p className="text-stone-600 mb-8">
            {locale === "en"
              ? "Every guide holds water rescue and first-aid training certifications. All equipment is inspected daily."
              : "全ガイドは水上救助と救急救命の研修を修了。装備は毎日点検しています。"}
          </p>
          <div className="flex justify-center">
            <div className="flex items-center gap-2 text-teal-700 font-medium">
              <Shield className="w-5 h-5 text-teal-600" />
              {locale === "en" ? "Safety briefing before every departure" : "出発前に必ず安全レクチャーを実施"}
            </div>
          </div>
        </div>
      </section>

      {/* ── Season & Access (GSC targeting) ────────────────────────────── */}
      <section className="section bg-stone-50" id="rafting-details-gsc">
        <div className="container-site max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <span className="section-label">{locale === "en" ? "Season" : "季節・時期"}</span>
            <h2 className="text-3xl font-bold text-stone-900 mb-4">
              {t("season_title")}
            </h2>
            <p className="text-stone-600 leading-relaxed text-sm max-w-2xl mx-auto">
              {t("season_desc")}
            </p>
          </div>

          <div className="card p-6 bg-white border border-stone-100 max-w-2xl mx-auto">
            <h3 className="text-lg font-bold text-stone-900 mb-2.5 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-teal-600 flex-shrink-0" />
              {t("access_title")}
            </h3>
            <p className="text-stone-600 leading-relaxed text-sm">
              {t("access_desc")}
            </p>
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────── */}
      <section className="relative py-16 overflow-hidden bg-gradient-to-br from-teal-950 via-teal-900 to-emerald-950" id="rafting-cta">
        {/* Subtle geometric light or abstract overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.15),transparent_50%)]" aria-hidden="true" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.1),transparent_50%)]" aria-hidden="true" />
        <div className="absolute inset-0 bg-black/20" aria-hidden="true" />

        <div className="container-site text-center relative">
          <h2 className="text-3xl font-bold text-white mb-4">
            {locale === "en" ? "Book Your Gunma River Rafting Tour Today" : "群馬リバーラフティングツアーを予約する"}
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(schemas)
        }}
      />
    </>
  );
}

import { getTranslations, getLocale } from "next-intl/server";
import {
  PHONE_PRIMARY_E164,
  ADDRESS_SCHEMA,
  TRANSIT_DESC_JA,
  TRANSIT_DESC_EN,
  MAP_EMBED_SRC,
  MAP_SHORT_LINK,
  GEO_LATITUDE,
  GEO_LONGITUDE,
} from "@/lib/constants/business";
import Link from "next/link";
import { ArrowRight, Shield, Clock, MapPin, ChevronRight, Users, Waves, Wrench, Sparkles, Compass } from "lucide-react";
import type { Metadata } from "next";
import { getMaintenanceMode, getGrandOpeningMode } from "@/lib/maintenance";
import TestimonialsSection from "@/components/ui/TestimonialsSection";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isJa = locale === "ja";
  // Root-domain Japanese: ja canonical is /, en canonical is /en
  const canonicalSelf = isJa ? "/" : "/en";
  return {
    title: isJa
      ? "群馬のアクティビティ | 群馬ラフティングおすすめ | ドリームアドベンチャー"
      : "Outdoor Activities Gunma | River Rafting & Canyoning | Dream Adventure",
    description: isJa
      ? "群馬ラフティングおすすめプラン！群馬県のアクティビティを利根川で体験。お電話確認と当日現地払いで安心のアドベンチャースポーツ。"
      : "River Rafting & outdoor activities in Gunma on the Tone River. Convenient direct access & pay-on-arrival convenience. Book now!",
    alternates: {
      canonical: canonicalSelf,
      languages: {
        en: "/en",
        ja: "/",
        "x-default": "/",
      },
    },
    openGraph: {
      title: isJa
        ? "群馬のアクティビティ | 群馬ラフティングおすすめ | ドリームアドベンチャー"
        : "Outdoor Activities Gunma | River Rafting & Canyoning | Dream Adventure",
      description: isJa
        ? "群馬ラフティングおすすめプラン！群馬県のアクティビティを利根川で体験。お電話確認と当日現地払いで安心のアドベンチャースポーツ。"
        : "River Rafting & outdoor activities in Gunma on the Tone River. Convenient direct access & pay-on-arrival convenience. Book now!",
      url: isJa
        ? "https://thedreamadventure.com/"
        : "https://thedreamadventure.com/en",
      type: "website",
      images: [
        {
          url: "https://thedreamadventure.com/logo.png",
          width: 800,
          height: 600,
          alt: "Dream Adventure Logo",
        },
      ],
    },
  };
}

export default async function HomePage() {
  const t = await getTranslations();
  const locale = await getLocale();
  // lp: build locale-prefixed path. 'ja' uses root (no prefix), 'en' uses /en prefix.
  const lp = (href: string) => locale === "ja" ? href : `/en${href}`;

  const schemas: object[] = [
    {
      "@context": "https://schema.org",
      "@type": "SportsActivityLocation",
      "@id": "https://thedreamadventure.com/#business",
      "name": "Dream Adventure",
      "url": "https://thedreamadventure.com",
      "telephone": PHONE_PRIMARY_E164,
      "email": "contact@thedreamadventure.com",
      "priceRange": "¥4000 - ¥10000",
      "address": {
        "@type": "PostalAddress",
        ...ADDRESS_SCHEMA,
      },
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": GEO_LATITUDE,
        "longitude": GEO_LONGITUDE
      },
      "openingHoursSpecification": [
        {
          "@type": "OpeningHoursSpecification",
          "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"],
          "opens": "08:00",
          "closes": "18:00",
          "validFrom": "2026-04-01",
          "validThrough": "2026-10-31"
        }
      ],
      "hasMap": MAP_SHORT_LINK,
      "image": "https://thedreamadventure.com/logo.png",
      "description": "River rafting and canyoning tours in Gunma, Japan. Professional guides and all safety equipment included."
    },
    {
      "@context": "https://schema.org",
      "@type": "TouristAttraction",
      "@id": "https://thedreamadventure.com/#attraction",
      "name": "Dream Adventure Gunma Rafting & Canyoning",
      "description": "Guided river rafting on the Tone River and canyoning in the valleys around Numata, Gunma, Japan.",
      "url": "https://thedreamadventure.com",
      "telephone": PHONE_PRIMARY_E164,
      "priceRange": "¥4000 - ¥10000",
      "touristType": ["Adventure Seekers", "Outdoor Lovers", "Tourists"],
      "address": {
        "@type": "PostalAddress",
        ...ADDRESS_SCHEMA,
      },
      "containedInPlace": { "@id": "https://thedreamadventure.com/#business" },
    }
  ];

  if (locale === "ja") {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "群馬でラフティングができるところはどこですか？",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": `群馬県沼田市の利根川で、ドリームアドベンチャーがラフティングツアーを開催しています。6歳から参加可能で、1日3便（9:00・11:30・13:30）を運行。料金は大人6,000円・子供4,000円です。アクセス：${TRANSIT_DESC_JA}。`
          }
        },
        {
          "@type": "Question",
          "name": "群馬のラフティングのベストシーズンはいつですか？",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "ドリームアドベンチャーの営業期間は4月から10月です。4月から6月は雪解け水で激流、7月から8月は水温が上がりお子様連れでも楽しみやすく、9月から10月は水量が落ち着き紅葉の渓谷をゆったり楽しめます。"
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
          "name": "Where can I go whitewater rafting near Tokyo?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": `Dream Adventure runs whitewater rafting on the Tone River in Numata, Gunma — ${TRANSIT_DESC_EN}. Departures at 9:00, 11:30, and 13:30, open to ages 6 and up.`
          }
        },
        {
          "@type": "Question",
          "name": "When is the best season for rafting in Japan?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Dream Adventure operates from April to October. April through June has the highest water from snowmelt and the strongest rapids; July and August have warmer water that suits families with children; September and October are calmer, with autumn colours through the valley."
          }
        }
      ]
    });
  }


  const safetyItems = t.raw("safety.items") as string[];
  const maintenanceMode = await getMaintenanceMode();
  const grandOpeningSoon = getGrandOpeningMode();


  // Grand Opening pill — shown in place of all Book Now buttons during pre-launch
  const openingSoonPill = (
    <span
      id="opening-soon-pill"
      className="inline-flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-xl"
      style={{
        background: "linear-gradient(135deg, #0d9488, #0f766e)",
        color: "white",
        boxShadow: "0 4px 14px rgba(13,148,136,0.3)",
      }}
    >
      <Sparkles className="w-4 h-4 animate-pulse" />
      {locale === "ja" ? "近日グランドオープン！" : "Grand Opening Soon!"}
    </span>
  );

  // Inline maintenance pill shown inside CTAs when maintenance is active
  const maintenancePill = (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg bg-amber-100 text-amber-800 border border-amber-300">
      <Wrench className="w-4 h-4" />
      {locale === "ja" ? "予約システムメンテナンス中" : "Booking Temporarily Unavailable"}
    </span>
  );

  return (
    <>
      {/* ─── Hero ──────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-950 via-teal-900 to-emerald-950" id="hero">
        {/* Subtle geometric light or abstract overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(20,184,166,0.15),transparent_50%)]" aria-hidden="true" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.1),transparent_50%)]" aria-hidden="true" />

        {/* Subtle dot pattern on top of overlay */}
        <div className="absolute inset-0 opacity-10" aria-hidden="true">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(circle at 25% 60%, white 1px, transparent 1px), radial-gradient(circle at 75% 40%, white 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }}
          />
        </div>

        <div className="container-site relative py-28 md:py-36">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 text-teal-300 text-sm font-medium mb-5">
              <MapPin className="w-4 h-4" />
              {t("hero.badge")}
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              {t("hero.headline")}
            </h1>
            <p className="text-teal-100 text-lg md:text-xl mb-10 leading-relaxed max-w-xl">
              {t("hero.sub")}
            </p>
            <div className="flex flex-wrap gap-4">
              {grandOpeningSoon ? (
                openingSoonPill
              ) : maintenanceMode ? (
                maintenancePill
              ) : (
                <Link
                  href={lp("/booking")}
                  id="hero-book-cta"
                  className="btn btn-lg"
                  style={{ background: "white", color: "var(--color-teal-700)" }}
                >
                  {t("hero.cta_book")}
                  <ArrowRight className="w-5 h-5" />
                </Link>
              )}
              <Link
                href={lp("/rafting")}
                id="hero-learn-cta"
                className="btn btn-lg text-white"
                style={{
                  border: "2px solid rgba(255,255,255,0.4)",
                  background: "rgba(255,255,255,0.08)",
                }}
              >
                {t("hero.cta_learn")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Quick Answer (GEO/AEO) ─────────────────────────────────────── */}
      {/* Statically server-rendered — AI crawlers read this from raw HTML   */}
      <section className="bg-stone-50 border-b border-stone-100">
        <div className="container-site py-6">
          <div className="card p-5 max-w-3xl mx-auto">
            <p className="text-sm text-stone-700 leading-relaxed">
              {t("hero.quick_answer")}
            </p>
          </div>
        </div>
      </section>

      {/* ─── Activities ─────────────────────────────────────────────────── */}
      <section className="section bg-white" id="activities">
        <div className="container-site">
          <div className="text-center mb-12">
            <span className="section-label">{t("activities.title")}</span>
            <h2 className="text-3xl md:text-4xl font-bold text-stone-900">
              {locale === "en" ? "Our Gunma Rafting & Canyoning Tours" : "初心者歓迎 | 群馬ラフティング＆キャニオニング スリルと爽快感"}
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">

            {/* ── Rafting Card ─────────────────────────────────────────── */}
            <div className="group card p-0 overflow-hidden hover:-translate-y-1 hover:shadow-2xl transition-all duration-300" id="activity-rafting">
              {/* Next.js optimised card image */}
              {/* Card background styling with rich gradient instead of image */}
              <div className="h-52 relative overflow-hidden bg-gradient-to-br from-teal-900 via-teal-850 to-emerald-800">
                {/* Subtle abstract glow overlay */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(20,184,166,0.3),transparent_60%)]" aria-hidden="true" />
                <div className="absolute inset-0 bg-black/15" aria-hidden="true" />
                {/* Decorative icon */}
                <Waves className="absolute top-6 right-6 w-12 h-12 text-white opacity-25 z-10" />
                <div className="absolute bottom-0 left-0 p-6 z-10">
                  <span className="text-teal-300 text-xs font-bold uppercase tracking-widest block mb-1">
                    {locale === "en" ? "Ages 6+" : "6歳以上"}
                  </span>
                  <h3 className="text-2xl font-bold text-white">{t("activities.rafting_name")}</h3>
                </div>
              </div>
              <div className="p-6">
                <p className="text-stone-600 mb-5">{t("activities.rafting_desc")}</p>
                <div className="flex flex-col sm:flex-row gap-2 mb-4">
                  <div className="text-sm text-stone-500 flex items-center gap-1">
                    <Users className="w-4 h-4 text-teal-500" />
                    {locale === "en" ? "Adult ¥6,000 · Child ¥4,000" : "大人 ¥6,000 · 子ども ¥4,000"}
                  </div>
                  <div className="text-sm text-stone-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-stone-400" />
                    {locale === "en" ? "9:00 AM · 11:30 AM · 1:30 PM" : "9:00 · 11:30 · 13:30"}
                  </div>
                </div>
                <div className="flex gap-3">
                  {/* Activity Book button — hidden in opening-soon / maintenance mode */}
                  {grandOpeningSoon ? (
                    openingSoonPill
                  ) : maintenanceMode ? (
                    <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 flex items-center gap-1">
                      <Wrench className="w-3 h-3" />
                      {locale === "ja" ? "メンテナンス中" : "Unavailable"}
                    </span>
                  ) : (
                    <Link
                      href={lp("/booking")}
                      id="activity-rafting-book"
                      className="btn btn-primary btn-sm flex-1 justify-center"
                    >
                      {t("activities.book_btn")}
                    </Link>
                  )}
                  <Link
                    href={lp("/rafting")}
                    id="activity-rafting-details"
                    className="btn btn-outline btn-sm"
                  >
                    {t("activities.details_btn")}
                  </Link>
                </div>
              </div>
            </div>

            {/* ── Canyoning Card ───────────────────────────────────────── */}
            <div className="group card p-0 overflow-hidden hover:-translate-y-1 hover:shadow-2xl transition-all duration-300" id="activity-canyoning">
              <div className="h-52 relative overflow-hidden bg-gradient-to-br from-emerald-900 via-teal-850 to-teal-900">
                {/* Subtle abstract glow overlay */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(20,184,166,0.3),transparent_60%)]" aria-hidden="true" />
                <div className="absolute inset-0 bg-black/15" aria-hidden="true" />
                <div className="absolute top-6 right-6 w-12 h-12 text-white/25 z-10" aria-hidden="true">
                  <Compass className="w-12 h-12" />
                </div>
                <div className="absolute bottom-0 left-0 p-6 z-10">
                  <span className="text-teal-300 text-xs font-bold uppercase tracking-widest block mb-1">
                    {locale === "en" ? "Ages 12+" : "12歳以上"}
                  </span>
                  <h3 className="text-2xl font-bold text-white">{t("activities.canyoning_name")}</h3>
                </div>
              </div>
              <div className="p-6">
                <p className="text-stone-600 mb-5">{t("activities.canyoning_desc")}</p>
                <div className="flex flex-col sm:flex-row gap-2 mb-4">
                  <div className="text-sm text-stone-500 flex items-center gap-1">
                    <Users className="w-4 h-4 text-teal-500" />
                    {locale === "en" ? "Adult ¥6,000 · Child ¥4,000" : "大人 ¥6,000 · 子ども ¥4,000"}
                  </div>
                  <div className="text-sm text-stone-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-stone-400" />
                    {locale === "en" ? "9:00 AM · 11:30 AM · 1:30 PM" : "9:00 · 11:30 · 13:30"}
                  </div>
                </div>
                <div className="flex gap-3">
                  {grandOpeningSoon ? (
                    openingSoonPill
                  ) : maintenanceMode ? (
                    <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 flex items-center gap-1">
                      <Wrench className="w-3 h-3" />
                      {locale === "ja" ? "メンテナンス中" : "Unavailable"}
                    </span>
                  ) : (
                    <Link
                      href={lp("/booking")}
                      id="activity-canyoning-book"
                      className="btn btn-primary btn-sm flex-1 justify-center"
                    >
                      {t("activities.book_btn")}
                    </Link>
                  )}
                  <Link
                    href={lp("/canyoning")}
                    id="activity-canyoning-details"
                    className="btn btn-outline btn-sm"
                  >
                    {t("activities.details_btn")}
                  </Link>
                </div>
              </div>
            </div>

          </div>

          {/* ── Combo Pack promotional card ──────────────────────────────── */}
          <div
            id="combo-pack-promo"
            className="mt-8 rounded-3xl overflow-hidden relative transition-all duration-300 hover:shadow-2xl hover:shadow-teal-950/20 hover:scale-[1.005] border border-teal-500/10 hover:border-teal-400/20 group"
            style={{
              background: "linear-gradient(135deg, #0f766e 0%, #0d9488 55%, #14b8a6 100%)",
            }}
          >
            {/* Shimmer overlay */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse at 80% 20%, rgba(255,255,255,0.15) 0%, transparent 55%)",
              }}
              aria-hidden="true"
            />

            <div className="relative p-8 md:p-10">
              <div className="flex flex-col md:flex-row md:items-center gap-8">
                {/* Left — info */}
                <div className="flex-1">
                  <span
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4 animate-pulse"
                    style={{ background: "rgba(255,255,255,0.20)", color: "white" }}
                  >
                    {locale === "en" ? "Best Value" : "お得パック"}
                  </span>
                  <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-3 tracking-tight">
                    {locale === "en" ? "Ultimate Full-Day Gunma Adventure" : "群馬究極の1日アドベンチャー"}
                  </h2>
                  <h3 className="text-xl font-bold text-teal-100 mb-4">
                    {locale === "en" ? "Rafting & Canyoning Combo Package" : "ラフティング＋キャニオニング1日コンボパック"}
                  </h3>
                  <p className="text-teal-100 mb-6 leading-relaxed max-w-lg">
                    {locale === "en"
                      ? "Experience Gunma's two signature adventures in a single unforgettable day. Our team will call to craft your perfect custom schedule."
                      : "群馬の2大アドベンチャーを1日で体験。スタッフがお電話して最適なスケジュールをご提案します。"}
                  </p>
                  <div className="flex flex-wrap gap-2 mb-6">
                    {[
                      locale === "en" ? "River Rafting" : "ラフティング",
                      locale === "en" ? "Canyoning" : "キャニオニング",
                      locale === "en" ? "Concierge Scheduling" : "専任コンシェルジュ",
                      locale === "en" ? "Best Value Pack" : "お得パック",
                    ].map((feat) => (
                      <span
                        key={feat}
                        className="text-xs font-semibold text-white px-3 py-1.5 rounded-lg transition-colors duration-300 hover:bg-white/30"
                        style={{ background: "rgba(255,255,255,0.15)" }}
                      >
                        {feat}
                      </span>
                    ))}
                  </div>
                  {grandOpeningSoon ? (
                    <span
                      className="inline-flex items-center gap-2 font-bold rounded-xl px-6 py-3"
                      style={{ background: "white", color: "var(--color-teal-700)" }}
                    >
                      <Sparkles className="w-4 h-4 animate-pulse" />
                      {locale === "en" ? "Grand Opening Soon!" : "近日グランドオープン！"}
                    </span>
                  ) : maintenanceMode ? (
                    <span className="inline-flex items-center gap-2 text-sm font-medium px-5 py-2.5 rounded-xl bg-amber-100 text-amber-800 border border-amber-300">
                      <Wrench className="w-4 h-4" />
                      {locale === "ja" ? "メンテナンス中" : "Temporarily Unavailable"}
                    </span>
                  ) : (
                    <Link
                      href={lp("/booking")}
                      id="combo-pack-book"
                      className="inline-flex items-center gap-2 font-bold rounded-xl px-6 py-3 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
                      style={{ background: "white", color: "var(--color-teal-700)" }}
                    >
                      {locale === "en" ? "Book Combo Pack" : "コンボパックを予約"}
                      <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </Link>
                  )}
                </div>

                {/* Right — pricing blocks */}
                <div className="flex gap-4 md:flex-col md:gap-4 flex-wrap">
                  <div
                    className="flex-1 min-w-[130px] rounded-2xl p-5 text-center transition-all duration-300 hover:bg-white/25 hover:scale-105 border border-white/10 hover:border-white/30 cursor-default"
                    style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}
                  >
                    <p className="text-teal-200 text-xs font-bold uppercase tracking-wider mb-2">
                      {locale === "en" ? "Adult" : "大人"}
                    </p>
                    <p className="text-white font-extrabold text-3xl">¥10,000</p>
                    <p className="text-teal-200 text-xs mt-1">
                      {locale === "en" ? "per person" : "お一人様"}
                    </p>
                  </div>
                  <div
                    className="flex-1 min-w-[130px] rounded-2xl p-5 text-center transition-all duration-300 hover:bg-white/25 hover:scale-105 border border-white/10 hover:border-white/30 cursor-default"
                    style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}
                  >
                    <p className="text-teal-200 text-xs font-bold uppercase tracking-wider mb-2">
                      {locale === "en" ? "Child" : "子ども"}
                    </p>
                    <p className="text-white font-extrabold text-3xl">¥6,000</p>
                    <p className="text-teal-200 text-xs mt-1">
                      {locale === "en" ? "per person" : "お一人様"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Group Booking Intent Block (JA only) ─────────────────── */}
          {locale === "ja" && (
            <div className="mt-8 rounded-2xl p-6 border border-teal-100 text-center" style={{ background: "var(--color-teal-50)" }}>
              <p className="text-sm font-semibold text-teal-800 mb-1">団体・グループ・貸切にも対応</p>
              <p className="text-stone-600 text-sm leading-relaxed">
                ドリームアドベンチャーは<strong>社員旅行</strong>・<strong>団体・グループ</strong>のお客様から高い評価をいただいています。
                <strong>貸切ラフティング</strong>もお気軽にご相談ください。
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ─── Schedule ───────────────────────────────────────────────────── */}
      <section className="section" style={{ background: "var(--color-teal-50)" }} id="schedule">
        <div className="container-site">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <span className="section-label">{t("schedule.title")}</span>
              <h2 className="text-3xl font-bold text-stone-900 mb-6">
                {locale === "en" ? "Daily Tour Schedule & Departures" : "ツアー運行スケジュールと出発時間"}
              </h2>
              <p className="text-stone-600 mb-6">{t("schedule.note")}</p>
              {/* Schedule CTA — hidden in grand opening / maintenance mode */}
              {!grandOpeningSoon && !maintenanceMode && (
                <Link href={lp("/booking")} className="btn btn-primary">
                  {locale === "en" ? "Check Availability" : "空き状況を確認"}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}
              {grandOpeningSoon && (
                <span className="inline-flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-xl" style={{ background: "var(--color-teal-600)", color: "white" }}>
                  <Sparkles className="w-4 h-4 animate-pulse" />
                  {locale === "ja" ? "近日グランドオープン！" : "Grand Opening Soon!"}
                </span>
              )}
            </div>
            <div className="grid gap-4">
              {(t.raw("schedule.times") as string[]).map((time, i) => (
                <div key={i} className="card flex items-center gap-4 p-5">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: "var(--color-teal-600)" }}
                  >
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-stone-900 text-lg">{time}</p>
                    <p className="text-sm text-stone-500">
                      {locale === "en" ? "Daily departure" : "毎日出発"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Safety ─────────────────────────────────────────────────────── */}
      <section className="section bg-white" id="safety">
        <div className="container-site">
          <div className="max-w-3xl mx-auto text-center">
            <span className="section-label">{locale === "en" ? "Safety First" : "安全第一"}</span>
            <h2 className="text-3xl md:text-4xl font-bold text-stone-900 mb-4">
              {locale === "en" ? "Safety Protocols for Gunma Outdoor Tours" : "群馬ツアー安全への取り組みと対策"}
            </h2>
            <p className="text-stone-600 mb-10 text-lg">{t("safety.intro")}</p>
            <div className="grid sm:grid-cols-2 gap-4 text-left">
              {safetyItems.map((item, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-4 rounded-xl"
                  style={{ background: "var(--color-teal-50)" }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: "var(--color-teal-100)" }}
                  >
                    <Shield className="w-4 h-4" style={{ color: "var(--color-teal-700)" }} />
                  </div>
                  <p className="text-stone-700 text-sm leading-relaxed">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Season & Access (GSC targeting) ────────────────────────────── */}
      <section className="section bg-stone-50" id="homepage-details-gsc">
        <div className="container-site max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <span className="section-label">{locale === "en" ? "Season" : "季節・時期"}</span>
            <h2 className="text-3xl font-bold text-stone-900 mb-4">
              {t("rafting.season_title")}
            </h2>
            <p className="text-stone-600 leading-relaxed text-sm max-w-2xl mx-auto">
              {t("rafting.season_desc")}
            </p>
          </div>

          <div className="card p-6 bg-white border border-stone-100 max-w-2xl mx-auto">
            <h3 className="text-lg font-bold text-stone-900 mb-2.5 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-teal-600 flex-shrink-0" />
              {t("rafting.access_title")}
            </h3>
            <p className="text-stone-600 leading-relaxed text-sm">
              {t("rafting.access_desc")}
            </p>
          </div>
        </div>
      </section>

      {/* ─── Testimonials ───────────────────────────────────────────────── */}
      <TestimonialsSection locale={locale} />

      {/* ─── Access Preview ──────────────────────────────────────────────── */}
      <section className="section bg-white" id="access-preview">
        <div className="container-site">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <span className="section-label">{t("access.title")}</span>
              <h2 className="text-3xl font-bold text-stone-900 mb-4">
                {locale === "en" ? "Access to Gunma Outdoor Base" : "群馬ベースへのアクセス・行き方"}
              </h2>
              <p className="text-stone-700 text-lg mb-4 font-medium">
                {t("access.intro")}
              </p>
              <p className="text-stone-600 mb-6">
                {locale === "en"
                  ? `${TRANSIT_DESC_EN}, or drive via Kan-Etsu Expressway.`
                  : `${TRANSIT_DESC_JA}、または関越自動車道でお越しいただけます。`}
              </p>
              <Link href={lp("/access")} className="btn btn-outline flex items-center gap-2 w-fit">
                {t("access.map")} <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="h-64 overflow-hidden rounded-2xl shadow-lg border border-stone-200">
              <iframe
                src={MAP_EMBED_SRC}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Dream Adventure Gunma location"
                aria-label="Google Maps showing Numata, Gunma, Japan"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ─── Final CTA ───────────────────────────────────────────────────── */}
      <section className="relative py-20 overflow-hidden bg-gradient-to-br from-teal-950 via-teal-900 to-emerald-950" id="final-cta">
        {/* Subtle geometric light or abstract overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.15),transparent_50%)]" aria-hidden="true" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.1),transparent_50%)]" aria-hidden="true" />
        <div className="absolute inset-0 bg-black/20" aria-hidden="true" />

        <div className="container-site text-center relative">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            {locale === "en" ? "Book Your Gunma Rafting & Canyoning Tour Today" : "群馬ラフティング＆キャニオニングツアーを予約する"}
          </h2>
          <p className="text-teal-100 text-lg mb-8 max-w-lg mx-auto">
            {locale === "en"
              ? "Submit your booking request online. Our team calls you to confirm. Pay on arrival — no payment required online."
              : "ドリームアドベンチャーへオンラインでリクエスト送信。スタッフがお電話で確認。当日現地払い、オンライン決済不要。"}
          </p>
          {grandOpeningSoon ? (
            <span
              className="inline-flex items-center gap-2 text-base font-bold px-6 py-3 rounded-xl"
              style={{
                background: "white",
                color: "var(--color-teal-700)",
                boxShadow: "0 4px 14px rgba(255,255,255,0.3)",
              }}
            >
              <Sparkles className="w-5 h-5 animate-pulse" />
              {locale === "ja" ? "近日グランドオープン！" : "Grand Opening Soon!"}
            </span>
          ) : maintenanceMode ? (
            <span className="inline-flex items-center gap-2 text-base font-medium px-6 py-3 rounded-xl bg-amber-100 text-amber-800 border border-amber-300">
              <Wrench className="w-4 h-4" />
              {locale === "ja" ? "予約システムメンテナンス中" : "Booking Temporarily Unavailable"}
            </span>
          ) : (
            <Link
              href={lp("/booking")}
              id="final-cta-btn"
              className="btn btn-lg"
              style={{ background: "white", color: "var(--color-teal-700)" }}
            >
              {t("hero.cta_book")}
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

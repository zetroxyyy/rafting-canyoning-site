import { getLocale } from "next-intl/server";
import Link from "next/link";

import { ArrowLeft, User, Clock, Waves, Wrench, Compass, BookOpen, Calendar, ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import BrandLogo from "@/components/ui/BrandLogo";
import BlogBookingCTA from "@/components/ui/BlogBookingCTA";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isJa = locale === "ja";
  return {
    title: isJa
      ? "群馬ラフティング完全ガイド：利根川の激流体験 | ドリームアドベンチャー"
      : "The Ultimate Guide to Rafting in Gunma | Dream Adventure",
    description: isJa
      ? "群馬県沼田市でのラフティング完全ガイド。利根川の魅力や、午前ラフティング＋午後キャニオニングのコンボパッケージについて詳しく紹介。"
      : "Gunma, in Japan's mountainous interior, offers world-class whitewater rafting on the Tone River. Read our ultimate guide to river rafting in Gunma.",
    alternates: {
      canonical: locale === "ja" ? "/blog/gunma-rafting-guide" : `/en/blog/gunma-rafting-guide`,
      languages: {
        en: "/en/blog/gunma-rafting-guide",
        ja: "/blog/gunma-rafting-guide",
        "x-default": "/blog/gunma-rafting-guide",
      },
    },
  };
}

export default async function RaftingGuidePage() {
  const locale = await getLocale();
  const isJa = locale === "ja";

  return (
    <article className="min-h-screen bg-white">
      {/* ─── Breadcrumb Navigation ──────────────────────────────────────── */}
      <div className="bg-stone-50 border-b border-stone-100 py-4">
        <div className="container-site max-w-4xl mx-auto">
          <div className="flex items-center gap-2 text-xs md:text-sm text-stone-500 font-medium">
            <Link href={locale === "ja" ? "/" : "/en"} className="hover:text-teal-600 transition-colors">
              {isJa ? "ホーム" : "Home"}
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
            <Link href={locale === "ja" ? "/blog" : `/en/blog`} className="hover:text-teal-600 transition-colors">
              {isJa ? "ブログ" : "Blog"}
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
            <span className="text-stone-700 truncate max-w-[200px] md:max-w-none">
              {isJa ? "群馬ラフティング完全ガイド" : "Gunma Rafting Guide"}
            </span>
          </div>
        </div>
      </div>

      {/* ─── Article Header ─────────────────────────────────────────────── */}
      <header className="container-site max-w-4xl mx-auto py-12">
        <div className="space-y-4">
          <Link
            href={locale === "ja" ? "/blog" : `/en/blog`}
            className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-teal-600 font-semibold transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {isJa ? "ブログ一覧へ戻る" : "Back to Blog"}
          </Link>

          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-teal-100 text-teal-800 border border-teal-200">
            {isJa ? "ラフティング" : "Rafting"}
          </span>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-stone-900 leading-tight tracking-tight">
            {isJa
              ? "群馬ラフティング完全ガイド：利根川の激流体験"
              : "The Ultimate Guide to Rafting in Gunma: Japan's Finest Whitewater"}
          </h1>

          {/* Author and Date Meta */}
          <div className="flex flex-wrap items-center gap-6 pt-4 border-t border-stone-100 text-sm text-stone-500">
            <div className="flex items-center gap-2">
              <BrandLogo size="sm" showName={false} alt="Dream Adventure Logo" />
              <span className="font-semibold text-stone-800">
                {isJa ? "ドリームアドベンチャー ガイドチーム" : "Dream Adventure Guide Team"}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-stone-400" />
              <span>{isJa ? "2026年6月8日" : "June 8, 2026"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-stone-400" />
              <span>{isJa ? "読了目安 5分" : "5 min read"}</span>
            </div>
          </div>
        </div>
      </header>

      {/* ─── Hero Gradient ────────────────────────────────────────────────── */}
      <div className="container-site max-w-4xl mx-auto mb-12">
        <div className="relative h-64 md:h-96 w-full rounded-2xl overflow-hidden shadow-lg border border-stone-100 bg-gradient-to-br from-teal-900 via-emerald-800 to-teal-950 flex items-center justify-center">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(20,184,166,0.25),transparent_50%)]" aria-hidden="true" />
          <div className="relative z-10 text-center p-6 flex flex-col items-center">
            <span className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-teal-300 mb-4 shadow-inner">
              <Waves className="w-10 h-10 animate-pulse" />
            </span>
            <p className="text-teal-200 text-sm font-semibold tracking-wider uppercase">
              {isJa ? "ラフティング" : "Rafting"}
            </p>
          </div>
        </div>
      </div>

      {/* ─── Article Content ────────────────────────────────────────────── */}
      <div className="container-site max-w-4xl mx-auto pb-20">
        <div className="prose prose-teal max-w-3xl mx-auto text-stone-800 leading-relaxed">
          {isJa ? (
            // Japanese version
            <>
              <p className="text-lg font-medium text-stone-700 leading-relaxed mb-6">
                群馬県の山岳地帯に位置する沼田市は、日本屈指のラフティングの聖地として広く知られています。利根川の力強い流れのおかげで、東京をはじめ各地から多くのアドベンチャー愛好家が、世界クラスの急流、見事な高山景観、そして忘れられないスリルを求めてこの地を訪れます。
              </p>

              <h2 className="text-2xl font-bold text-stone-900 mt-10 mb-4">
                なぜ利根川を選ぶのか？
              </h2>
              <p>
                利根川（とねがわ）は、日本最大級にして最も有名な河川の一つです。春の間、日本アルプスからの雪解け水が流れ込むことで、川は水しぶきを上げるグレード4の激流プレイグラウンドへと姿を変えます。極限のドロップを求めるアドレナリンジャンキーであっても、美しい夏の景色をのんびり下りたい自然愛好家であっても、利根川はあらゆる期待に応えてくれます。
              </p>

              <h2 className="text-2xl font-bold text-stone-900 mt-10 mb-4">
                ドリームアドベンチャーのツアーで体験できること
              </h2>
              <p>
                ドリームアドベンチャーでは、安全性とプレミアムな体験を最優先にしています。高度なトレーニングを積み、資格を保有したガイドが、川のベストセクションをナビゲートします。ご旅行のスケジュールに完璧に合わせられるよう、出発時間は午前9:00、午前11:30、午後1:30の3つの時間枠を確約してご提供しています。高品質なウェットスーツ、ヘルメット、ライフジャケットなど、必要な基本装備はすべて無料でご用意しております。
              </p>

              <h2 className="text-2xl font-bold text-stone-900 mt-10 mb-4">
                究極のコンボ：ラフティング＋キャニオニング
              </h2>
              <p>
                ラフティングだけで終わらせる手はありません。群馬への旅を最大限に楽しむなら、午前中に川を制覇し、午後に天然の滝を滑り降りる「ラフティング＆キャニオニング・コンボパッケージ」がおすすめです。丸一日かけて日本のアウトドアを満喫する、究極の体験です。
              </p>
            </>
          ) : (
            // English version
            <>
              <p className="text-lg font-medium text-stone-700 leading-relaxed mb-6">
                Gunma&apos;s Numata area is widely considered one of the finest whitewater rafting destinations in Japan. Thanks to the powerful currents of the Tone River, adventure seekers from Tokyo and beyond travel here for world-class rapids, stunning mountain scenery, and unforgettable thrills.
              </p>

              <h2 className="text-2xl font-bold text-stone-900 mt-10 mb-4">
                Why Choose the Tone River?
              </h2>
              <p>
                The Tone River (Tone-gawa) is one of Japan&apos;s largest and most famous rivers. During the spring months, the melting snow from the Japanese Alps transforms the river into a roaring, Grade 4 whitewater playground. Whether you are an adrenaline junkie looking for extreme drops or a nature lover wanting a scenic summer float, the Tone River delivers.
              </p>

              <h2 className="text-2xl font-bold text-stone-900 mt-10 mb-4">
                What to Expect on a Dream Adventure Tour
              </h2>
              <p>
                At Dream Adventure, safety and premium experiences are our top priorities. Our thoroughly trained professional guides will navigate you through the best sections of the river. We offer convenient, hard-locked departure times at 9:00 AM, 11:30 AM, and 1:30 PM to fit your travel schedule perfectly. All essential gear—including premium wetsuits, helmets, and life jackets—is provided.
              </p>

              <h2 className="text-2xl font-bold text-stone-900 mt-10 mb-4">
                The Ultimate Combo: Rafting + Canyoning
              </h2>
              <p>
                Why stop at just rafting? To get the absolute most out of your Gunma trip, our Rafting &amp; Canyoning Combo Package allows you to conquer the river in the morning and slide down natural waterfalls in the afternoon. It is the ultimate full-day Japan outdoor experience.
              </p>
            </>
          )}
        </div>

        {/* ─── Premium CTA Box ────────────────────────────────────────────── */}
        <div className="max-w-3xl mx-auto mt-16 rounded-3xl p-8 md:p-12 text-center relative overflow-hidden shadow-2xl border border-teal-100"
          style={{
            background: "linear-gradient(135deg, #0f766e 0%, #0d9488 60%, #14b8a6 100%)"
          }}
        >
          {/* Shimmer Overlay */}
          <div className="absolute inset-0 pointer-events-none opacity-20"
            style={{
              backgroundImage: "radial-gradient(circle at 75% 20%, white 0%, transparent 60%)"
            }}
            aria-hidden="true"
          />

          <div className="relative z-10 space-y-6">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-white/20 text-white">
              <Compass className="w-4 h-4 animate-spin-slow" />
              {isJa ? "シーズン限定・予約受付中" : "Booking for Season"}
            </span>

            <h3 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              {isJa ? "冒険に出発しましょう！" : "Ready to Ride?"}
            </h3>

            <p className="text-teal-50 max-w-lg mx-auto text-sm md:text-base leading-relaxed">
              {isJa
                ? "ドリームアドベンチャーなら、オンラインで簡単リクエスト。お支払いは当日ベースにて、現地払いで安心です。"
                : "Submit your booking request online in under 2 minutes. Our team will call you to finalize your slot. Zero online payment required."}
            </p>

            <div className="pt-4">
              <BlogBookingCTA
                locale={locale}
                label="Book Your Gunma Adventure Now"
                labelJa="今すぐ群馬アドベンチャーを予約する"
                id="blog-booking-cta"
              />
            </div>
          </div>
        </div>

      </div>
    </article>
  );
}

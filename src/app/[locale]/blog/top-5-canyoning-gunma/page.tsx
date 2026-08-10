import { getLocale } from "next-intl/server";
import Link from "next/link";
import BlogBookingCTA from "@/components/ui/BlogBookingCTA";

import { ArrowLeft, Clock, Waves, Wrench, Compass, BookOpen, Calendar, ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import BrandLogo from "@/components/ui/BrandLogo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isJa = locale === "ja";
  return {
    title: isJa
      ? "群馬が東京近郊で最高のキャニオニング体験を提供する5つの理由 | ドリームアドベンチャー"
      : "Top 5 Reasons Gunma Offers the Best Canyoning Near Tokyo | Dream Adventure",
    description: isJa
      ? "東京から約75分！群馬キャニオニングの魅力を5つのポイントで紹介。天然岩スライダーや美しい渓谷、初心者向けから本格派まで対応。"
      : "If you live in or are visiting Tokyo and want to escape the city heat, canyoning in Gunma is the ultimate adventure. Here are 5 reasons why.",
    alternates: {
      canonical: locale === "ja" ? "/blog/top-5-canyoning-gunma" : `/en/blog/top-5-canyoning-gunma`,
      languages: {
        en: "/en/blog/top-5-canyoning-gunma",
        ja: "/blog/top-5-canyoning-gunma",
        "x-default": "/blog/top-5-canyoning-gunma",
      },
    },
  };
}

export default async function Top5CanyoningPage() {
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
              {isJa ? "群馬キャニオニング5つの魅力" : "Top 5 Canyoning Reasons"}
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
            {isJa ? "キャニオニング" : "Canyoning"}
          </span>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-stone-900 leading-tight tracking-tight">
            {isJa
              ? "群馬が東京近郊で最高のキャニオニング体験を提供する5つの理由"
              : "Top 5 Reasons Gunma Offers the Best Canyoning Near Tokyo"}
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
              <Compass className="w-10 h-10 animate-pulse" />
            </span>
            <p className="text-teal-200 text-sm font-semibold tracking-wider uppercase">
              {isJa ? "キャニオニング" : "Canyoning"}
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
                東京にお住まいの方や観光で訪れている方で、都会の暑さから逃れたいなら、キャニオニングは究極のアウトドアアドベンチャーです。日本国内にも体験できる場所はいくつかありますが、群馬県沼田市は他を圧倒しています。ここでは、群馬が東京近郊で最高のキャニオニング目的地である5つの理由をご紹介します。
              </p>

              <h3 className="text-xl font-bold text-stone-900 mt-8 mb-3">
                1. 世界クラスの天然岩スライダー
              </h3>
              <p>
                何千年もかけて、利根川に流れ込む支流が岩を削り、滑らかな天然のウォータースライダーを作り出しました。群馬の渓谷では、ただ泳ぐだけではありません。20メートルの岩肌を滑り降り、透き通った深い滝つぼに直接飛び込むスリルを味わえます。
              </p>

              <h3 className="text-xl font-bold text-stone-900 mt-8 mb-3">
                2. 究極の高山天然水
              </h3>
              <p>
                群馬の渓谷を流れる水は、日本アルプスの雪解け水から直接流れ込んでいます。極めて清らかで、冷たく、信じられないほどの透明度を誇ります。この隠れた渓谷のプールに飛び込むことは、日本の夏を最も爽快に過ごす方法です。
              </p>

              <h3 className="text-xl font-bold text-stone-900 mt-8 mb-3">
                3. すべてのレベルに対応したスリル
              </h3>
              <p>
                高い崖からのジャンプや滝の懸垂下降を求める本格的なアドレナリンジャンキーでも、大自然の中で楽しく水しぶきを浴びたい初心者でも、群馬の多様な渓谷には、あなたの快適レベルに完璧に合わせたルートが揃っています。
              </p>

              <h3 className="text-xl font-bold text-stone-900 mt-8 mb-3">
                4. 息をのむような隠れた渓谷美
              </h3>
              <p>
                キャニオニングは、ハイキングコースや車からは決して見ることができない、手つかずの日本の大自然の中へとあなたを連れて行きます。そびえ立つ苔むした崖、鬱蒼とした緑の森、そして隠れた滝に完全に囲まれる体験ができます。
              </p>

              <h3 className="text-xl font-bold text-stone-900 mt-8 mb-3">
                5. 東京からのアクセスが抜群
              </h3>
              <p>
                このありのままの自然を体験するために、大掛かりなロードトリップは必要ありません。群馬は東京からのアクセスが非常に良好です。上越新幹線に乗れば、わずか1時間余りで到着できるため、週末の日帰り旅行にぴったりです。
              </p>
            </>
          ) : (
            // English version
            <>
              <p className="text-lg font-medium text-stone-700 leading-relaxed mb-6">
                If you live in or are visiting Tokyo and want to escape the city heat, canyoning is the ultimate outdoor adventure. While there are a few places to try it in Japan, Gunma&apos;s Numata area stands completely above the rest. Here are the top 5 reasons why Gunma is the premier canyoning destination near Tokyo.
              </p>

              <h3 className="text-xl font-bold text-stone-900 mt-8 mb-3">
                1. World-Class Natural Waterslides
              </h3>
              <p>
                Over thousands of years, the tributaries feeding into the Tone River have carved the rock into smooth, natural waterslides. In Gunma&apos;s canyons, you aren&apos;t just swimming; you are sliding down 20-meter rock faces directly into deep, crystal-clear plunge pools.
              </p>

              <h3 className="text-xl font-bold text-stone-900 mt-8 mb-3">
                2. The Ultimate Alpine Water
              </h3>
              <p>
                The water flowing through Gunma&apos;s canyons comes directly from the melting snow of the Japanese Alps. It is pristine, refreshing, and incredibly clear. Plunging into these hidden gorge pools is the most refreshing way to spend a Japanese summer.
              </p>

              <h3 className="text-xl font-bold text-stone-900 mt-8 mb-3">
                3. Thrills for Every Skill Level
              </h3>
              <p>
                Whether you are a hardcore adrenaline junkie looking for high cliff jumps and waterfall rappelling, or a beginner wanting a fun, splashy day in nature, Gunma&apos;s diverse canyons offer routes tailored to your exact comfort level.
              </p>

              <h3 className="text-xl font-bold text-stone-900 mt-8 mb-3">
                4. Breathtaking Hidden Gorges
              </h3>
              <p>
                Canyoning takes you into untouched parts of the Japanese wilderness that you simply cannot see from a hiking trail or a car. You will be completely surrounded by towering moss-covered cliffs, dense green forests, and hidden waterfalls.
              </p>

              <h3 className="text-xl font-bold text-stone-900 mt-8 mb-3">
                5. Easily Accessible from Tokyo
              </h3>
              <p>
                You don&apos;t need a massive road trip to experience this raw nature. Gunma is incredibly accessible from Tokyo. A quick ride on the Joetsu Shinkansen (bullet train) can get you there in just over an hour, making it the absolute perfect weekend day trip.
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
              {isJa ? "夏限定・爽快ウォータースライダー" : "Tokyo Day-Trip Adventure"}
            </span>

            <h3 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              {isJa ? "挑戦する準備はできましたか？" : "Ready to jump in?"}
            </h3>

            <p className="text-teal-50 max-w-lg mx-auto text-sm md:text-base leading-relaxed">
              {isJa
                ? "東京から新幹線で最短75分。美しい群馬の渓谷で、スリルあふれる天然岩スライダーや飛び込みに挑戦しましょう。"
                : "Escape Tokyo for the day and plunge into pristine canyons in Gunma. Secure your slot online in under 2 minutes, and pay on arrival at our base."}
            </p>

            <div className="pt-4">
              <BlogBookingCTA
                locale={locale}
                label="Book Your Canyoning Adventure Now"
                labelJa="今すぐキャニオニングツアーを予約する"
                id="blog-booking-canyoning-cta"
              />
            </div>
          </div>
        </div>

      </div>
    </article>
  );
}

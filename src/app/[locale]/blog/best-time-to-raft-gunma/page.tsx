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
      ? "群馬ラフティングのベストシーズンはいつ？季節ごとの魅力解説 | ドリームアドベンチャー"
      : "Best Time to Visit Gunma for River Rafting | Dream Adventure",
    description: isJa
      ? "群馬ラフティングの時期選びガイド。春の雪解け大激流、夏のファミリー水遊び、秋の紅葉絶景など、季節ごとの特徴を解説。"
      : "Gunma offers world-class whitewater rafting on the Tone River, but the experience completely transforms depending on the season. Read our seasonal guide.",
    alternates: {
      canonical: locale === "ja" ? "/blog/best-time-to-raft-gunma" : `/en/blog/best-time-to-raft-gunma`,
      languages: {
        en: "/en/blog/best-time-to-raft-gunma",
        ja: "/blog/best-time-to-raft-gunma",
        "x-default": "/blog/best-time-to-raft-gunma",
      },
    },
  };
}

export default async function BestTimeToRaftPage() {
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
              {isJa ? "ラフティングのベストシーズン" : "Best Time to Raft"}
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
            {isJa ? "シーズン" : "Season Guide"}
          </span>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-stone-900 leading-tight tracking-tight">
            {isJa
              ? "群馬ラフティングのベストシーズンはいつ？季節ごとの魅力解説"
              : "When is the Best Time to Visit Gunma for River Rafting?"}
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
              <Calendar className="w-10 h-10 animate-pulse" />
            </span>
            <p className="text-teal-200 text-sm font-semibold tracking-wider uppercase">
              {isJa ? "シーズンガイド" : "Season Guide"}
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
                群馬の利根川は世界クラスのラフティングが体験できる場所ですが、その体験は季節によって全く異なる姿を見せます。極限のスリルを求める方も、のんびりとしたファミリー旅行をお考えの方も、利根川では時期選びがすべてです。
              </p>

              <h2 className="text-2xl font-bold text-stone-900 mt-10 mb-4">
                春（4月〜6月）：雪解けの激流シーズン
              </h2>
              <p>
                アドレナリンを求める方には、この季節が最もおすすめです。日本アルプスの雪解け水が流れ込むことで、利根川は驚異的な水量に膨れ上がり、轟音を立てるグレード4の激流を作り出します。ワイルドで、ハイスピード、そして決して忘れられない冒険が楽しめます。水位が高く勢いがあるこの時期は、日本で最もエキサイティングな激流体験ができます。
              </p>

              <h2 className="text-2xl font-bold text-stone-900 mt-10 mb-4">
                夏（7月〜9月）：ファミリーで楽しむ水遊びシーズン
              </h2>
              <p>
                夏の暑さが本格化すると、水位が下がり水温も上がります。ご家族連れや初心者が川で遊ぶのに最適な時期です。急流はグレード2〜3に落ち着き、川を泳いだり、岩から飛び込んだり、美しい緑の渓谷を楽しんだりする時間が十分にあります。子どもたちに最も人気があるシーズンです！
              </p>

              <h2 className="text-2xl font-bold text-stone-900 mt-10 mb-4">
                秋（10月〜11月）：紅葉の絶景シーズン
              </h2>
              <p>
                秋は澄んだ空気、透き通った水、そして渓谷を彩る息をのむような美しい紅葉（もみじ狩り）が楽しめます。群馬の渓谷が最も美しく輝く時期で、穏やかながらもワクワクする川下りの旅を満喫できます。
              </p>
            </>
          ) : (
            // English version
            <>
              <p className="text-lg font-medium text-stone-700 leading-relaxed mb-6">
                Gunma&apos;s Tone River offers world-class whitewater rafting, but the experience completely transforms depending on the season. Whether you are hunting for extreme thrills or planning a relaxing family trip, timing is everything on the Tone River.
              </p>

              <h2 className="text-2xl font-bold text-stone-900 mt-10 mb-4">
                Spring (April to June): The Extreme Snowmelt
              </h2>
              <p>
                If you are an adrenaline seeker, this is your season. As the snow melts from the Japanese Alps, the Tone River swells with massive volume, creating roaring Grade 4 rapids. It is wild, fast, and unforgettable. Due to the intense water levels, this season offers the most extreme thrills in Japan.
              </p>

              <h2 className="text-2xl font-bold text-stone-900 mt-10 mb-4">
                Summer (July to September): Family-Friendly Fun
              </h2>
              <p>
                As the summer heat sets in, the river water lowers and warms up, making it the perfect playground for families and beginners. The rapids calm down to Grade 2 and 3, allowing for plenty of time to swim, jump from rocks, and enjoy the stunning green canyons. This is our most popular season for children!
              </p>

              <h2 className="text-2xl font-bold text-stone-900 mt-10 mb-4">
                Autumn (October to November): Scenic Splendor
              </h2>
              <p>
                Autumn offers crisp air, crystal-clear water, and breathtaking fall foliage (koyo) lining the gorge. It is the most visually beautiful time to raft in Gunma, offering a peaceful yet exciting journey down the river.
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
              {isJa ? "季節ごとの魅力・予約受付中" : "Experience the Seasons of Tone River"}
            </span>

            <h3 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              {isJa ? "利根川の冒険に出発しませんか？" : "Ready to experience the Tone River?"}
            </h3>

            <p className="text-teal-50 max-w-lg mx-auto text-sm md:text-base leading-relaxed">
              {isJa
                ? "春の雪解け大激流から夏のファミリーツアーまで。オンラインでリクエストを送信後、スタッフがお電話にて調整いたします。"
                : "Submit your request online. Our team calls you to confirm. Pay on arrival — zero payment required online."}
            </p>

            <div className="pt-4">
              <BlogBookingCTA
                locale={locale}
                label="Book Your Seasonal Adventure Now"
                labelJa="今すぐ季節のツアーを予約する"
                id="blog-booking-time-cta"
              />
            </div>
          </div>
        </div>

      </div>
    </article>
  );
}

import { getLocale } from "next-intl/server";
import Link from "next/link";

import { ArrowLeft, Clock, Waves, Wrench, Compass, BookOpen, Calendar, ChevronRight } from "lucide-react";
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
      ? "利根川探訪初心者ガイド：群馬の大自然を満喫しよう | ドリームアドベンチャー"
      : "A Beginner's Guide to Exploring the Tone River, Gunma | Dream Adventure",
    description: isJa
      ? "日本屈指の河川・利根川の魅力を初心者向けに分かりやすく解説。群馬の美しい渓谷、ラフティング体験、季節の見どころまで紹介。"
      : "The Tone River is the beating heart of Kanto outdoor adventure. Read our beginner's guide to exploring Gunma's natural beauty on the water.",
    alternates: {
      canonical: locale === "ja" ? "/blog/tone-river-guide" : `/en/blog/tone-river-guide`,
      languages: {
        en: "/en/blog/tone-river-guide",
        ja: "/blog/tone-river-guide",
        "x-default": "/blog/tone-river-guide",
      },
    },
  };
}

export default async function ToneRiverGuidePage() {
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
              {isJa ? "利根川初心者ガイド" : "Tone River Guide"}
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
            {isJa ? "利根川ガイド" : "River Guide"}
          </span>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-stone-900 leading-tight tracking-tight">
            {isJa 
              ? "利根川探訪初心者ガイド：群馬の大自然を満喫しよう" 
              : "A Beginner's Guide to Exploring the Tone River, Gunma"}
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
              <span>{isJa ? "読了目安 4分" : "4 min read"}</span>
            </div>
          </div>
        </div>
      </header>

      {/* ─── Hero Image ────────────────────────────────────────────────── */}
            {/* ─── Hero Gradient ────────────────────────────────────────────────── */}
      <div className="container-site max-w-4xl mx-auto mb-12">
        <div className="relative h-64 md:h-96 w-full rounded-2xl overflow-hidden shadow-lg border border-stone-100 bg-gradient-to-br from-teal-900 via-emerald-800 to-teal-950 flex items-center justify-center">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(20,184,166,0.25),transparent_50%)]" aria-hidden="true" />
          <div className="relative z-10 text-center p-6 flex flex-col items-center">
            <span className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-teal-300 mb-4 shadow-inner">
              <Waves className="w-10 h-10 animate-pulse" />
            </span>
            <p className="text-teal-200 text-sm font-semibold tracking-wider uppercase">
              {isJa ? "リバーガイド" : "River Guide"}
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
                利根川（とねがわ）は、単に日本最大級の河川であるだけでなく、関東地方におけるアウトドアアドベンチャーの鼓動そのものです。群馬県の野生味あふれる手つかずの美しさを体験したい初心者の方にとって、利根川は自然への完璧な入門書となります。
              </p>

              <h3 className="text-xl font-bold text-stone-900 mt-8 mb-3">
                利根川が特別な理由
              </h3>
              <p>
                日本アルプスの冠雪した山々から直接流れ出る利根川の上流部は、群馬の深く息をのむような渓谷を通り抜けます。水は極めて清らかで、周囲の森は青々と茂り、新緑の春から紅葉の秋まで、季節ごとに景色が劇的に変化します。
              </p>

              <h3 className="text-xl font-bold text-stone-900 mt-8 mb-3">
                川を満喫する最適な方法：ラフティング
              </h3>
              <p>
                利根川を探索するのに、極限のアスリートである必要はありません。春の雪解け水は世界クラスのグレード4の激流をもたらしますが、夏の数ヶ月間は川が美しく、水しぶきが心地よい、初心者向けの遊び場へと姿を変えます。ラフティングなら、徒歩では行けない渓谷を浮き下り、穏やかなプールで泳ぎ、岸からでは決して味わえない方法で川を体験できます。
              </p>

              <h3 className="text-xl font-bold text-stone-900 mt-8 mb-3">
                特別な経験は不要
              </h3>
              <p>
                ドリームアドベンチャーでは、資格を持つガイドがすべての操船を担当します。ウェットスーツ、ヘルメット、ライフジャケットのレンタルはもちろん、丁寧な講習も提供します。お客様は集合して、指示通りに漕ぎ、人生最高のライドを楽しむだけです。
              </p>
            </>
          ) : (
            // English version
            <>
              <p className="text-lg font-medium text-stone-700 leading-relaxed mb-6">
                The Tone River (Tone-gawa) is not just one of Japan's largest rivers; it is the beating heart of outdoor adventure in the Kanto region. If you are a beginner looking to experience the wild, untamed beauty of Gunma Prefecture, the Tone River offers the perfect introduction to nature.
              </p>

              <h3 className="text-xl font-bold text-stone-900 mt-8 mb-3">
                Why the Tone River is Special
              </h3>
              <p>
                Flowing directly from the snow-capped peaks of the Japanese Alps, the upper reaches of the Tone River pass through deep, breathtaking gorges in Gunma. The water is pristine, the surrounding forests are lush, and the scenery changes dramatically with every season—from vibrant spring greens to stunning autumn reds.
              </p>

              <h3 className="text-xl font-bold text-stone-900 mt-8 mb-3">
                The Best Way to See the River: Whitewater Rafting
              </h3>
              <p>
                You do not need to be an extreme athlete to explore the Tone River. While the spring snowmelt brings world-class Grade 4 rapids, the summer months transform the river into a beautiful, splashy, and beginner-friendly playground. Whitewater rafting allows you to float through inaccessible canyons, swim in calm pools, and experience the river in a way you never could from the shore.
              </p>

              <h3 className="text-xl font-bold text-stone-900 mt-8 mb-3">
                No Experience Required
              </h3>
              <p>
                At Dream Adventure, our professional guides handle all the navigation. We provide the wetsuits, helmets, life jackets, and instruction. All you need to do is show up, paddle when instructed, and enjoy the ride of your life.
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
              {isJa ? "初心者歓迎・群馬の大自然" : "Tone River Whitewater"}
            </span>

            <h3 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              {isJa ? "群馬への旅を今日始めましょう" : "Start Your Gunma Journey Today"}
            </h3>

            <p className="text-teal-50 max-w-lg mx-auto text-sm md:text-base leading-relaxed">
              {isJa 
                ? "東京から1時間ちょっと。日本三大急流のひとつである利根川で、忘れられないラフティング体験を。今すぐオンラインで空き状況をチェック！"
                : "Experience the crystal-clear currents of the legendary Tone River. Safe, thrilling, and suitable for all ages. Book online in 2 minutes!"}
            </p>

            <div className="pt-4">
              <BlogBookingCTA
                locale={locale}
                label="Book Your Tone River Adventure Now"
                labelJa="今すぐ利根川ラフティングツアーを予約する"
                id="blog-booking-tone-cta"
              />
            </div>
          </div>
        </div>

      </div>
    </article>
  );
}

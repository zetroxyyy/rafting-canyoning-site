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
      ? "ラフティング vs キャニオニング：群馬であなたにぴったりの冒険はどちら？ | ドリームアドベンチャー"
      : "Rafting vs Canyoning in Gunma | Dream Adventure",
    description: isJa
      ? "群馬県でのラフティングとキャニオニングを徹底比較。スリルの違い、グループに適した選択肢、コンボパックの魅力をご紹介。"
      : "Planning a trip to Gunma? Let's compare our two most popular outdoor activities—Whitewater Rafting and Canyoning—to help you choose.",
    alternates: {
      canonical: locale === "ja" ? "/blog/rafting-vs-canyoning" : `/en/blog/rafting-vs-canyoning`,
      languages: {
        en: "/en/blog/rafting-vs-canyoning",
        ja: "/blog/rafting-vs-canyoning",
        "x-default": "/blog/rafting-vs-canyoning",
      },
    },
  };
}

export default async function RaftingVsCanyoningPage() {
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
              {isJa ? "ラフティング vs キャニオニング" : "Rafting vs. Canyoning"}
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
            {isJa ? "アドベンチャー" : "Adventure"}
          </span>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-stone-900 leading-tight tracking-tight">
            {isJa 
              ? "ラフティング vs キャニオニング：群馬であなたにぴったりの冒険はどちら？" 
              : "Rafting vs. Canyoning: Which Gunma Adventure is Right for You?"}
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
              <span>{isJa ? "読了目安 6分" : "6 min read"}</span>
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
              <Compass className="w-10 h-10 animate-pulse" />
            </span>
            <p className="text-teal-200 text-sm font-semibold tracking-wider uppercase">
              {isJa ? "アドベンチャー" : "Adventure"}
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
                群馬への旅行を計画中なら、最も人気のある2つのアウトドアアクティビティ、ラフティングとキャニオニングをご検討されていることでしょう。どちらも日本の大自然の中で素晴らしいスリルを味わえますが、全く異なる体験を提供します。ここでは、あなたのグループにとって最適な冒険を選ぶためのポイントをご紹介します。
              </p>

              <h2 className="text-2xl font-bold text-stone-900 mt-10 mb-4">
                ラフティング：チームワークとダイナミックな白波
              </h2>
              <p>
                利根川でのラフティングは究極のチームスポーツです。専門のインストラクターの指導のもと、仲間と一緒にパドルを漕ぎ、グレード3およびグレード4の急流を進みます。スピード感があり、水しぶきを浴びながら進むこのツアーは、ご家族、グループ、そして激流のアドレナリンを楽しみたいすべての方に最適です。
              </p>

              <h2 className="text-2xl font-bold text-stone-900 mt-10 mb-4">
                キャニオニング：大自然のウォーターパーク
              </h2>
              <p>
                キャニオニングは、よりパーソナルで体感型のアドベンチャーです。ボートに乗る代わりに、自分自身の体がボートになります！天然の岩の滑り台を滑り降り、透き通った高山の水たまりに飛び込み、滝を懸垂下降します。群馬の隠れた渓谷を間近で体験できる、没入型の冒険です。
              </p>

              <h2 className="text-2xl font-bold text-stone-900 mt-10 mb-4">
                結論：両方体験してみては？
              </h2>
              <p>
                川でのチームワークと、滝を滑り降りる生の興奮の両方を味わいたいなら、「ラフティング＆キャニオニング・コンボパッケージ」が究極の1日体験をご提供します。
              </p>
            </>
          ) : (
            // English version
            <>
              <p className="text-lg font-medium text-stone-700 leading-relaxed mb-6">
                If you are planning a trip to Gunma, you are likely looking at our two most popular outdoor activities: Whitewater Rafting and Canyoning. Both offer incredible thrills in the Japanese wilderness, but they deliver completely different experiences. Here is how to choose the perfect adventure for your group.
              </p>

              <h2 className="text-2xl font-bold text-stone-900 mt-10 mb-4">
                Whitewater Rafting: Teamwork and Big Waves
              </h2>
              <p>
                Rafting on the Tone River is the ultimate team sport. You and your friends will paddle together under the guidance of our expert instructors, navigating through Grade 3 and Grade 4 rapids. It is fast, splashy, and perfect for families, groups, and anyone who loves the adrenaline of big water.
              </p>

              <h2 className="text-2xl font-bold text-stone-900 mt-10 mb-4">
                Canyoning: Nature's Water Park
              </h2>
              <p>
                Canyoning is a more individual, hands-on adventure. Instead of riding in a boat, your body becomes the boat! You will slide down natural rock waterslides, jump into crystal-clear alpine pools, and rappel down waterfalls. It is an immersive, close-up way to experience the hidden gorges of Gunma.
              </p>

              <h2 className="text-2xl font-bold text-stone-900 mt-10 mb-4">
                The Verdict: Why Not Both?
              </h2>
              <p>
                If you want the teamwork of the river and the raw excitement of sliding down waterfalls, our Rafting + Canyoning Combo Package gives you the ultimate full-day experience.
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
              {isJa ? "限定コンボパック・特別料金" : "Best Value Adventure Combo"}
            </span>

            <h3 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              {isJa ? "今すぐコンボパックを予約する" : "Book Your Combo Adventure Now"}
            </h3>

            <p className="text-teal-50 max-w-lg mx-auto text-sm md:text-base leading-relaxed">
              {isJa 
                ? "午前ラフティング＋午後キャニオニングが1日で楽しめるコンボパッケージ。オンラインでリクエストを送信後、スタッフがお電話にて調整いたします。"
                : "Combine both rafting and canyoning for a full-day discount experience. Pay on arrival, with concierge scheduling and customized departure times."}
            </p>

            <div className="pt-4">
              <BlogBookingCTA
                locale={locale}
                label="Book Your Combo Adventure Now"
                labelJa="今すぐコンボパックを予約する"
                id="blog-booking-combo-cta"
              />
            </div>
          </div>
        </div>

      </div>
    </article>
  );
}

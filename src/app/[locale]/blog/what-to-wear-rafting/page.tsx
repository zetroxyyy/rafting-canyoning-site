import { getLocale } from "next-intl/server";
import Link from "next/link";
import BlogBookingCTA from "@/components/ui/BlogBookingCTA";

import { ArrowLeft, Clock, Wrench, Waves, Compass, BookOpen, Calendar, ChevronRight } from "lucide-react";
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
      ? "日本でのラフティングの服装・持ち物（完全準備リスト） | ドリームアドベンチャー"
      : "What to Wear Whitewater Rafting in Japan | Dream Adventure",
    description: isJa
      ? "利根川でのラフティングツアーに必要な服装と持ち物の完全ガイド。無料のレンタル装備リストからお客様ご自身で用意する持ち物まで解説。"
      : "Preparing for a whitewater rafting trip on the Tone River? Learn exactly what gear is provided and what essentials you need to bring.",
    alternates: {
      canonical: locale === "ja" ? "/blog/what-to-wear-rafting" : `/en/blog/what-to-wear-rafting`,
      languages: {
        en: "/en/blog/what-to-wear-rafting",
        ja: "/blog/what-to-wear-rafting",
        "x-default": "/blog/what-to-wear-rafting",
      },
    },
  };
}

export default async function WhatToWearRaftingPage() {
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
              {isJa ? "ラフティングの服装・持ち物" : "What to Wear Rafting"}
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
            {isJa ? "装備ガイド" : "Gear Guide"}
          </span>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-stone-900 leading-tight tracking-tight">
            {isJa 
              ? "日本でのラフティングの服装・持ち物（完全準備リスト）" 
              : "What to Wear for Whitewater Rafting in Japan (Complete Packing List)"}
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
              <Wrench className="w-10 h-10 animate-pulse" />
            </span>
            <p className="text-teal-200 text-sm font-semibold tracking-wider uppercase">
              {isJa ? "装備ガイド" : "Gear Guide"}
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
                利根川でのラフティングツアーへの準備は、想像以上に簡単です。春のハイアドレナリン激流アドベンチャーでも、夏の水しぶきを浴びる爽快ツアーでも、適切な服装を知っておくことで、快適かつ安全に急流に挑むことができます。ドリームアドベンチャーがお届けする、完全な準備リストをご紹介します。
              </p>

              <h2 className="text-2xl font-bold text-stone-900 mt-10 mb-4">
                無料レンタル装備（ベースでご用意するもの）
              </h2>
              <p>
                ドリームアドベンチャーでご予約いただく際、高価なテクニカルギアを購入する必要はありません。必要なプロフェッショナル用安全装備はすべて無料でご提供しております。これには以下が含まれます：
              </p>
              <ul>
                <li><strong>高品質ウェットスーツ＆スプレージャケット：</strong>冷たい川の水でも体を温かく保ちます。</li>
                <li><strong>安全ヘルメット：</strong>頭部をしっかり保護する、ぴったりフィットのヘルメット。</li>
                <li><strong>高浮力ライフジャケット：</strong>激流の中でも無理なく体を浮かせます。</li>
              </ul>

              <h2 className="text-2xl font-bold text-stone-900 mt-10 mb-4">
                お客様自身でご用意いただく持ち物
              </h2>
              <p>
                ウェットスーツの下に着用し、快適に過ごすために、以下のものをご用意ください：
              </p>
              <ul>
                <li><strong>水着：</strong>ウェットスーツの下に着用する水着、または速乾性のアスレチックアンダーウェア。</li>
                <li><strong>マリンシューズまたは濡れてもいいスニーカー：</strong>川の中で脱げない、しっかりと固定できる履物。（ビーチサンダルやクロックスは不可！）。</li>
                <li><strong>タオル＆着替え：</strong>ツアー終了後、ベースの温水シャワーを浴びた後に体を拭き、着替えるためのもの。</li>
                <li><strong>日焼け止め：</strong>特に夏季は水面からの日差しが強く反射します。</li>
              </ul>

              <h2 className="text-2xl font-bold text-stone-900 mt-10 mb-4">
                貴重品はロッカーへ
              </h2>
              <p>
                スマートフォン、ジュエリー、防水機能のないカメラ等は、お車の中かベースの鍵付きロッカーに置いておくことを強くお勧めします。ツアー中はプロのガイドが最高の瞬間を高画質写真で撮影いたします！
              </p>
            </>
          ) : (
            // English version
            <>
              <p className="text-lg font-medium text-stone-700 leading-relaxed mb-6">
                Preparing for a whitewater rafting trip on the Tone River is easier than you might think. Whether you are visiting Gunma for a summer splash or a high-adrenaline spring adventure, knowing exactly what to wear will keep you comfortable, safe, and ready for the rapids. Here is your complete Dream Adventure packing list.
              </p>

              <h2 className="text-2xl font-bold text-stone-900 mt-10 mb-4">
                What We Provide (The Heavy Gear)
              </h2>
              <p>
                When you book with Dream Adventure, you do not need to buy any expensive technical gear. We provide all the professional safety equipment you need, completely free of charge. This includes:
              </p>
              <ul>
                <li><strong>Premium Wetsuits & Splash Jackets:</strong> To keep you warm in the alpine river water.</li>
                <li><strong>Safety Helmets:</strong> Perfectly fitted for your protection.</li>
                <li><strong>High-Buoyancy Life Jackets:</strong> To keep you floating effortlessly in the rapids.</li>
              </ul>

              <h2 className="text-2xl font-bold text-stone-900 mt-10 mb-4">
                What You Need to Bring
              </h2>
              <p>
                To wear underneath your wetsuit and keep yourself comfortable, please pack the following essentials:
              </p>
              <ul>
                <li><strong>Swimwear:</strong> Wear a swimsuit or quick-drying athletic underwear beneath your wetsuit.</li>
                <li><strong>Water Shoes or Old Sneakers:</strong> You need secure footwear that won't fall off in the river. (No flip-flops or Crocs!).</li>
                <li><strong>A Towel & Change of Clothes:</strong> For drying off and changing into something warm after your hot shower at our base.</li>
                <li><strong>Sunscreen:</strong> The sun reflects strongly off the water, especially in the summer months.</li>
              </ul>

              <h2 className="text-2xl font-bold text-stone-900 mt-10 mb-4">
                Leave the Valuables Behind
              </h2>
              <p>
                We highly recommend leaving your phone, jewelry, and non-waterproof cameras in your vehicle or our secure lockers. Our professional guides will be taking high-quality photos of your adventure throughout the trip!
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
              {isJa ? "装備レンタル完備・予約受付中" : "Safety First Rafting Adventures"}
            </span>

            <h3 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              {isJa ? "今すぐラフティングツアーを予約する" : "Book Your Rafting Trip Now"}
            </h3>

            <p className="text-teal-50 max-w-lg mx-auto text-sm md:text-base leading-relaxed">
              {isJa 
                ? "高浮力ライフジャケット、ウェットスーツなど装備一式は無料レンタル。当日現地払いで、安心安全な激流ラフティングをご提供します。"
                : "Professional safety helmets, high-buoyancy life jackets, and premium wetsuits are fully included in all packages. Secure your slot now."}
            </p>

            <div className="pt-4">
              <BlogBookingCTA
                locale={locale}
                label="Book Your Rafting Trip Now"
                labelJa="今すぐラフティングツアーを予約する"
                id="blog-booking-wear-cta"
              />
            </div>
          </div>
        </div>

      </div>
    </article>
  );
}

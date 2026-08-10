import { getLocale } from "next-intl/server";
import Link from "next/link";
import { ChevronRight, Calendar, Clock, BookOpen, Waves, Compass, Shield, Wrench, MapPin } from "lucide-react";
import type { Metadata } from "next";
import { getBlogPosts } from "@/lib/utils/markdown";

function getBlogIcon(category: string, slug: string) {
  const cat = category.toLowerCase();
  const slg = slug.toLowerCase();
  if (cat.includes("raft") || slg.includes("raft")) return <Waves className="w-16 h-16 text-teal-300/30 group-hover:scale-110 transition-transform duration-500" />;
  if (cat.includes("canyon") || slg.includes("canyon")) return <Compass className="w-16 h-16 text-teal-300/30 group-hover:scale-110 transition-transform duration-500" />;
  if (cat.includes("safety") || slg.includes("safety")) return <Shield className="w-16 h-16 text-teal-300/30 group-hover:scale-110 transition-transform duration-500" />;
  if (cat.includes("gear") || cat.includes("wear") || slg.includes("wear")) return <Wrench className="w-16 h-16 text-teal-300/30 group-hover:scale-110 transition-transform duration-500" />;
  if (cat.includes("access") || slg.includes("access")) return <MapPin className="w-16 h-16 text-teal-300/30 group-hover:scale-110 transition-transform duration-500" />;
  return <BookOpen className="w-16 h-16 text-teal-300/30 group-hover:scale-110 transition-transform duration-500" />;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isJa = locale === "ja";
  return {
    title: isJa ? "アドベンチャーブログ | ドリームアドベンチャー" : "Dream Adventure Blog",
    description: isJa
      ? "群馬でのラフティングやキャニオニングに関する最新情報、ガイドからのアドバイス、観光情報をお届けします。"
      : "Latest updates, guides, and tips for river rafting and canyoning in Gunma, Japan from the Dream Adventure team.",
    alternates: {
      canonical: locale === "ja" ? "/blog" : `/en/blog`,
      languages: {
        en: "/en/blog",
        ja: "/blog",
        "x-default": "/blog",
      },
    },
  };
}

export default async function BlogIndexPage() {
  const locale = await getLocale();
  const isJa = locale === "ja";
  const posts = getBlogPosts();

  const anchorTextMap: Record<string, string> = {
    "best-season-timing": "群馬 ラフティング おすすめの時期・季節についての記事を読む",
    "access-guide": "利根川ラフティングのアクセス情報とドリームアドベンチャーベースへの行き方について読む",
    "gunma-activities": "群馬でラフティング体験とアドベンチャースポーツの魅力を詳しく見る",
    "recommended-guide": "群馬でラフティングを体験するなら知るべきおすすめポイントを読む",
    "combo-guide": "ラフティング 関東エリアで最高峰のコンボツアーガイドを読む",
    "oana-base-safety": "群馬 ラフティングの安全対策とドリームアドベンチャーベースの取り組みについて読む",
  };


  return (
    <>
      {/* ─── Hero Header ────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-20 md:py-28 bg-gradient-to-br from-teal-950 via-teal-900 to-emerald-950">
        <div className="absolute inset-0 z-0">
          {/* Subtle light/glow overlay instead of image */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(20,184,166,0.15),transparent_50%)]" aria-hidden="true" />
          <div className="absolute inset-0 bg-gradient-to-b from-teal-900/80 via-teal-950/90 to-teal-950" aria-hidden="true" />
        </div>

        <div className="container-site relative z-10 text-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4 bg-teal-500/20 text-teal-300 border border-teal-500/30">
            <BookOpen className="w-3.5 h-3.5" />
            {isJa ? "冒険のヒント & ガイド" : "Adventure Tips & Guides"}
          </span>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight tracking-tight">
            {isJa ? "Dream Adventure ブログ" : "Dream Adventure Blog"}
          </h1>
          <p className="text-stone-300 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            {isJa
              ? "日本屈指のラフティングとキャニオニングの聖地、群馬から届く、最新の体験レポートとアクティビティガイド。"
              : "Expert insights, safety tips, and destination guides from the team at Japan's premier river rafting and canyoning base."}
          </p>
        </div>
      </section>

      {/* ─── Articles Grid ──────────────────────────────────────────────── */}
      <section className="section bg-stone-50" id="blog-grid">
        <div className="container-site">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {isJa ? (
              // Dynamic Japanese blog posts from parsed markdown
              posts.map((post) => (
                <Link
                  key={post.slug}
                  href={locale === "ja" ? `/blog/${post.slug}` : `/en/blog/${post.slug}`}
                  className="group flex flex-col h-full"
                >
                  <div className="card p-0 overflow-hidden h-full flex flex-col bg-white hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 border border-stone-100">
                    {/* Thumbnail Gradient */}
                    <div className="h-52 relative overflow-hidden bg-gradient-to-br from-teal-900 via-emerald-800 to-teal-950 flex items-center justify-center flex-shrink-0">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(20,184,166,0.2),transparent_50%)]" aria-hidden="true" />
                      {getBlogIcon(post.category, post.slug)}
                      <span className="absolute top-4 left-4 z-10 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-teal-600/90 text-white shadow-md backdrop-blur-sm">
                        {post.category}
                      </span>
                    </div>

                    {/* Card Content */}
                    <div className="p-6 flex-1 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center gap-4 text-xs text-stone-400 font-medium">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-stone-400" />
                            {post.date}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-stone-400" />
                            読了目安 {post.readTime}
                          </span>
                        </div>

                        <h2 className="text-xl font-bold text-stone-900 group-hover:text-teal-600 transition-colors duration-200 line-clamp-2 leading-tight">
                          {post.title}
                        </h2>

                        <p className="text-sm text-stone-500 line-clamp-3 leading-relaxed">
                          {post.description}
                        </p>
                      </div>

                      <div className="pt-6 border-t border-stone-100 mt-6 flex items-center justify-between">
                        <span className="inline-flex items-center gap-1 text-sm text-teal-600 font-semibold group-hover:text-teal-700">
                          {anchorTextMap[post.slug] || "記事を読む"}
                          <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                        </span>
                      </div>

                    </div>
                  </div>
                </Link>
              ))
            ) : (
              // English version: keep the original hardcoded English posts for English locale
              <>
                {/* Card 1: Gunma Rafting Guide */}
                <Link href={locale === "ja" ? "/blog/gunma-rafting-guide" : `/en/blog/gunma-rafting-guide`} className="group flex flex-col h-full">
                  <div className="card p-0 overflow-hidden h-full flex flex-col bg-white hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 border border-stone-100">
                    <div className="h-52 relative overflow-hidden bg-gradient-to-br from-teal-900 via-emerald-800 to-teal-950 flex items-center justify-center flex-shrink-0">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(20,184,166,0.2),transparent_50%)]" aria-hidden="true" />
                      {getBlogIcon("Rafting", "gunma-rafting-guide")}
                      <span className="absolute top-4 left-4 z-10 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-teal-600/90 text-white shadow-md backdrop-blur-sm">
                        Rafting
                      </span>
                    </div>
                    <div className="p-6 flex-1 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center gap-4 text-xs text-stone-400 font-medium">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-stone-400" />
                            June 8, 2026
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-stone-400" />
                            5 min read
                          </span>
                        </div>
                        <h2 className="text-xl font-bold text-stone-900 group-hover:text-teal-600 transition-colors duration-200 line-clamp-2 leading-tight">
                          The Ultimate Guide to Rafting in Gunma: Japan's Finest Whitewater
                        </h2>
                        <p className="text-sm text-stone-500 line-clamp-3 leading-relaxed">
                          Gunma, in Japan's mountainous interior, is home to the powerful Tone River. Learn why it offers some of Japan's finest whitewater rapids and why Dream Adventure is the team to guide you.
                        </p>
                      </div>
                      <div className="pt-6 border-t border-stone-100 mt-6 flex items-center justify-between">
                        <span className="inline-flex items-center gap-1 text-sm text-teal-600 font-semibold group-hover:text-teal-700">
                           Read about Rafting in Gunma and Tone River outdoor activities
                          <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>

                {/* Card 2: Rafting vs Canyoning */}
                <Link href={locale === "ja" ? "/blog/rafting-vs-canyoning" : `/en/blog/rafting-vs-canyoning`} className="group flex flex-col h-full">
                  <div className="card p-0 overflow-hidden h-full flex flex-col bg-white hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 border border-stone-100">
                    <div className="h-52 relative overflow-hidden bg-gradient-to-br from-teal-900 via-emerald-800 to-teal-950 flex items-center justify-center flex-shrink-0">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(20,184,166,0.2),transparent_50%)]" aria-hidden="true" />
                      {getBlogIcon("Adventure", "rafting-vs-canyoning")}
                      <span className="absolute top-4 left-4 z-10 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-teal-600/90 text-white shadow-md backdrop-blur-sm">
                        Adventure
                      </span>
                    </div>
                    <div className="p-6 flex-1 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center gap-4 text-xs text-stone-400 font-medium">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-stone-400" />
                            June 8, 2026
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-stone-400" />
                            6 min read
                          </span>
                        </div>
                        <h2 className="text-xl font-bold text-stone-900 group-hover:text-teal-600 transition-colors duration-200 line-clamp-2 leading-tight">
                          Rafting vs. Canyoning: Which Gunma Adventure is Right for You?
                        </h2>
                        <p className="text-sm text-stone-500 line-clamp-3 leading-relaxed">
                          Planning a trip to Gunma? Let’s compare our two most popular activities—Whitewater Rafting and Canyoning—to help you choose the perfect adventure.
                        </p>
                      </div>
                      <div className="pt-6 border-t border-stone-100 mt-6 flex items-center justify-between">
                        <span className="inline-flex items-center gap-1 text-sm text-teal-600 font-semibold group-hover:text-teal-700">
                          Compare Canyoning and Rafting in Gunma near Tokyo
                          <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>

                {/* Card 3: What to Wear Rafting */}
                <Link href={locale === "ja" ? "/blog/what-to-wear-rafting" : `/en/blog/what-to-wear-rafting`} className="group flex flex-col h-full">
                  <div className="card p-0 overflow-hidden h-full flex flex-col bg-white hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 border border-stone-100">
                    <div className="h-52 relative overflow-hidden bg-gradient-to-br from-teal-900 via-emerald-800 to-teal-950 flex items-center justify-center flex-shrink-0">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(20,184,166,0.2),transparent_50%)]" aria-hidden="true" />
                      {getBlogIcon("Gear Guide", "what-to-wear-rafting")}
                      <span className="absolute top-4 left-4 z-10 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-teal-600/90 text-white shadow-md backdrop-blur-sm">
                        Gear Guide
                      </span>
                    </div>
                    <div className="p-6 flex-1 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center gap-4 text-xs text-stone-400 font-medium">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-stone-400" />
                            June 8, 2026
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-stone-400" />
                            4 min read
                          </span>
                        </div>
                        <h2 className="text-xl font-bold text-stone-900 group-hover:text-teal-600 transition-colors duration-200 line-clamp-2 leading-tight">
                          What to Wear for Whitewater Rafting in Japan (Complete Packing List)
                        </h2>
                        <p className="text-sm text-stone-500 line-clamp-3 leading-relaxed">
                          Preparing for a whitewater rafting trip on the Tone River is easier than you think. Learn exactly what gear is provided and what essentials you need to bring.
                        </p>
                      </div>
                      <div className="pt-6 border-t border-stone-100 mt-6 flex items-center justify-between">
                        <span className="inline-flex items-center gap-1 text-sm text-teal-600 font-semibold group-hover:text-teal-700">
                           View recommended gear for Tone River Rafting in Gunma
                          <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>

                {/* Card 4: Best Time to Raft Gunma */}
                <Link href={locale === "ja" ? "/blog/best-time-to-raft-gunma" : `/en/blog/best-time-to-raft-gunma`} className="group flex flex-col h-full">
                  <div className="card p-0 overflow-hidden h-full flex flex-col bg-white hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 border border-stone-100">
                    <div className="h-52 relative overflow-hidden bg-gradient-to-br from-teal-900 via-emerald-800 to-teal-950 flex items-center justify-center flex-shrink-0">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(20,184,166,0.2),transparent_50%)]" aria-hidden="true" />
                      {getBlogIcon("Season Guide", "best-time-to-raft-gunma")}
                      <span className="absolute top-4 left-4 z-10 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-teal-600/90 text-white shadow-md backdrop-blur-sm">
                        Season Guide
                      </span>
                    </div>
                    <div className="p-6 flex-1 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center gap-4 text-xs text-stone-400 font-medium">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-stone-400" />
                            June 8, 2026
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-stone-400" />
                            5 min read
                          </span>
                        </div>
                        <h2 className="text-xl font-bold text-stone-900 group-hover:text-teal-600 transition-colors duration-200 line-clamp-2 leading-tight">
                          When is the Best Time to Visit Gunma for River Rafting?
                        </h2>
                        <p className="text-sm text-stone-500 line-clamp-3 leading-relaxed">
                          Gunma's Tone River offers world-class whitewater rafting, but the experience completely transforms depending on the season. Learn when to visit for extreme rapids or family fun.
                        </p>
                      </div>
                      <div className="pt-6 border-t border-stone-100 mt-6 flex items-center justify-between">
                        <span className="inline-flex items-center gap-1 text-sm text-teal-600 font-semibold group-hover:text-teal-700">
                           Read about the best seasons for Rafting in Gunma
                          <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>

                {/* Card 5: Top Canyoning */}
                <Link href={locale === "ja" ? "/blog/top-5-canyoning-gunma" : `/en/blog/top-5-canyoning-gunma`} className="group flex flex-col h-full">
                  <div className="card p-0 overflow-hidden h-full flex flex-col bg-white hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 border border-stone-100">
                    <div className="h-52 relative overflow-hidden bg-gradient-to-br from-teal-900 via-emerald-800 to-teal-950 flex items-center justify-center flex-shrink-0">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(20,184,166,0.2),transparent_50%)]" aria-hidden="true" />
                      {getBlogIcon("Canyoning", "top-5-canyoning-gunma")}
                      <span className="absolute top-4 left-4 z-10 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-teal-600/90 text-white shadow-md backdrop-blur-sm">
                        Canyoning
                      </span>
                    </div>
                    <div className="p-6 flex-1 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center gap-4 text-xs text-stone-400 font-medium">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-stone-400" />
                            June 8, 2026
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-stone-400" />
                            5 min read
                          </span>
                        </div>
                        <h2 className="text-xl font-bold text-stone-900 group-hover:text-teal-600 transition-colors duration-200 line-clamp-2 leading-tight">
                          Top 5 Reasons Gunma Offers the Best Canyoning Near Tokyo
                        </h2>
                        <p className="text-sm text-stone-500 line-clamp-3 leading-relaxed">
                          If you live in or are visiting Tokyo and want to escape the city heat, canyoning is the ultimate outdoor adventure. Learn why Gunma is the premier destination.
                        </p>
                      </div>
                      <div className="pt-6 border-t border-stone-100 mt-6 flex items-center justify-between">
                        <span className="inline-flex items-center gap-1 text-sm text-teal-600 font-semibold group-hover:text-teal-700">
                          Read about the top canyoning and Rafting near Tokyo
                          <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>

                {/* Card 6: Tone River Guide */}
                <Link href={locale === "ja" ? "/blog/tone-river-guide" : `/en/blog/tone-river-guide`} className="group flex flex-col h-full">
                  <div className="card p-0 overflow-hidden h-full flex flex-col bg-white hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 border border-stone-100">
                    <div className="h-52 relative overflow-hidden bg-gradient-to-br from-teal-900 via-emerald-800 to-teal-950 flex items-center justify-center flex-shrink-0">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(20,184,166,0.2),transparent_50%)]" aria-hidden="true" />
                      {getBlogIcon("River Guide", "tone-river-guide")}
                      <span className="absolute top-4 left-4 z-10 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-teal-600/90 text-white shadow-md backdrop-blur-sm">
                        River Guide
                      </span>
                    </div>
                    <div className="p-6 flex-1 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center gap-4 text-xs text-stone-400 font-medium">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-stone-400" />
                            June 8, 2026
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-stone-400" />
                            4 min read
                          </span>
                        </div>
                        <h2 className="text-xl font-bold text-stone-900 group-hover:text-teal-600 transition-colors duration-200 line-clamp-2 leading-tight">
                          A Beginner's Guide to Exploring the Tone River, Gunma
                        </h2>
                        <p className="text-sm text-stone-500 line-clamp-3 leading-relaxed">
                          The Tone River is not just one of Japan's largest rivers; it is the beating heart of Kanto outdoor adventure. Learn how beginners can explore this stunning river safely.
                        </p>
                      </div>
                      <div className="pt-6 border-t border-stone-100 mt-6 flex items-center justify-between">
                        <span className="inline-flex items-center gap-1 text-sm text-teal-600 font-semibold group-hover:text-teal-700">
                          Read our beginner's guide to Tone River Rafting
                          <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              </>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

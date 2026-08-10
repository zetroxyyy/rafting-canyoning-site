import { getLocale } from "next-intl/server";
import Link from "next/link";
import BlogBookingCTA from "@/components/ui/BlogBookingCTA";

import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, Clock, ChevronRight, Compass, BookOpen, Waves, Shield, Wrench } from "lucide-react";
import type { Metadata } from "next";
import { getBlogPostBySlug, getBlogPosts } from "@/lib/utils/markdown";
import BrandLogo from "@/components/ui/BrandLogo";

interface PageProps {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
}

export async function generateStaticParams() {
  const posts = getBlogPosts();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = getBlogPostBySlug(slug);

  if (!post) {
    return {
      title: "記事が見つかりません | Dream Adventure",
    };
  }

  return {
    title: `${post.title} | ドリームアドベンチャー`,
    description: post.description,
    alternates: {
      canonical: locale === "ja" ? `/blog/${slug}` : `/en/blog/${slug}`,
      languages: {
        ja: `/blog/${slug}`,
        "x-default": `/blog/${slug}`,
      },
    },
    openGraph: {
      title: `${post.title} | ドリームアドベンチャー`,
      description: post.description,
      url: locale === "ja" ? `https://thedreamadventure.com/blog/${slug}` : `https://thedreamadventure.com/en/blog/${slug}`,
      type: "article",
      images: [
        {
          url: post.imageFront,
          width: 800,
          height: 600,
          alt: post.title,
        },
      ],
    },
  };
}


function getBlogIcon(category: string, slug: string) {
  const cat = category.toLowerCase();
  const slg = slug.toLowerCase();
  if (cat.includes("raft") || slg.includes("raft")) return <Waves className="w-10 h-10" />;
  if (cat.includes("canyon") || slg.includes("canyon")) return <Compass className="w-10 h-10" />;
  if (cat.includes("safety") || slg.includes("safety")) return <Shield className="w-10 h-10" />;
  if (cat.includes("gear") || cat.includes("wear") || slg.includes("wear")) return <Wrench className="w-10 h-10" />;
  if (cat.includes("access") || slg.includes("access")) return <Calendar className="w-10 h-10" />;
  return <BookOpen className="w-10 h-10" />;
}

export default async function BlogPostPage({ params }: PageProps) {
  const { locale, slug } = await params;
  const post = getBlogPostBySlug(slug);

  if (!post) {
    notFound();
  }

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
              {post.title}
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

          <div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-teal-100 text-teal-800 border border-teal-200">
              {post.category}
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-stone-900 leading-tight tracking-tight">
            {post.title}
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
              <span>{post.date}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-stone-400" />
              <span>読了目安 {post.readTime}</span>
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
              {getBlogIcon(post.category, post.slug)}
            </span>
            <p className="text-teal-200 text-sm font-semibold tracking-wider uppercase">
              {post.category || "Adventure Guide"}
            </p>
          </div>
        </div>
      </div>

      {/* ─── Article Content ────────────────────────────────────────────── */}
      <div className="container-site max-w-4xl mx-auto pb-20">
        <div
          className="prose prose-teal max-w-3xl mx-auto text-stone-800 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: post.html }}
        />

        {/* ─── Premium CTA Box ────────────────────────────────────────────── */}
        <div
          className="max-w-3xl mx-auto mt-16 rounded-3xl p-8 md:p-12 text-center relative overflow-hidden shadow-2xl border border-teal-100"
          style={{
            background: "linear-gradient(135deg, #0f766e 0%, #0d9488 60%, #14b8a6 100%)",
          }}
        >
          {/* Shimmer Overlay */}
          <div
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{
              backgroundImage: "radial-gradient(circle at 75% 20%, white 0%, transparent 60%)",
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

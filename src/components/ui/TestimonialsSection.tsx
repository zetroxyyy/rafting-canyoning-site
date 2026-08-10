/**
 * TestimonialsSection — Server Component
 *
 * Fetches published testimonials directly from the Prisma `Testimonial`
 * model and renders them in a premium auto-scrolling marquee.
 *
 * Renders:
 *   • Guest name
 *   • Star rating
 *   • Review text (locale-aware: bodyJa when locale=ja, else bodyEn)
 *   • Avatar — uses `avatarUrl` if set, falls back to a teal initial badge
 *   • Country / origin label
 *
 * Falls back to 3 hard-coded defaults only when the DB has zero published reviews.
 */

import { prisma } from "@/lib/prisma";
import { Star } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Review {
  id:            string;
  authorName:    string;
  authorCountry: string | null;
  avatarUrl:     string | null;
  rating:        number;
  bodyEn:        string;
  bodyJa:        string | null;
}

// ─── Hard-coded fallbacks (only shown if DB is empty) ─────────────────────────

const FALLBACK_REVIEWS: Review[] = [
  {
    id:            "fallback-1",
    authorName:    "Sarah M.",
    authorCountry: "Australia",
    avatarUrl:     null,
    rating:        5,
    bodyEn:        "Absolute highlight of our Japan trip. The guides were incredible and safety-first the whole way.",
    bodyJa:        "日本旅行の最高の思い出になりました。ガイドさんたちは素晴らしく、終始安全第一で案内してくれました。",
  },
  {
    id:            "fallback-2",
    authorName:    "田中 健",
    authorCountry: "東京",
    avatarUrl:     null,
    rating:        5,
    bodyEn:        "Joined with my child. The guide's explanation was gentle and we could enjoy safely. We will come again!",
    bodyJa:        "子どもと一緒に参加しました。ガイドさんの対応が丁寧で安心して楽しめました。また来ます！",
  },
  {
    id:            "fallback-3",
    authorName:    "Marco L.",
    authorCountry: "Germany",
    avatarUrl:     null,
    rating:        5,
    bodyEn:        "Professional guides, clean equipment, and stunning natural scenery. Highly recommend!",
    bodyJa:        "プロフェッショナルなガイド、清潔な装備、素晴らしい川の景色。非常にお勧めします！",
  },
];

// ─── Data Fetcher ─────────────────────────────────────────────────────────────

async function fetchReviews(): Promise<Review[]> {
  try {
    const rows = await prisma.testimonial.findMany({
      where: { isPublished: true },
      orderBy: [
        { sortOrder: "asc" },
        { createdAt: "desc" },
      ],
      select: {
        id:            true,
        authorName:    true,
        authorCountry: true,
        avatarUrl:     true,
        rating:        true,
        bodyEn:        true,
        bodyJa:        true,
      },
    });

    if (rows.length === 0) return FALLBACK_REVIEWS;

    return rows;
  } catch (err) {
    console.error("[TestimonialsSection] DB fetch failed:", err);
    return FALLBACK_REVIEWS;
  }
}

// ─── Review Card Sub-component ────────────────────────────────────────────────

function ReviewCard({
  review,
  locale,
}: {
  review: Review;
  locale: string;
}) {
  const isJa       = locale === "ja";
  const reviewText = isJa && review.bodyJa ? review.bodyJa : review.bodyEn;
  const initial    = review.authorName.charAt(0).toUpperCase();

  return (
    <div
      className="card w-[300px] sm:w-[360px] flex-shrink-0 mx-4 p-6 bg-white shadow-sm flex flex-col justify-between hover:-translate-y-1 transition-all duration-300 border border-stone-100"
      aria-label={`Review by ${review.authorName}`}
    >
      {/* Stars */}
      <div>
        <div
          className="flex gap-1 mb-4"
          aria-label={`${review.rating} out of 5 stars`}
        >
          {Array.from({ length: 5 }).map((_, j) => (
            <Star
              key={j}
              className={`w-4 h-4 ${
                j < review.rating
                  ? "fill-amber-400 text-amber-400"
                  : "text-stone-200"
              }`}
            />
          ))}
        </div>

        {/* Review text — clamp to 5 lines */}
        <p className="text-stone-700 text-sm leading-relaxed mb-4 font-medium italic line-clamp-5">
          &ldquo;{reviewText}&rdquo;
        </p>
      </div>

      {/* Author row */}
      <div className="flex items-center gap-3 mt-auto pt-4 border-t border-stone-100">
        {/* Initial badge for premium, clean branding */}
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)" }}
          aria-hidden="true"
        >
          {initial}
        </div>

        <div className="min-w-0">
          <p className="text-sm font-semibold text-stone-900 truncate">
            {review.authorName}
          </p>
          <p className="text-xs text-stone-400 font-medium truncate">
            {review.authorCountry || (isJa ? "ゲスト" : "Guest")}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Marquee CSS (injected once into the page) ────────────────────────────────

const MARQUEE_CSS = `
@keyframes marquee {
  0%   { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
.marquee-track {
  display: flex;
  width: max-content;
  animation: marquee 35s linear infinite;
}
.marquee-track:hover {
  animation-play-state: paused;
}
.marquee-fade {
  position: relative;
}
.marquee-fade::before,
.marquee-fade::after {
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;
  width: 15%;
  z-index: 2;
  pointer-events: none;
}
.marquee-fade::before {
  left: 0;
  background: linear-gradient(to right, #f5f5f4 0%, transparent 100%);
}
.marquee-fade::after {
  right: 0;
  background: linear-gradient(to left, #f5f5f4 0%, transparent 100%);
}
`;

// ─── Main Export ──────────────────────────────────────────────────────────────

interface Props {
  locale: string;
}

export default async function TestimonialsSection({ locale }: Props) {
  const isJa   = locale === "ja";
  const reviews = await fetchReviews();

  return (
    <section
      className="section bg-stone-50 overflow-hidden"
      id="testimonials"
      aria-labelledby="testimonials-heading"
    >
      {/* Marquee animation */}
      <style dangerouslySetInnerHTML={{ __html: MARQUEE_CSS }} />

      {/* Section header */}
      <div className="container-site">
        <div className="text-center mb-12">
          <span className="section-label">
            {isJa ? "お客様の声" : "Reviews"}
          </span>
          <h2
            id="testimonials-heading"
            className="text-3xl font-bold text-stone-900"
          >
            {isJa
              ? "体験者の口コミ・ご参加いただいた方の声"
              : "Guest Testimonials & Adventure Reviews"}
          </h2>
        </div>
      </div>

      {/* Auto-scrolling marquee */}
      <div
        className="marquee-fade w-full overflow-hidden py-4"
        aria-label={isJa ? "スクロールするレビューカルーセル" : "Scrolling reviews carousel"}
      >
        <div className="marquee-track">
          {/* Doubled array for seamless infinite loop */}
          {[...reviews, ...reviews].map((review, i) => (
            <ReviewCard
              key={`${review.id}-${i}`}
              review={review}
              locale={locale}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

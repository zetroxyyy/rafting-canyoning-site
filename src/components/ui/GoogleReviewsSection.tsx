/**
 * GoogleReviewsSection — Server Component
 *
 * Fetches live Google Places reviews and renders them in a
 * premium auto-scrolling marquee that exactly matches the
 * rest of the homepage design language.
 *
 * Caching strategy (Next.js 16 / App Router):
 *   - The fetch is tagged `{ next: { revalidate: 86400 } }` (24 h ISR).
 *   - On error or empty results a graceful fallback CTA is shown instead.
 *
 * Env vars required:
 *   GOOGLE_PLACES_API_KEY  — Google Places API key with Places API enabled
 *   GOOGLE_PLACE_ID        — The Place ID of the Dream Adventure listing
 *                            (e.g. ChIJ…)
 */

import { Star, ExternalLink } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface GoogleReview {
  author_name: string;
  profile_photo_url?: string;
  rating: number;
  text: string;
  time: number;
  relative_time_description: string;
}

interface GooglePlaceResult {
  reviews?: GoogleReview[];
  rating?: number;
  user_ratings_total?: number;
}

interface GooglePlacesResponse {
  result?: GooglePlaceResult;
  status: string;
  error_message?: string;
}

interface NormalisedReview {
  id: string;
  authorName: string;
  authorInitial: string;
  rating: number;
  text: string;
  relativeTime: string;
}

// ─── Data Fetcher ─────────────────────────────────────────────────────────────

async function fetchGoogleReviews(): Promise<NormalisedReview[]> {
  const apiKey  = process.env.GOOGLE_PLACES_API_KEY;
  const placeId = process.env.GOOGLE_PLACE_ID;

  if (!apiKey || !placeId) {
    console.warn("[GoogleReviews] GOOGLE_PLACES_API_KEY or GOOGLE_PLACE_ID not configured.");
    return [];
  }

  const url =
    `https://maps.googleapis.com/maps/api/place/details/json` +
    `?place_id=${encodeURIComponent(placeId)}` +
    `&fields=reviews,rating,user_ratings_total` +
    `&language=en` +      // fetch EN copy (multilingual can be done separately)
    `&reviews_sort=newest` +
    `&key=${apiKey}`;

  try {
    const res = await fetch(url, {
      // Next.js 16 ISR — revalidate every 24 hours
      next: { revalidate: 86400, tags: ["google-reviews"] },
    });

    if (!res.ok) {
      console.error(`[GoogleReviews] HTTP ${res.status}`);
      return [];
    }

    const data: GooglePlacesResponse = await res.json();

    if (data.status !== "OK" || !data.result?.reviews) {
      console.warn("[GoogleReviews] API status:", data.status, data.error_message ?? "");
      return [];
    }

    return data.result.reviews
      .filter((r) => r.rating >= 4)           // only 4 ★ and 5 ★ reviews
      .slice(0, 12)                            // cap at 12 for marquee performance
      .map((r, i) => ({
        id:            `gr-${i}`,
        authorName:    r.author_name,
        authorInitial: r.author_name.charAt(0).toUpperCase(),
        rating:        r.rating,
        text:          r.text,
        relativeTime:  r.relative_time_description,
      }));
  } catch (err) {
    console.error("[GoogleReviews] Fetch failed:", err);
    return [];
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ReviewCard({ review }: { review: NormalisedReview }) {
  return (
    <div
      className="card w-[300px] sm:w-[360px] flex-shrink-0 mx-4 p-6 bg-white shadow-sm flex flex-col justify-between hover:-translate-y-1 transition-all duration-300 border border-stone-100"
      aria-label={`Review by ${review.authorName}`}
    >
      {/* Stars */}
      <div>
        <div className="flex gap-1 mb-4" aria-label={`${review.rating} out of 5 stars`}>
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

        {/* Review body — truncate at 220 chars to keep cards uniform */}
        <p className="text-stone-700 text-sm leading-relaxed mb-4 font-medium italic line-clamp-5">
          &ldquo;{review.text.length > 220
            ? review.text.slice(0, 217).trimEnd() + "…"
            : review.text}&rdquo;
        </p>
      </div>

      {/* Author row */}
      <div className="flex items-center gap-3 mt-auto pt-4 border-t border-stone-100">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)" }}
          aria-hidden="true"
        >
          {review.authorInitial}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-stone-900 truncate">{review.authorName}</p>
          <div className="flex items-center gap-1">
            <span className="text-xs text-stone-400">{review.relativeTime}</span>
            <span className="text-xs text-stone-300 mx-0.5">·</span>
            <span className="text-[10px] font-semibold text-teal-600 uppercase tracking-wide">Google</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function FallbackCard({ locale }: { locale: string }) {
  const isJa = locale === "ja";
  return (
    <div className="flex justify-center w-full py-8 px-4">
      <a
        href="https://g.page/r/Cc_9cCoQEpR9EBM/review"
        target="_blank"
        rel="noopener noreferrer"
        className="group card max-w-md w-full p-8 bg-white shadow-sm hover:-translate-y-1 transition-all duration-300 border border-stone-100 text-center"
        aria-label={isJa ? "Googleでレビューを見る" : "Read our Google reviews"}
      >
        {/* Stars row */}
        <div className="flex gap-1 justify-center mb-5">
          {Array.from({ length: 5 }).map((_, j) => (
            <Star key={j} className="w-5 h-5 fill-amber-400 text-amber-400" />
          ))}
        </div>

        <h3 className="text-lg font-bold text-stone-900 mb-2">
          {isJa ? "Googleで口コミを確認する" : "See What Our Guests Are Saying"}
        </h3>
        <p className="text-stone-500 text-sm mb-6 leading-relaxed">
          {isJa
            ? "Googleマップでの実際のゲストの口コミをご覧ください。"
            : "Read authentic reviews from real adventurers on Google Maps."}
        </p>

        <span
          className="inline-flex items-center gap-2 font-bold text-sm px-6 py-3 rounded-xl text-white transition-all group-hover:shadow-lg"
          style={{ background: "linear-gradient(135deg, #0f766e 0%, #0d9488 100%)" }}
        >
          {isJa ? "Googleレビューを読む" : "Read Google Reviews"}
          <ExternalLink className="w-4 h-4" />
        </span>
      </a>
    </div>
  );
}

// ─── Marquee CSS (injected once) ──────────────────────────────────────────────

const MARQUEE_CSS = `
@keyframes marquee {
  0%   { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
.marquee-track {
  display: flex;
  width: max-content;
  animation: marquee 40s linear infinite;
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
  width: 12%;
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

export default async function GoogleReviewsSection({ locale }: Props) {
  const isJa = locale === "ja";
  const reviews = await fetchGoogleReviews();
  const hasReviews = reviews.length > 0;

  return (
    <section
      className="section bg-stone-50 overflow-hidden"
      id="testimonials"
      aria-labelledby="reviews-heading"
    >
      {/* Inject marquee keyframes once */}
      <style dangerouslySetInnerHTML={{ __html: MARQUEE_CSS }} />

      {/* Section header */}
      <div className="container-site">
        <div className="text-center mb-12">
          <span className="section-label">
            {isJa ? "お客様の声" : "Reviews"}
          </span>
          <h2
            id="reviews-heading"
            className="text-3xl font-bold text-stone-900 mb-3"
          >
            {isJa
              ? "体験者の口コミ・ご参加いただいた方の声"
              : "Guest Testimonials & Adventure Reviews"}
          </h2>

          {/* Google attribution badge */}
          {hasReviews && (
            <a
              href="https://g.page/r/Cc_9cCoQEpR9EBM/review"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-2 text-sm text-stone-500 hover:text-teal-600 transition-colors"
              aria-label="View on Google Maps"
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                aria-hidden="true"
                focusable="false"
              >
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span>
                {isJa ? "Googleでレビューを見る" : "View on Google Maps"}
              </span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>

      {/* Reviews content */}
      {hasReviews ? (
        <div
          className="marquee-fade w-full overflow-hidden py-4"
          aria-label={isJa ? "スクロールするレビューカルーセル" : "Scrolling reviews carousel"}
        >
          <div className="marquee-track" aria-hidden="false">
            {/* Duplicate array for seamless infinite scroll */}
            {[...reviews, ...reviews].map((review, i) => (
              <ReviewCard key={`${review.id}-${i}`} review={review} />
            ))}
          </div>
        </div>
      ) : (
        <FallbackCard locale={locale} />
      )}
    </section>
  );
}

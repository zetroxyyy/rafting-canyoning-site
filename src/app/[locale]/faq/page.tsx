/**
 * FAQ page — Server Component wrapper
 *
 * Renders two layers:
 * 1. Static AEO FAQ section — full Q&A text is in the raw HTML for AI crawlers
 *    (Google AI Overviews, ChatGPT, Perplexity, Gemini). Uses getTranslations()
 *    so it is server-rendered. No client JS required.
 * 2. FaqInteractive — the existing "use client" accordion component that
 *    provides the interactive tab UX for human visitors.
 */
import { getTranslations, getLocale } from "next-intl/server";
import type { Metadata } from "next";
import FaqInteractive from "./_FaqInteractive";

type FaqItem = { q: string; a: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isJa = locale === "ja";
  return {
    title: isJa
      ? "よくある質問 | ドリームアドベンチャー群馬"
      : "FAQ | Dream Adventure Gunma",
    description: isJa
      ? "群馬のラフティング・キャニオニングに関するよくある質問。料金、年齢制限、持ち物、アクセスなどをご案内します。"
      : "Frequently asked questions about rafting and canyoning with Dream Adventure in Gunma, Japan. Prices, age limits, what to bring, and how to get there.",
    alternates: {
      canonical: locale === "ja" ? "/faq" : "/en/faq",
      languages: {
        en: "/en/faq",
        ja: "/faq",
        "x-default": "/faq",
      },
    },
  };
}

export default async function FaqPage() {
  const locale = await getLocale();
  const tGeo = await getTranslations("geo_faq");

  const items = tGeo.raw("items") as FaqItem[];

  // Build FAQPage JSON-LD from the same verified content
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": items.map((item) => ({
      "@type": "Question",
      "name": item.q,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": item.a,
      },
    })),
  };

  return (
    <>
      {/* ─── AEO Static FAQ ──────────────────────────────────────────────
          All Q&A text is in the server-rendered HTML — AI crawlers can
          extract it directly without executing JavaScript.
      ────────────────────────────────────────────────────────────────── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <section
        className="bg-stone-50 border-b border-stone-100"
        aria-label={locale === "ja" ? "よくある質問（全項目）" : "All FAQ answers"}
        id="aeo-faq"
      >
        <div className="container-site py-10 max-w-3xl mx-auto">
          <h2 className="text-xl font-bold text-stone-900 mb-6">
            {tGeo("title")}
          </h2>
          <div className="space-y-6">
            {items.map((item, i) => (
              <div key={i} className="card p-5">
                <h3 className="font-semibold text-stone-900 mb-2 text-sm">
                  {item.q}
                </h3>
                <p className="text-stone-700 text-sm leading-relaxed">
                  {item.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Interactive Tab FAQ (client component) ────────────────────── */}
      <FaqInteractive />
    </>
  );
}

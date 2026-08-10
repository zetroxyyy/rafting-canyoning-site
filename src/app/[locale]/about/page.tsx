import { getLocale } from "next-intl/server";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isJa = locale === "ja";
  return {
    title: isJa ? "会社概要・ガイド紹介" : "About Us — Our Story & Team",
    description: isJa
      ? "ドリームアドベンチャーは、群馬県沼田市に新たに誕生した情熱あふれるアウトドアカンパニーです。安全と感動を第一に、群馬の大自然でラフティング・キャニオニング体験をご提供します。"
      : "Dream Adventure is a brand-new, passionate outdoor adventure company in Numata, Gunma. We're here to deliver unforgettable rafting and canyoning experiences on the Tone River.",
    alternates: {
      canonical: locale === "ja" ? "/about" : `/en/about`,
      languages: {
        en: "/en/about",
        ja: "/about",
        "x-default": "/about",
      },
    },
  };
}

export default async function AboutPage() {
  const locale = await getLocale();

  return (
    <div className="section bg-white">
      <div className="container-site max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <span className="section-label">{locale === "en" ? "About Us" : "私たちについて"}</span>
          <h1 className="text-3xl md:text-4xl font-bold text-stone-900 mb-4">
            {locale === "en" ? "About Dream Adventure" : "ドリームアドベンチャーについて"}
          </h1>
          <p className="text-stone-500">
            {locale === "en"
              ? "A fresh, exciting new adventure company born in Numata, Gunma."
              : "群馬県沼田市に新たに誕生した、情熱あふれるアドベンチャーカンパニー。"}
          </p>
        </div>

        <div className="prose-like space-y-6 text-stone-700 leading-relaxed">
          {locale === "en" ? (
            <>
              <p>Dream Adventure is a brand-new, passionate outdoor adventure company born in the heart of Numata, Gunma Prefecture. We may be new, but our love for the Tone River, its wild energy, and the magic of the mountains runs deep.</p>
              <p>Our guides are river enthusiasts who have trained hard in water safety and first aid. They bring genuine local knowledge, enthusiasm, and a commitment to making every guest feel safe and exhilarated.</p>
              <p>Our mission is simple: deliver outstanding outdoor experiences with an unwavering commitment to safety and joy. Whether it's your very first time on a raft or your first canyon descent, we're here to make it unforgettable.</p>
              <p>We keep our groups small, our equipment fresh, and our standards high. That's the Dream Adventure way — and we're just getting started.</p>
            </>
          ) : (
            <>
              <p>ドリームアドベンチャーは、群馬県沼田市に新たに誕生した、情熱あふれるアウトドアカンパニーです。創業したてですが、利根川への感謝、大自然のエネルギー、そして山の魅力への想いは人一倍です。</p>
              <p>私たちのガイドは、水上安全と救急救命の研修を積んだ川好きのプロフェッショナルです。地元への深い知識と熱意を持ち、すべてのお客様に安心感と爽快感をお届けします。</p>
              <p>私たちの使命はシンプルです。安全と感動への揺るぎないこだわりで、最高のアウトドア体験をお届けすること。初めてのラフティングでも、初めてのキャニオニングでも、忘れられない冒険を。</p>
              <p>少人数制・装備の定期点検・高い安全基準。それがドリームアドベンチャーの流儀です。まだ始まったばかり — 一緒に冒険しましょう！</p>
            </>
          )}
        </div>

        {/* Stats grid — honest startup-appropriate metrics */}
        <div className="grid grid-cols-3 gap-6 mt-12">
          {[
            {
              num: locale === "en" ? "New" : "新設立",
              label: locale === "en" ? "Fresh & passionate startup" : "情熱あふれる新会社",
            },
            {
              num: "100%",
              label: locale === "en" ? "Safety focus" : "安全第一",
            },
            {
              num: locale === "en" ? "Small" : "少人数制",
              label: locale === "en" ? "Group sizes for quality" : "こだわりの少人数ツアー",
            },
          ].map((s, i) => (
            <div key={i} className="card p-5 text-center">
              <p className="text-2xl font-bold mb-1" style={{ color: "var(--color-teal-700)" }}>{s.num}</p>
              <p className="text-xs text-stone-500">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

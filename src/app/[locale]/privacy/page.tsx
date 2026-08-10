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
    title: isJa ? "プライバシーポリシー" : "Privacy Policy",
    description: isJa
      ? "ドリームアドベンチャーのプライバシーポリシーです。個人情報の取り扱いについての取り決め。"
      : "Read the privacy policy of Dream Adventure. Learn how we handle and protect your personal information.",
    alternates: {
      canonical: locale === "ja" ? "/privacy" : `/en/privacy`,
      languages: {
        en: "/en/privacy",
        ja: "/privacy",
        "x-default": "/privacy",
      },
    },
  };
}

export default async function PrivacyPage() {
  const locale = await getLocale();
  return (
    <div className="section bg-white">
      <div className="container-site max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-stone-900 mb-8">
          {locale === "en" ? "Privacy Policy" : "プライバシーポリシー"}
        </h1>
        <div className="space-y-6 text-stone-700 text-sm leading-relaxed">
          {locale === "en" ? (
            <>
              <p className="text-stone-500">Last updated: 2026</p>
              <p>Dream Adventure collects personal information (name, email, phone) solely for the purpose of managing your booking and communicating with you about your activity.</p>
              <p>We do not sell or share your data with third parties, except as required by Japanese law.</p>
              <p>You may request deletion of your personal data at any time by contacting us at <a href="mailto:contact@thedreamadventure.com" className="underline text-teal-600">contact@thedreamadventure.com</a>.</p>
            </>
          ) : (
            <>
              <p className="text-stone-500">最終更新：2026年</p>
              <p>ドリームアドベンチャーは、ご予約の管理およびアクティビティに関するご連絡のみを目的として、個人情報（氏名、メールアドレス、電話番号）を収集します。</p>
              <p>日本の法令が要求する場合を除き、お客様の情報を第三者に販売・提供することはありません。</p>
              <p>個人情報の削除をご希望の場合は、<a href="mailto:contact@thedreamadventure.com" className="underline text-teal-600">contact@thedreamadventure.com</a>までお問い合わせください。</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

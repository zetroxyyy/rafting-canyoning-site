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
    title: isJa ? "利用規約" : "Terms & Conditions",
    description: isJa
      ? "ドリームアドベンチャーの利用規約です。ご予約方法、キャンセルポリシー、安全管理についてのご案内。"
      : "Read the terms and conditions for booking outdoor adventure trips with Dream Adventure in Gunma, Japan.",
    alternates: {
      canonical: locale === "ja" ? "/terms" : `/en/terms`,
      languages: {
        en: "/en/terms",
        ja: "/terms",
        "x-default": "/terms",
      },
    },
  };
}

export default async function TermsPage() {
  const locale = await getLocale();

  return (
    <div className="section bg-white">
      <div className="container-site max-w-3xl mx-auto prose-like">
        <h1 className="text-3xl font-bold text-stone-900 mb-8">
          {locale === "en" ? "Terms & Conditions" : "利用規約"}
        </h1>
        <div className="space-y-6 text-stone-700 leading-relaxed text-sm">
          {locale === "en" ? (
            <>
              <p className="text-stone-500">Last updated: 2026</p>
              <h2 className="text-lg font-bold text-stone-900">1. Booking & Payment</h2>
              <p>All bookings are confirmed via phone calls from our team. Prices are shown in Japanese Yen (JPY) and are tax-inclusive.</p>
              <h2 className="text-lg font-bold text-stone-900">2. Cancellation Policy</h2>
              <p>Cancellations made 2 days before the activity: full refund. On the day of the activity: no refund.</p>
              <h2 className="text-lg font-bold text-stone-900">3. Weather Policy</h2>
              <p>Dream Adventure reserves the right to cancel or modify activities due to unsafe weather or water conditions. In such cases, guests may choose a full refund or free rescheduling.</p>
              <h2 className="text-lg font-bold text-stone-900">4. Participant Responsibility</h2>
              <p>All participants must be in good health and disclose any relevant medical conditions before participating. Participants must follow all guide instructions at all times.</p>
              <h2 className="text-lg font-bold text-stone-900">5. Liability</h2>
              <p>Dream Adventure accepts no liability for accidents or injuries caused by participant negligence or failure to follow safety instructions.</p>
            </>
          ) : (
            <>
              <p className="text-stone-500">最終更新：2026年</p>
              <h2 className="text-lg font-bold text-stone-900">1. ご予約・お支払い</h2>
              <p>すべての予約は、当チームからの電話連絡をもって確定となります。料金は日本円（JPY）表示で、税込価格です。</p>
              <h2 className="text-lg font-bold text-stone-900">2. キャンセルポリシー</h2>
              <p>アクティビティ2日前までのキャンセル：全額返金。当日：返金なし。</p>
              <h2 className="text-lg font-bold text-stone-900">3. 天候に関するポリシー</h2>
              <p>天候や水位が危険と判断される場合、弊社はアクティビティのキャンセルまたは変更を行う権利を有します。その場合、全額返金または無料の日程変更をお選びいただけます。</p>
              <h2 className="text-lg font-bold text-stone-900">4. 参加者の責任</h2>
              <p>全参加者は健康状態に問題がないことを確認し、関連する持病がある場合は参加前に申告してください。ガイドの指示には常に従ってください。</p>
              <h2 className="text-lg font-bold text-stone-900">5. 免責事項</h2>
              <p>参加者の過失や安全指示の不遵守による事故・怪我について、弊社は責任を負いかねます。</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

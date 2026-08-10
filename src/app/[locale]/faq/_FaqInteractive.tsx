"use client";

import { useTranslations, useLocale } from "next-intl";
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/cn";

const FAQ_DATA = {
  booking: {
    en: [
      {
        q: "How do I book?",
        a: "Use our online booking wizard — select your activity, date, time, and complete your details. We operate a 'Call to Confirm' model: once you submit your request, our team will call you to confirm the schedule. No payment is required online.",
      },
      {
        q: "Can I book by phone?",
        a: "Yes, phone booking is available and welcome. You can also submit an online request and we will call you back to finalize everything.",
      },
      {
        q: "How far in advance should I book?",
        a: "We recommend booking at least 2–3 days in advance, especially during peak summer season (July–August).",
      },
    ],
    ja: [
      {
        q: "予約方法を教えてください",
        a: "オンライン予約フォームからアクティビティ・日程・時間を選んで送信するだけです。「お電話で確認」モデルを採用しており、リクエスト送信後にスタッフがお電話にてスケジュールを確定します。オンラインでの決済やカード入力は不要です。",
      },
      {
        q: "電話で予約できますか？",
        a: "はい、もちろんお電話での予約も承っております。オンラインでリクエストを送信いただければ、こちらからお電話してご確認する形でも対応可能です。",
      },
      {
        q: "どれくらい前に予約すればよいですか？",
        a: "繁忙期（7〜8月）は特に2〜3日前以上のご予約をおすすめします。",
      },
    ],
  },
  payment: {
    en: [
      {
        q: "Is payment required online?",
        a: "No. We do not process payments online. Our model is 'Call to Confirm / Pay on Arrival'. You submit your booking request, we call to confirm, and full payment is collected in cash or card at our base on the day of your activity.",
      },
      {
        q: "When do I pay?",
        a: "Payment is made in full at our base on the day of your activity. We accept cash and major cards on arrival.",
      },
      {
        q: "Is a deposit required?",
        a: "No deposit is required. Simply submit your request online or call us, and we will confirm your spot. Payment is collected on arrival.",
      },
    ],
    ja: [
      {
        q: "オンラインで事前の決済は必要ですか？",
        a: "いいえ。オンラインでの事前決済は行っておりません。「お電話で確認 · 現地払い」モデルを採用しており、予約リクエスト送信後にスタッフがご連絡し、当日ベースにてお支払いをいただきます。",
      },
      {
        q: "お支払いはいつですか？",
        a: "アクティビティ当日にベース施設にてお支払いいただきます。現金および各種カード決済をご利用いただけます。",
      },
      {
        q: "デポジット（前払い）は必要ですか？",
        a: "デポジットは不要です。オンラインでリクエストを送信するかお電話いただければ、スタッフが空き状況を確認の上ご予約を確定します。お支払いは当日現地にて。",
      },
    ],
  },
  safety: {
    en: [
      {
        q: "How safe is rafting?",
        a: "River rafting is a safe activity when proper precautions are taken. All our guides hold water rescue and first-aid certifications. Safety briefings are mandatory before every trip.",
      },
      {
        q: "What if I can't swim?",
        a: "You don't need to be a swimmer to join rafting. All participants wear life jackets. However, a basic comfort level with water is recommended.",
      },
    ],
    ja: [
      {
        q: "ラフティングは安全ですか？",
        a: "適切な安全対策を講じれば安心してお楽しみいただけます。ガイドは全員水上救助・救急の資格を保有し、出発前に必ず安全説明を行います。",
      },
      {
        q: "泳げなくても参加できますか？",
        a: "ラフティングは泳力不要です。全員ライフジャケットを着用します。ただし、水に対してある程度慣れていることが望ましいです。",
      },
    ],
  },
  weather: {
    en: [
      {
        q: "What happens if it rains?",
        a: "Rafting runs in light to moderate rain — you'll get wet anyway! We cancel only in cases of severe weather, lightning, or dangerous water levels.",
      },
      {
        q: "What is your cancellation policy for bad weather?",
        a: "If we cancel due to weather, you will receive a full refund or free rescheduling at your choice. Since payment is made on arrival, no charges are applied for weather cancellations.",
      },
    ],
    ja: [
      {
        q: "雨の日はどうなりますか？",
        a: "小雨〜中程度の雨でも通常通り催行します（どうせ濡れます）。中止するのは荒天・落雷・危険な水位の場合のみです。",
      },
      {
        q: "悪天候でキャンセルになった場合はどうなりますか？",
        a: "弊社都合によるキャンセルの場合、ご希望の日程への無料変更が選べます。お支払いは現地払いのため、天候キャンセルの場合は費用は一切発生しません。",
      },
    ],
  },
  access: {
    en: [
      {
        q: "How do I get to your base?",
        a: "17 minutes by car from Numata Station. Free parking is available at our base if arriving by car via Kan-Etsu Expressway.",
      },
      {
        q: "Is there parking?",
        a: "Yes, free parking is available at our base.",
      },
    ],
    ja: [
      {
        q: "ベースへのアクセスを教えてください",
        a: "沼田駅から車で17分。お車の場合は関越自動車道をご利用いただけます（無料駐車場あり）。",
      },
      {
        q: "駐車場はありますか？",
        a: "はい、ベース施設に無料駐車場をご用意しています。",
      },
    ],
  },
  bbq: {
    en: [
      {
        q: "How does BBQ work?",
        a: "BBQ is a riverside dining option after your activity. You can request it during the booking wizard. It is not included in the activity price — payment is made on arrival at our base.",
      },
      {
        q: "How much is BBQ?",
        a: "BBQ pricing is confirmed when our team calls you. Please ask staff on arrival for current rates.",
      },
    ],
    ja: [
      {
        q: "BBQはどのようなものですか？",
        a: "アクティビティ後に川沿いでBBQをお楽しみいただけます。予約フロー内でリクエストできますが、料金はアクティビティ料金に含まれず、当日現地払いとなります。",
      },
      {
        q: "BBQの料金を教えてください",
        a: "BBQの料金はスタッフがお電話にてご確認の際にご案内します。また当日スタッフにお尋ねください。",
      },
    ],
  },
  cancellation: {
    en: [
      {
        q: "What is your cancellation policy?",
        a: "Since we operate on a Pay on Arrival model, cancellations are straightforward. Please contact us as early as possible. Cancellations 72+ hours before: no charge. Less than 24 hours: a cancellation fee may apply at management discretion.",
      },
      {
        q: "Can I reschedule?",
        a: "Yes, rescheduling is available free of charge with sufficient notice. Contact us by phone or LINE and our team will arrange an alternative date.",
      },
    ],
    ja: [
      {
        q: "キャンセルポリシーを教えてください",
        a: "現地払いモデルのため、キャンセル手続きはシンプルです。なるべくお早めにご連絡ください。72時間以上前：無料。24時間未満：状況によりキャンセル料が発生する場合があります。",
      },
      {
        q: "日程変更はできますか？",
        a: "はい、十分な余裕をもってご連絡いただければ無料で日程変更が可能です。お電話またはLINEにてご連絡ください。",
      },
    ],
  },
  eligibility: {
    en: [
      {
        q: "Who can join river rafting?",
        a: "River rafting is open to ages 6 and up. Children aged 6–17 receive the child rate (¥4,000). Adults are aged 18+. Max 21 participants per departure.",
      },
      {
        q: "Who can join canyoning?",
        a: "Canyoning is open to ages 12 and up. Children aged 12–17 receive the child rate (¥4,000). Participants must be comfortable with heights and water. Max 35 participants per departure.",
      },
    ],
    ja: [
      {
        q: "ラフティングに参加できる年齢は？",
        a: "6歳以上参加可能です。6〜17歳はお子様料金（¥4,000）、18歳以上は大人料金（¥6,000）が適用されます。1便あたり最大21名。",
      },
      {
        q: "キャニオニングに参加できる年齢は？",
        a: "12歳以上参加可能です。12〜17歳はお子様料金（¥4,000）が適用されます。高所や水が苦手でない方が対象です。1便あたり最大35名。",
      },
    ],
  },
};

type Category = keyof typeof FAQ_DATA;

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-stone-100 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left py-4 flex items-start justify-between gap-4 hover:text-teal-700 transition-colors"
        aria-expanded={open}
      >
        <span className="font-medium text-stone-900">{question}</span>
        {open
          ? <ChevronUp className="w-5 h-5 flex-shrink-0 text-teal-600 mt-0.5" />
          : <ChevronDown className="w-5 h-5 flex-shrink-0 text-stone-400 mt-0.5" />}
      </button>
      {open && (
        <p className="pb-4 text-stone-600 text-sm leading-relaxed">{answer}</p>
      )}
    </div>
  );
}

// Category display labels (mirrors the translation file)
const CATEGORY_LABELS: Record<Category, { en: string; ja: string }> = {
  booking:      { en: "Booking",       ja: "ご予約" },
  payment:      { en: "Payment",       ja: "お支払い" },
  safety:       { en: "Safety",        ja: "安全について" },
  weather:      { en: "Weather",       ja: "天候・水位" },
  access:       { en: "Getting Here",  ja: "アクセス" },
  bbq:          { en: "BBQ",           ja: "BBQ" },
  cancellation: { en: "Cancellation",  ja: "キャンセル" },
  eligibility:  { en: "Who Can Join",  ja: "参加条件" },
};

export default function FaqInteractive() {
  const t = useTranslations("faq");
  const locale = useLocale() as "en" | "ja";
  const [activeCategory, setActiveCategory] = useState<Category>("booking");

  const categories = Object.keys(FAQ_DATA) as Category[];

  return (
    <div className="section bg-white">
      <div className="container-site max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <span className="section-label">{locale === "en" ? "Support" : "サポート"}</span>
          <h1 className="text-3xl md:text-4xl font-bold text-stone-900">{t("title")}</h1>
          <p className="text-stone-500 text-sm mt-3">
            {locale === "en"
              ? "We operate a Call to Confirm / Pay on Arrival model — no payment required online."
              : "お電話で確認・現地払いモデルを採用しています。オンラインでの決済やカード入力は不要です。"}
          </p>
        </div>

        {/* Category tabs */}
        <div className="flex flex-wrap gap-2 mb-8 justify-center">
          {categories.map(cat => (
            <button
              key={cat}
              id={`faq-tab-${cat}`}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-all",
                activeCategory === cat
                  ? "text-white"
                  : "text-stone-500 hover:text-teal-600"
              )}
              style={activeCategory === cat ? { background: "var(--color-teal-600)" } : { background: "var(--color-stone-100)" }}
            >
              {CATEGORY_LABELS[cat][locale]}
            </button>
          ))}
        </div>

        {/* FAQ items */}
        <div className="card p-6 md:p-8">
          {FAQ_DATA[activeCategory][locale].map((item, i) => (
            <FaqItem key={i} question={item.q} answer={item.a} />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * GrandOpeningGate
 *
 * A premium, full-page overlay that blocks booking access while the company is
 * in pre-launch mode. Shown in place of the booking engine and across all
 * "Book Now" CTAs when isGrandOpeningSoon is active.
 *
 * Design: Dark-teal glassmorphism card on a teal gradient background with
 * animated sparkle badge and bilingual (JA primary / EN secondary) copy.
 */

"use client";

import { Sparkles, Mail, MessageCircle, ArrowRight } from "lucide-react";
import Link from "next/link";

interface GrandOpeningGateProps {
  locale: string;
  /** If true, renders as a full-page screen. If false, renders inline card. */
  fullPage?: boolean;
}

export default function GrandOpeningGate({
  locale,
  fullPage = true,
}: GrandOpeningGateProps) {
  const isJa = locale === "ja";

  const card = (
    <div
      className="relative max-w-lg w-full mx-auto"
      style={{ fontFamily: "inherit" }}
    >
      {/* Glow ring */}
      <div
        className="absolute -inset-1 rounded-3xl opacity-40 blur-xl"
        style={{
          background:
            "linear-gradient(135deg, #14b8a6 0%, #0d9488 50%, #0f766e 100%)",
        }}
        aria-hidden="true"
      />

      {/* Card */}
      <div
        className="relative rounded-3xl p-8 md:p-10 text-center"
        style={{
          background: "rgba(255,255,255,0.97)",
          boxShadow: "0 25px 60px rgba(13,148,136,0.18)",
        }}
      >
        {/* Animated badge */}
        <div className="flex justify-center mb-6">
          <span
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold animate-pulse"
            style={{
              background: "linear-gradient(135deg, #0d9488, #0f766e)",
              color: "white",
              boxShadow: "0 4px 16px rgba(13,148,136,0.35)",
            }}
          >
            <Sparkles className="w-4 h-4" />
            {isJa ? "COMING SOON" : "COMING SOON"}
          </span>
        </div>

        {/* Japanese headline */}
        <h1 className="text-3xl md:text-4xl font-extrabold mb-2 leading-tight"
          style={{ color: "#0f766e" }}
        >
          近日グランドオープン！
        </h1>

        {/* English sub-headline */}
        <h2 className="text-xl font-bold text-stone-700 mb-5">
          Grand Opening Coming Soon
        </h2>

        {/* Divider */}
        <div
          className="w-12 h-1 rounded-full mx-auto mb-6"
          style={{ background: "linear-gradient(90deg, #14b8a6, #0f766e)" }}
        />

        {/* Body copy */}
        <p className="text-stone-600 leading-relaxed mb-8 text-sm md:text-base">
          {isJa
            ? "群馬県沼田市を拠点に、ドリームアドベンチャーが本格的なラフティング＆キャニオニング体験をお届けします。8月のグランドオープンに向けて、現在準備を進めております。ただいま、お電話・メール・オンラインにて先行予約を受付中です。ご予約後、スタッフより一件ずつ丁寧に内容を確認するお電話をいたします。"
            : "Dream Adventure is bringing world-class white-water rafting and canyoning to Numata, Gunma. We're putting the finishing touches on our base ahead of our August opening — and we're already taking reservations by phone, email, or online. After you submit a request, our team will personally call to confirm every detail before your visit."}</p>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href={isJa ? "/contact" : "/en/contact"}
            className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
            style={{
              background: "linear-gradient(135deg, #0d9488, #0f766e)",
              color: "white",
              boxShadow: "0 4px 14px rgba(13,148,136,0.3)",
            }}
          >
            <Mail className="w-4 h-4" />
            {isJa ? "お問い合わせ" : "Get in Touch"}
            <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="https://lin.ee/example"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-bold border-2 transition-all duration-300 hover:-translate-y-0.5"
            style={{
              borderColor: "#0d9488",
              color: "#0d9488",
              background: "transparent",
            }}
          >
            <MessageCircle className="w-4 h-4" />
            LINE
          </a>
        </div>

        {/* Back to home link */}
        <div className="mt-6">
          <Link
            href={isJa ? "/" : "/en"}
            className="text-xs text-stone-400 hover:text-teal-600 transition-colors"
          >
            {isJa ? "← トップページへ戻る" : "← Back to Home"}
          </Link>
        </div>
      </div>
    </div>
  );

  if (!fullPage) {
    return card;
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-16"
      style={{
        background:
          "linear-gradient(145deg, #ecfdf5 0%, #f0fdfa 40%, #ccfbf1 100%)",
      }}
    >
      {/* Decorative background blobs */}
      <div
        className="fixed top-0 left-0 w-96 h-96 rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ background: "#14b8a6", transform: "translate(-50%, -50%)" }}
        aria-hidden="true"
      />
      <div
        className="fixed bottom-0 right-0 w-96 h-96 rounded-full opacity-15 blur-3xl pointer-events-none"
        style={{ background: "#0f766e", transform: "translate(50%, 50%)" }}
        aria-hidden="true"
      />

      {card}
    </div>
  );
}

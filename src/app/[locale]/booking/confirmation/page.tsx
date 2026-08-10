/**
 * /[locale]/booking/confirmation
 *
 * BUG FIXED: Previously used hardcoded "/en/manage" and "/en" hrefs.
 * On the Japanese locale (/ja/booking/confirmation) both CTA buttons
 * navigated to English pages — a silent locale-routing break.
 * Now uses the dynamic `locale` param for correct locale-prefixed links.
 */
import { CheckCircle2, ArrowRight, Home } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: "noindex, nofollow",
};

interface Props {
  params:       Promise<{ locale: string }>;
  searchParams: Promise<{ ref?: string }>;
}

export default async function ConfirmationPage({ params, searchParams }: Props) {
  const { locale }  = await params;
  const { ref }     = await searchParams;
  const isJa        = locale === "ja";

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-16"
      style={{ background: "linear-gradient(160deg, var(--color-teal-50) 0%, white 60%)" }}
    >
      <div className="w-full max-w-lg">

        {/* Icon */}
        <div className="flex justify-center mb-8">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, var(--color-teal-100) 0%, var(--color-teal-200) 100%)",
              boxShadow: "0 8px 32px rgba(13,148,136,0.22)",
            }}
          >
            <CheckCircle2 className="w-10 h-10" style={{ color: "var(--color-teal-600)" }} />
          </div>
        </div>

        {/* Card */}
        <div className="card p-8 text-center space-y-6" style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.08)" }}>
          <div>
            <h1 className="text-2xl font-bold text-stone-900 mb-2">
              {isJa ? "ご予約が確定しました！" : "Booking Confirmed!"}
            </h1>
            <p className="text-stone-500 text-sm leading-relaxed">
              {isJa
                ? "ご予約内容をメールにてお送りしました。ご確認ください。"
                : "A confirmation email has been sent with your booking details."}
            </p>
          </div>

          {/* Reference code — break-all guard prevents overflow on tiny screens */}
          {ref && (
            <div
              className="rounded-xl p-4"
              style={{
                background: "var(--color-teal-50)",
                border: "1px solid var(--color-border-light)",
              }}
            >
              <p className="text-xs uppercase tracking-widest text-stone-400 mb-1">
                {isJa ? "予約番号" : "Booking Reference"}
              </p>
              {/* BUG FIX: break-all prevents a long reference from overflowing its container */}
              <p
                className="text-2xl font-bold font-mono break-all"
                style={{ color: "var(--color-teal-700)" }}
              >
                {ref}
              </p>
            </div>
          )}

          <p className="text-sm text-stone-400 leading-relaxed">
            {isJa
              ? "予約の確認・変更は「予約管理」ページからいつでも行えます。"
              : "You can view and manage your booking at any time from the portal below."}
          </p>

          {/* CTA buttons — LOCALE-AWARE (bug fix: was hardcoded /en) */}
          <div className="flex flex-col gap-3">
            <Link
              href={locale === "ja" ? "/manage" : `/en/manage`}
              className="btn btn-primary w-full justify-center"
            >
              <ArrowRight className="w-4 h-4" />
              {isJa ? "予約を管理する" : "Manage My Booking"}
            </Link>
            <Link
              href={locale === "ja" ? "/" : "/en"}
              className="btn btn-ghost w-full justify-center"
            >
              <Home className="w-4 h-4" />
              {isJa ? "ホームに戻る" : "Return to Home"}
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}

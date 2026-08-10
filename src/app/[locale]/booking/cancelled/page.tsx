/**
 * /[locale]/booking/cancelled
 *
 * Stripe redirects here when the guest clicks "Back" on the checkout page.
 *
 * IMPORTANT: This page must NOT trigger any database cancellation.
 * The booking hold is still valid for up to 15 minutes.
 * The existing cron job / Stripe webhook handles expiry automatically.
 * We simply inform the guest and provide a path back to the homepage.
 */
import Link from "next/link";
import { AlertCircle, Clock, Mail, ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: "noindex, nofollow",
};

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function BookingCancelledPage({ params }: Props) {
  const { locale } = await params;
  const isJa = locale === "ja";

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-16"
      style={{ background: "linear-gradient(160deg, var(--color-stone-50) 0%, var(--color-teal-50) 100%)" }}>

      <div className="w-full max-w-lg">

        {/* Icon */}
        <div className="flex justify-center mb-8">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #fef9c3 0%, #fde68a 100%)",
              boxShadow: "0 8px 32px rgba(234, 179, 8, 0.18)",
            }}
          >
            <AlertCircle className="w-10 h-10 text-amber-500" />
          </div>
        </div>

        {/* Card */}
        <div
          className="card p-8 text-center space-y-6"
          style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.08)" }}
        >
          <div>
            <h1 className="text-2xl font-bold text-stone-900 mb-2">
              {isJa ? "お支払いが完了していません" : "Payment Incomplete"}
            </h1>
            <p className="text-stone-500 text-sm leading-relaxed">
              {isJa
                ? "ご予約はまだ確定していません。"
                : "Your booking is not yet confirmed."}
            </p>
          </div>

          {/* Hold notice */}
          <div
            className="rounded-xl p-4 flex items-start gap-3 text-sm text-left"
            style={{ background: "#fef9c3", border: "1px solid #fde68a" }}
          >
            <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-amber-800">
              {isJa
                ? "ご安心ください。お席は15分間確保されています。その間にお支払いを完了してください。"
                : "Don't worry — we're holding your slot for 15 minutes. Please complete payment before then to secure your booking."}
            </p>
          </div>

          {/* Email notice */}
          <div
            className="rounded-xl p-4 flex items-start gap-3 text-sm text-left"
            style={{ background: "var(--color-teal-50)", border: "1px solid var(--color-border-light)" }}
          >
            <Mail className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "var(--color-teal-600)" }} />
            <p style={{ color: "var(--color-teal-800)" }}>
              {isJa
                ? "お支払いを再開するには、メールに記載のお支払いリンクをご確認いただくか、もう一度最初からご予約ください。"
                : "To complete your booking, check your email for the payment link, or start a new booking below."}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link
              href={locale === "ja" ? "/" : "/en"}
              className="btn btn-primary flex-1 justify-center"
            >
              <ArrowLeft className="w-4 h-4" />
              {isJa ? "ホームに戻る" : "Return Home"}
            </Link>
            <Link
              href={locale === "ja" ? "/booking" : `/en/booking`}
              className="btn btn-outline flex-1 justify-center"
            >
              {isJa ? "再度予約する" : "Book Again"}
            </Link>
          </div>
        </div>

        {/* Fine-print */}
        <p className="text-center text-xs text-stone-400 mt-6 leading-relaxed">
          {isJa
            ? "15分が経過すると、確保されたお席は自動的に解放されます。"
            : "After 15 minutes, your held slot will be automatically released and returned to the public availability calendar."}
        </p>
      </div>
    </main>
  );
}

/**
 * BlogBookingCTA (Server Component)
 *
 * Reusable server component for blog pages' "Book Now" CTA sections.
 * Automatically shows a "Grand Opening Soon" pill when in pre-launch mode,
 * a maintenance notice when maintenanceMode is on, or the live booking link.
 *
 * Usage:
 *   <BlogBookingCTA locale={locale} label="Book Now" labelJa="今すぐ予約" id="my-cta-id" />
 */

import Link from "next/link";
import { ChevronRight, Sparkles, Wrench } from "lucide-react";
import { getGrandOpeningMode } from "@/lib/maintenance";
import { getSettings } from "@/app/actions/admin/settings";

interface BlogBookingCTAProps {
  locale: string;
  label: string;     // English CTA text
  labelJa: string;   // Japanese CTA text
  id?: string;
  className?: string;
  style?: React.CSSProperties;
}

export default async function BlogBookingCTA({
  locale,
  label,
  labelJa,
  id = "blog-book-cta",
  className = "inline-flex items-center justify-center gap-2 font-bold rounded-xl px-8 py-4 text-base transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0",
  style = { background: "white", color: "var(--color-teal-700)" },
}: BlogBookingCTAProps) {
  const grandOpeningSoon = getGrandOpeningMode();
  const { maintenanceMode } = await getSettings();

  const text = locale === "ja" ? labelJa : label;

  if (grandOpeningSoon) {
    return (
      <span
        id={id}
        className="inline-flex items-center justify-center gap-2 font-bold rounded-xl px-8 py-4 text-base"
        style={{ background: "white", color: "var(--color-teal-700)" }}
      >
        <Sparkles className="w-5 h-5 animate-pulse" />
        {locale === "ja" ? "近日グランドオープン！" : "Grand Opening Soon!"}
      </span>
    );
  }

  if (maintenanceMode) {
    return (
      <span
        id={id}
        className="inline-flex items-center justify-center gap-2 font-bold rounded-xl px-8 py-4 text-base bg-white/20 text-white border border-white/30"
      >
        <Wrench className="w-5 h-5" />
        {locale === "ja" ? "予約一時停止中" : "Booking Temporarily Unavailable"}
      </span>
    );
  }

  return (
    <Link
      href={locale === "ja" ? "/booking" : "/en/booking"}
      id={id}
      className={className}
      style={style}
    >
      {text}
      <ChevronRight className="w-5 h-5" />
    </Link>
  );
}

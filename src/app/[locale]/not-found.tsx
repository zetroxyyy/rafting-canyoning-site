import Link from "next/link";
import { useLocale } from "next-intl";
import BrandLogo from "@/components/ui/BrandLogo";

// Next.js App Router locale-aware not-found.
// This is a server component; useLocale is available via next-intl/server in layouts
// but not directly here. We read the locale from the URL path segment instead.

export default function LocaleNotFound() {
  // In a [locale] segment, the locale is available as a URL param; however
  // not-found.tsx receives no params. We default to English and let JS handle it.
  return (
    <div
      className="min-h-[80vh] flex items-center justify-center px-4"
      style={{ background: "var(--color-teal-50)" }}
    >
      <div className="text-center max-w-md">
        <p
          className="text-[100px] font-black leading-none mb-2 select-none"
          style={{
            background: "linear-gradient(135deg, var(--color-teal-400), var(--color-teal-700))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          404
        </p>

        <h1 className="text-2xl font-bold text-stone-900 mb-3">
          Page Not Found
        </h1>
        <p className="text-stone-500 text-base mb-8 leading-relaxed">
          The page you&rsquo;re looking for doesn&rsquo;t exist or has been moved.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/" id="locale-not-found-home" className="btn btn-primary">
            Return to Home
          </Link>
          <Link href="/en/booking" id="locale-not-found-booking" className="btn btn-outline">
            Book an Adventure
          </Link>
        </div>

        <p className="mt-8 text-xs text-stone-400">
          Staff?{" "}
          <Link
            href="/admin"
            id="locale-not-found-admin"
            className="underline hover:text-stone-600 transition-colors"
          >
            Admin Dashboard
          </Link>
        </p>
      </div>
    </div>
  );
}

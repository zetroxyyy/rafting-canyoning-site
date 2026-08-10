import Link from "next/link";
import BrandLogo from "@/components/ui/BrandLogo";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page Not Found | Dream Adventure",
  description: "The page you are looking for does not exist.",
};

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--color-teal-50)" }}
    >
      {/* ── Top bar ──────────────────────────────────────────────────── */}
      <header className="h-16 bg-white border-b border-stone-100 flex items-center px-6">
        <Link href="/" aria-label="Dream Adventure Home">
          <BrandLogo height={36} />
        </Link>
      </header>

      {/* ── Main ─────────────────────────────────────────────────────── */}
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          {/* Decorative number */}
          <p
            className="text-[120px] font-black leading-none mb-2 select-none"
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
            Let&rsquo;s get you back on the river.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/"
              id="not-found-home"
              className="btn btn-primary"
            >
              Return to Home
            </Link>
            <Link
              href="/en/booking"
              id="not-found-booking"
              className="btn btn-outline"
            >
              Book an Adventure
            </Link>
          </div>

          <p className="mt-8 text-xs text-stone-400">
            Staff?{" "}
            <Link
              href="/admin"
              id="not-found-admin"
              className="underline hover:text-stone-600 transition-colors"
            >
              Go to Admin Dashboard
            </Link>
          </p>
        </div>
      </main>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="h-12 flex items-center justify-center">
        <p className="text-xs text-stone-400">
          © {new Date().getFullYear()} Dream Adventure · Numata, Gunma, Japan
        </p>
      </footer>
    </div>
  );
}

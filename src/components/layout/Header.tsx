"use client";

import { useTranslations, useLocale } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Menu, X, Globe, ChevronDown, Phone } from "lucide-react";
import { cn } from "@/lib/cn";
import BrandLogo from "@/components/ui/BrandLogo";
import { PHONE_PRIMARY_DISPLAY, PHONE_PRIMARY_TEL_HREF } from "@/lib/constants/business";

const navKeys = [
  { key: "rafting", href: "/rafting" },
  { key: "canyoning", href: "/canyoning" },
  { key: "about", href: "/about" },
  { key: "faq", href: "/faq" },
  { key: "contact", href: "/contact" },
  { key: "access", href: "/access" },
] as const;

interface HeaderProps {
  /** When true, all "Book Now" buttons in the navbar are hidden. */
  maintenanceMode?: boolean;
  /** When true, "Book Now" button in navbar is hidden since we cannot book. */
  isOffSeasonMode?: boolean;
}

export default function Header({
  maintenanceMode = false,
  isOffSeasonMode = false,
}: HeaderProps) {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const showBookNow = !maintenanceMode && !isOffSeasonMode;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setIsOpen(false); }, [pathname]);

  const toggleLocale = () => {
    const next = locale === "en" ? "ja" : "en";
    if (locale === "en") {
      // Switching en→ja: strip /en prefix, target is root
      const withoutLocale = pathname.replace(/^\/en/, "") || "/";
      router.push(withoutLocale);
    } else {
      // Switching ja→en: current path has no prefix (root-domain ja)
      // Add /en prefix
      const withoutLocale = pathname || "/";
      router.push(`/en${withoutLocale}`);
    }
  };

  // lp: 'ja' uses root paths (no /ja prefix), 'en' uses /en prefix
  const localePath = (href: string) => locale === "ja" ? href : `/en${href}`;

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-white/95 backdrop-blur-lg shadow-sm"
          : "bg-white/80 backdrop-blur-sm"
      )}
      style={
        scrolled
          ? { borderBottom: "1px solid rgba(13,148,136,0.10)" }
          : { borderBottom: "1px solid transparent" }
      }
    >
      <div className="container-site">
        {/* h-16 on mobile → h-18 on md+ for a more generous desktop presence */}
        <div className="flex h-16 md:h-[68px] items-center justify-between gap-4">

          {/* ── Logo ───────────────────────────────────────────────────── */}
          <Link
            href={localePath("/")}
            className="flex items-center group flex-shrink-0 overflow-hidden"
            id="header-logo"
            aria-label="Dream Adventure — Home"
          >
            <BrandLogo
              size="lg"
              showName={true}
              nameClass="text-base font-bold tracking-tight group-hover:text-teal-700 transition-colors duration-200 hidden sm:inline"
              alt={locale === "ja" ? "群馬でラフティング・キャニオニングならドリームアドベンチャーのロゴ" : "Dream Adventure Gunma Rafting & Canyoning Logo"}
            />
          </Link>

          {/* ── Desktop nav ─────────────────────────────────────────────── */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
            {navKeys.map(({ key, href }) => {
              const isActive = pathname.startsWith(localePath(href));
              return (
                <Link
                  key={key}
                  href={localePath(href)}
                  id={`nav-${key}`}
                  className={cn(
                    "relative px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200",
                    isActive
                      ? "text-teal-700 bg-teal-50"
                      : "text-stone-600 hover:text-teal-700 hover:bg-teal-50/60"
                  )}
                >
                  {t(key)}
                  {/* Active underline dot */}
                  {isActive && (
                    <span
                      className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                      style={{ background: "var(--color-teal-600)" }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* ── Right actions ───────────────────────────────────────────── */}
          <div className="flex items-center gap-2">
            {/* Language toggle */}
            <button
              id="lang-toggle"
              onClick={toggleLocale}
              className="hidden md:flex items-center gap-1.5 text-sm font-medium text-stone-500
                         hover:text-teal-700 hover:bg-teal-50 px-2.5 py-1.5 rounded-lg
                         transition-all duration-200"
              aria-label={locale === "en" ? "Switch to Japanese" : "Switch to English"}
            >
              <Globe className="w-3.5 h-3.5" />
              {locale === "en" ? "日本語" : "English"}
            </button>

            {/* Phone CTA — visible at all breakpoints; number text hidden on xs */}
            <a
              href={PHONE_PRIMARY_TEL_HREF}
              id="header-call-cta"
              aria-label={locale === "en" ? "Call Dream Adventure now" : "ドリームアドベンチャーに電話する"}
              className="btn btn-outline btn-sm inline-flex items-center gap-1.5
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
            >
              <span className="relative flex h-2 w-2" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full rounded-full bg-teal-400 animate-pulse" />
              </span>
              <Phone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{PHONE_PRIMARY_DISPLAY}</span>
            </a>

            {/* Book Now CTA */}
            {showBookNow && (
              <Link
                href={localePath("/booking")}
                id="nav-book"
                className="btn btn-primary btn-sm hidden md:inline-flex
                           hover:-translate-y-0.5 hover:shadow-md hover:shadow-teal-500/25
                           transition-all duration-200"
              >
                {t("booking")}
              </Link>
            )}

            {/* Hamburger */}
            <button
              id="mobile-menu-toggle"
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden p-2 rounded-lg text-stone-600 hover:bg-stone-100
                         hover:text-stone-900 transition-colors duration-200"
              aria-label="Toggle menu"
              aria-expanded={isOpen}
            >
              {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile menu ─────────────────────────────────────────────────── */}
      {isOpen && (
        <div
          id="mobile-nav"
          className="md:hidden bg-white"
          style={{ borderTop: "1px solid rgba(13,148,136,0.08)" }}
        >
          <nav className="container-site py-3 flex flex-col gap-0.5">
            {navKeys.map(({ key, href }) => {
              const isActive = pathname.startsWith(localePath(href));
              return (
                <Link
                  key={key}
                  href={localePath(href)}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "py-3 px-4 rounded-xl text-sm font-medium transition-colors duration-150",
                    isActive
                      ? "bg-teal-50 text-teal-700 font-semibold"
                      : "text-stone-600 hover:bg-stone-50 hover:text-stone-900"
                  )}
                >
                  {t(key)}
                </Link>
              );
            })}

            {/* Bottom row: Book Now + Lang */}
            <div className="pt-3 mt-1 flex items-center gap-2"
              style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
              {showBookNow ? (
                <Link
                  href={localePath("/booking")}
                  onClick={() => setIsOpen(false)}
                  className="btn btn-primary btn-sm flex-1 justify-center"
                >
                  {t("booking")}
                </Link>
              ) : (
                <div className="flex-1" />
              )}
              <button
                onClick={() => { toggleLocale(); setIsOpen(false); }}
                className="flex items-center gap-1.5 text-sm text-stone-500
                           hover:text-teal-700 transition-colors px-3 py-2
                           rounded-lg hover:bg-teal-50 flex-shrink-0"
              >
                <Globe className="w-4 h-4" />
                {locale === "en" ? "日本語" : "English"}
              </button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

"use client";

import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import BrandLogo from "@/components/ui/BrandLogo";
import { Phone } from "lucide-react";
import {
  MAP_SHORT_LINK,
  PHONE_PRIMARY_DISPLAY,
  PHONE_PRIMARY_TEL_HREF,
  PHONE_SUPPORT_DISPLAY,
  PHONE_SUPPORT_TEL_HREF,
} from "@/lib/constants/business";

const LEGAL_LINKS = ["terms", "privacy", "contact"] as const;

export default function Footer() {
  const t = useTranslations("footer");
  const tNav = useTranslations("nav");
  const locale = useLocale();
  // Root-domain Japanese: switch to /en or back to / (root)
  const switchHref = locale === "en" ? "/" : "/en";
  const localePath = (href: string) => locale === "ja" ? href : `/en${href}`;

  return (
    <footer
      className="border-t bg-white"
      style={{ borderColor: "rgba(13,148,136,0.09)" }}
    >
      {/* Main grid */}
      <div className="container-site py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10 md:gap-12">

          {/* ── Brand ──────────────────────────────────────────────────── */}
          <div className="sm:col-span-2 md:col-span-1">
            <div className="mb-4">
              <BrandLogo
                size="md"
                showName={true}
                nameClass="text-base font-bold"
                alt={locale === "ja" ? "群馬でラフティング・キャニオニングならドリームアドベンチャーのロゴ" : "Dream Adventure Gunma Rafting & Canyoning Logo"}
              />
            </div>
            <p className="text-sm text-stone-500 leading-relaxed mb-1.5">
              {t("tagline")}
            </p>
            {/* Primary phone CTA */}
            <a
              href={PHONE_PRIMARY_TEL_HREF}
              id="footer-call-cta"
              className="btn btn-primary btn-sm inline-flex items-center gap-1.5 mb-2
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
            >
              <Phone className="w-3.5 h-3.5" />
              {PHONE_PRIMARY_DISPLAY}
            </a>
            <p className="text-xs text-stone-500 mb-1.5">
              <a
                href={PHONE_SUPPORT_TEL_HREF}
                className="hover:text-teal-600 hover:underline transition-colors duration-200"
              >
                {locale === "en" ? `Support: ${PHONE_SUPPORT_DISPLAY}` : `サポート: ${PHONE_SUPPORT_DISPLAY}`}
              </a>
            </p>
            <p className="text-sm text-stone-400">
              <a
                href={MAP_SHORT_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-teal-600 hover:underline transition-colors duration-200"
              >
                {t("location")}
              </a>
            </p>
          </div>

          {/* ── Navigation ─────────────────────────────────────────────── */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-4">
              {locale === "en" ? "Navigation" : "ナビゲーション"}
            </h3>
            <nav className="flex flex-col gap-2.5">
              {(["rafting", "canyoning", "about", "faq", "contact", "access"] as const).map(
                (key) => (
                  <Link
                    key={key}
                    href={localePath(`/${key}`)}
                    className="text-sm text-stone-500 hover:text-teal-600
                               transition-colors duration-200 w-fit
                               hover:translate-x-0.5 transform inline-block"
                  >
                    {tNav(key)}
                  </Link>
                )
              )}
            </nav>
          </div>

          {/* ── Legal + Lang ────────────────────────────────────────────── */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-4">
              {locale === "en" ? "Legal" : "法的情報"}
            </h3>
            <nav className="flex flex-col gap-2.5">
              <Link
                href={localePath("/terms")}
                className="text-sm text-stone-500 hover:text-teal-600 transition-colors duration-200 w-fit"
              >
                {t("links.terms")}
              </Link>
              <Link
                href={localePath("/privacy")}
                className="text-sm text-stone-500 hover:text-teal-600 transition-colors duration-200 w-fit"
              >
                {t("links.privacy")}
              </Link>
              <Link
                href={localePath("/contact")}
                className="text-sm text-stone-500 hover:text-teal-600 transition-colors duration-200 w-fit"
              >
                {t("links.contact")}
              </Link>
            </nav>

            {/* Language switcher */}
            <div
              className="mt-5 pt-5"
              style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}
            >
              <Link
                href={switchHref}
                id="footer-lang-switch"
                className="inline-flex items-center gap-1.5 text-sm font-semibold
                           text-teal-600 hover:text-teal-700 transition-colors duration-200
                           hover:-translate-y-0.5 transform"
              >
                {t("lang_switch")}
              </Link>
            </div>
          </div>

          {/* ── Local Partners ─────────────────────────────────────────── */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-4">
              {locale === "en" ? "Local Partners" : "地域のパートナー"}
            </h3>
            <nav className="flex flex-col gap-2.5">
              <a
                href="https://www.bungyjapan.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-stone-500 hover:text-teal-600 transition-colors duration-200 w-fit"
              >
                {locale === "en" ? "Bungy Japan" : "みなかみバンジー (42m)"}
              </a>
            </nav>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{ borderTop: "1px solid rgba(0,0,0,0.05)" }}>
        <div
          className="container-site py-5 flex flex-col sm:flex-row items-center
                     justify-between gap-2"
        >
          <p className="text-xs text-stone-400">
            © {new Date().getFullYear()} Dream Adventure. All rights reserved.
          </p>
          <p className="text-xs text-stone-400">
            <a
              href={MAP_SHORT_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-teal-600 hover:underline transition-colors duration-200"
            >
              Numata, Gunma, Japan
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}

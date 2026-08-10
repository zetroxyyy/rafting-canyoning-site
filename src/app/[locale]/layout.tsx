import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ScrollToTop from "@/components/ui/ScrollToTop";
import { Poppins } from "next/font/google";
import type { Metadata } from "next";
import { getSettings } from "@/app/actions/admin/settings";
import { Wrench } from "lucide-react";
import LocalBusinessSchema from "@/components/seo/LocalBusinessSchema";
import ConstructionBlockade from "@/components/ConstructionBlockade";

const inter = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-inter",
  display: "swap",
});

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: LocaleLayoutProps): Promise<Metadata> {
  const { locale } = await params;
  const isJa = locale === "ja";
  return {
    metadataBase: new URL("https://thedreamadventure.com"),
    title: {
      template: isJa ? "%s | ドリームアドベンチャー群馬" : "%s | Dream Adventure Gunma",
      default: isJa ? "ドリームアドベンチャー群馬 | 群馬ラフティング＆キャニオニング" : "Dream Adventure Gunma | River Rafting & Canyoning Gunma",
    },
    description: isJa
      ? "群馬県沼田市利根川でラフティング＆キャニオニング体験。ドリームアドベンチャーはプロのガイドが安全にご案内します。"
      : "Experience river rafting and canyoning in Gunma, Japan. High-quality gear, professionally trained guides, and unmatched local knowledge.",
    alternates: {
      canonical: isJa ? "/" : "/en",
      languages: {
        en: "/en",
        ja: "/",
        "x-default": "/",
      },
    },
    openGraph: {
      title: isJa ? "ドリームアドベンチャー群馬 | ラフティング＆キャニオニング" : "Dream Adventure Gunma | River Rafting & Canyoning",
      description: isJa
        ? "群馬県沼田市でのラフティング＆キャニオニング体験。ドリームアドベンチャーはプロのガイドが安全にご案内します。"
        : "Experience river rafting and canyoning in Gunma, Japan.",
      url: isJa
        ? "https://thedreamadventure.com/"
        : "https://thedreamadventure.com/en",
      siteName: "Dream Adventure",
      locale: isJa ? "ja_JP" : "en_US",
      type: "website",
      images: [
        {
          url: "https://thedreamadventure.com/logo.png",
          width: 800,
          height: 600,
          alt: "Dream Adventure Gunma Logo",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: isJa ? "ドリームアドベンチャー群馬 | ラフティング＆キャニオニング" : "Dream Adventure Gunma | River Rafting & Canyoning",
      description: isJa
        ? "群馬県沼田市でのラフティング＆キャニオニング体験。"
        : "Experience river rafting and canyoning in Gunma, Japan.",
      images: ["https://thedreamadventure.com/logo.png"],
    },
    other: {
      "og:locale": locale === "ja" ? "ja_JP" : "en_US",
    },

    // ── Favicon / icon configuration ────────────────────────────────────
    // All assets live in public/favicon/ — referenced here with absolute
    // public paths so Next.js injects them into <head> automatically.
    icons: {
      // Standard browser favicon (32×32 PNG)
      icon: [
        { url: "/favicon/favicon-32x32.png", sizes: "32x32", type: "image/png" },
        { url: "/favicon/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      ],
      // Shortcut fallback for older browsers
      shortcut: "/favicon/favicon-32x32.png",
      // Apple home-screen icon
      apple: [
        { url: "/favicon/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      ],
      // Android / PWA icons
      other: [
        {
          rel: "icon",
          url: "/favicon/android-chrome-192x192.png",
          sizes: "192x192",
          type: "image/png",
        },
        {
          rel: "icon",
          url: "/favicon/android-chrome-512x512.png",
          sizes: "512x512",
          type: "image/png",
        },
      ],
    },

    // Web manifest (PWA / Android Add-to-Home-Screen)
    manifest: "/favicon/site.webmanifest",
  };
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as "en" | "ja")) {
    notFound();
  }

  const [messages, settings] = await Promise.all([
    getMessages(),
    getSettings(),
  ]);
  const maintenanceMode = settings.maintenanceMode;
  const isPromoBannerActive = settings.isPromoBannerActive;
  const promoBannerText = settings.promoBannerText;
  const isOffSeasonMode = settings.isOffSeasonMode;

  return (
    <html lang={locale} className={inter.variable}>
      <head>
        {/*
          Next.js injects all <link> tags derived from the `icons` and
          `manifest` fields in generateMetadata automatically.

          The explicit tags below are kept ONLY as belt-and-suspenders
          fallbacks for browsers that don't read the <meta> injected by
          the App Router (extremely rare, but harmless to include).
        */}
        <link rel="icon" href="/favicon/favicon-32x32.png" sizes="32x32" type="image/png" />
        <link rel="icon" href="/favicon/favicon-16x16.png" sizes="16x16" type="image/png" />
        <link rel="apple-touch-icon" href="/favicon/apple-touch-icon.png" sizes="180x180" />
        <link rel="manifest" href="/favicon/site.webmanifest" />

        {/* Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&family=Noto+Sans+JP:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <LocalBusinessSchema />
      </head>
      <body>
        {/*
          ── Construction Blockade Toggle ────────────────────────────────
          Controlled by the environment variable NEXT_PUBLIC_GRAND_OPENING_SOON.

          • NEXT_PUBLIC_GRAND_OPENING_SOON=true  → show blockade (default / safe)
          • NEXT_PUBLIC_GRAND_OPENING_SOON=false → serve the full live site

          The variable is read at SERVER render time (Next.js App Router).
          It is intentionally fail-safe: if the variable is missing, empty,
          or any value other than the string 'false', the blockade is shown
          so the site can never accidentally go live without explicit opt-in.
          ──────────────────────────────────────────────────────────────── */}
        {process.env.NEXT_PUBLIC_GRAND_OPENING_SOON === "false" ? (
          /* ── LIVE SITE ─────────────────────────────────────────────── */
          <NextIntlClientProvider messages={messages}>
            {/*
              ScrollToTop must be inside NextIntlClientProvider (which is the
              React tree root) so that usePathname() has the correct context.
              It renders nothing — purely a scroll-position reset hook.
            */}
            <ScrollToTop />

            {/* Sleek Teal Announcement Bar */}
            {isPromoBannerActive && promoBannerText && (
              <div
                id="promo-announcement-bar"
                className="w-full bg-teal-600 text-white py-2 text-xs font-semibold text-center tracking-wide"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}
              >
                <span>{promoBannerText}</span>
              </div>
            )}

            {/* ── Maintenance Banner ──────────────────────────────────────
                Shown as a sticky top bar when maintenanceMode is active.
                Sits above the Header so it is always visible.
            */}
            {maintenanceMode && (
              <div
                id="maintenance-banner"
                className="w-full relative z-50"
                style={{
                  background: "linear-gradient(90deg, #92400e, #b45309)",
                  color: "#fef3c7",
                }}
              >
                <div className="container-site flex items-center justify-center gap-3 py-3 text-sm font-medium text-center">
                  <Wrench className="w-4 h-4 flex-shrink-0 opacity-80" aria-hidden="true" />
                  <span>
                    {locale === "ja"
                      ? "現在、予約システムのメンテナンス中です。しばらくしてから再度ご確認ください。"
                      : "We are currently updating our booking system. Please check back shortly."}
                  </span>
                </div>
              </div>
            )}

            <div className="flex min-h-screen flex-col">
              <Header maintenanceMode={maintenanceMode} isOffSeasonMode={isOffSeasonMode} />
              <main className="flex-1">{children}</main>
              <Footer />
            </div>
          </NextIntlClientProvider>
        ) : (
          /* ── CONSTRUCTION BLOCKADE (default / fail-safe) ────────────── */
          <ConstructionBlockade />
        )}
      </body>
    </html>
  );
}

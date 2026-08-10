import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: "4mb" },
  },
  // Keep @react-pdf/renderer + canvas on the server side only
  serverExternalPackages: ["@react-pdf/renderer", "canvas"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async redirects() {
    return [
      // ── Specific dead-link 404s FIRST (take priority over generic /ja redirect)
      // These match before the global /ja/:path* rule below.
      {
        source: "/ja/packages/combo-package-rafting-canyoning/booking",
        destination: "/",
        permanent: true,
      },
      {
        source: "/ja/packages/combo-package-rafting-canyoning",
        destination: "/",
        permanent: true,
      },
      {
        source: "/ja/privacy-policy",
        destination: "/privacy",
        permanent: true,
      },
      {
        source: "/en/packages/combo-package-rafting-canyoning/booking",
        destination: "/en/booking",
        permanent: true,
      },
      {
        source: "/en/packages/combo-package-rafting-canyoning",
        destination: "/en",
        permanent: true,
      },
      {
        source: "/en/privacy-policy",
        destination: "/en/privacy",
        permanent: true,
      },
      // ── Percent-encoded dead-link Japanese package URLs ─────────────────────
      {
        source:
          "/en/packages/%E3%83%88%E3%83%AA%E3%82%B7%E3%83%A5%E3%83%AA%E5%B7%9D%E3%83%A9%E3%83%95%E3%83%86%E3%82%A3%E3%83%B3%E3%82%B0%E3%82%A2%E3%83%89%E3%83%99%E3%83%B3%E3%83%81%E3%83%A3%E3%83%BC",
        destination: "/en",
        permanent: true,
      },
      {
        source:
          "/packages/%E3%83%88%E3%83%AA%E3%82%B7%E3%83%A5%E3%83%AA%E5%B7%9D%E3%83%A9%E3%83%95%E3%83%86%E3%82%A3%E3%83%B3%E3%82%B0%E3%82%A2%E3%83%89%E3%83%99%E3%83%B3%E3%83%81%E3%83%A3%E3%83%BC",
        destination: "/",
        permanent: true,
      },
      // ── Japanese /packages/* → root (catch-all for legacy package URLs) ──────
      {
        source: "/packages/:path*",
        destination: "/",
        permanent: true,
      },
      {
        source: "/privacy-policy",
        destination: "/privacy",
        permanent: true,
      },

      // ── Blog slug renames (Minakami → Gunma 301s) ──────────────────────────
      { source: "/blog/best-time-to-raft-minakami", destination: "/blog/best-time-to-raft-gunma", permanent: true },
      { source: "/en/blog/best-time-to-raft-minakami", destination: "/en/blog/best-time-to-raft-gunma", permanent: true },
      { source: "/blog/minakami-rafting-guide", destination: "/blog/gunma-rafting-guide", permanent: true },
      { source: "/en/blog/minakami-rafting-guide", destination: "/en/blog/gunma-rafting-guide", permanent: true },
      { source: "/blog/top-5-canyoning-minakami", destination: "/blog/top-5-canyoning-gunma", permanent: true },
      { source: "/en/blog/top-5-canyoning-minakami", destination: "/en/blog/top-5-canyoning-gunma", permanent: true },

      // ── Global /ja/* → /* (301 permanent) ──────────────────────────────────
      // Japanese is now at root; /ja prefix is legacy and must redirect.
      // This is LAST so specific overrides above take priority.
      {
        source: "/ja",
        destination: "/",
        permanent: true,
      },
      {
        source: "/ja/:path*",
        destination: "/:path*",
        permanent: true,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
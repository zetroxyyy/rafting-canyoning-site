import type { MetadataRoute } from "next";

/**
 * Dynamic sitemap — src/app/sitemap.ts
 *
 * Architecture (root-domain Japanese):
 *   - Japanese (default locale) uses NO prefix: thedreamadventure.com/rafting
 *   - English uses /en prefix: thedreamadventure.com/en/rafting
 *
 * All URLs in this sitemap resolve without any redirect.
 */

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://thedreamadventure.com";

  // ── Core page paths (relative, WITHOUT leading locale segment) ────────────
  const corePagePaths = [
    "",            // → / (ja root) and /en (en root)
    "/rafting",
    "/canyoning",
    "/booking",
    "/access",
    "/about",
    "/faq",
    "/contact",
    "/privacy",
    "/terms",
    "/blog",
  ];

  // ── All SEO blog posts ───────────────────────────────────────────────────
  const blogPostPaths = [
    "/blog/gunma-rafting-guide",
    "/blog/rafting-vs-canyoning",
    "/blog/what-to-wear-rafting",
    "/blog/best-time-to-raft-gunma",
    "/blog/top-5-canyoning-gunma",
    "/blog/tone-river-guide",
  ];

  // ── Helper: determine priority by path ────────────────────────────────────
  function priorityFor(path: string): number {
    if (path === "") return 1.0;             // Home pages
    if (path === "/rafting") return 0.9;    // Primary money pages
    if (path === "/canyoning") return 0.9;
    if (path === "/booking") return 0.9;
    if (path === "/access") return 0.8;
    if (path === "/about") return 0.8;
    if (path === "/faq") return 0.7;
    if (path === "/contact") return 0.7;
    if (path === "/blog") return 0.7;
    if (blogPostPaths.includes(path)) return 0.6;
    return 0.5;
  }

  // ── Helper: determine changeFrequency by path ─────────────────────────────
  function changeFrequencyFor(
    path: string
  ): MetadataRoute.Sitemap[number]["changeFrequency"] {
    if (path === "") return "daily";
    if (["/rafting", "/canyoning", "/booking"].includes(path)) return "daily";
    if (blogPostPaths.includes(path)) return "monthly";
    return "weekly";
  }

  const allPaths = [...corePagePaths, ...blogPostPaths];

  const entries: MetadataRoute.Sitemap = [];

  for (const path of allPaths) {
    // Japanese (default locale) — NO prefix, root domain
    const jaUrl = path === "" ? baseUrl + "/" : `${baseUrl}${path}`;
    entries.push({
      url: jaUrl,
      lastModified: new Date(),
      changeFrequency: changeFrequencyFor(path),
      priority: priorityFor(path),
    });

    // English — /en prefix
    const enUrl = path === "" ? `${baseUrl}/en` : `${baseUrl}/en${path}`;
    entries.push({
      url: enUrl,
      lastModified: new Date(),
      changeFrequency: changeFrequencyFor(path),
      // Slightly lower priority for English (JA-focused market)
      priority: priorityFor(path) * 0.9,
    });
  }

  return entries;
}

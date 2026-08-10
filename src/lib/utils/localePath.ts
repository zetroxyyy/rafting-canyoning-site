/**
 * Build a locale-prefixed URL path for Next.js App Router with next-intl.
 *
 * Architecture:
 *   - Japanese ('ja') is the default locale and uses NO URL prefix (root domain).
 *     e.g. localePath('ja', '/rafting') → '/rafting'
 *   - English ('en') uses the /en prefix.
 *     e.g. localePath('en', '/rafting') → '/en/rafting'
 *
 * Usage in server components:
 *   const lp = (href: string) => localePath(locale, href);
 *
 * Usage in client components:
 *   const locale = useLocale();
 *   const lp = (href: string) => localePath(locale, href);
 */
export function localePath(locale: string, href: string): string {
  if (locale === "ja") {
    // Root-domain Japanese — no prefix
    return href;
  }
  // All other locales (currently just 'en') get prefixed
  return `/en${href}`;
}

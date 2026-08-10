"use client";

/**
 * ScrollToTop
 *
 * Scrolls the window to the top whenever the Next.js App Router pathname changes.
 * This fixes the common bug where navigating between pages leaves the browser
 * scrolled to an arbitrary position from the previous page.
 *
 * Renders nothing — purely a behaviour hook.
 * Inject once inside <NextIntlClientProvider> in the locale layout.
 */

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    // Use "instant" to avoid a visible scroll animation between pages.
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  return null;
}

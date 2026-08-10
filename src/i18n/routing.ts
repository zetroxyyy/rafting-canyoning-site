import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["ja", "en"],
  defaultLocale: "ja",
  // 'as-needed': default locale (ja) has NO prefix → root domain is Japanese.
  // English is served at /en/* only.
  localePrefix: "as-needed",
  localeDetection: false,
});

import { defineRouting } from "next-intl/routing";

export const locales = ["en", "am", "om", "ti", "so"] as const;
export type Locale = (typeof locales)[number];

export const localeNames: Record<Locale, string> = {
  en: "English",
  am: "አማርኛ",
  om: "Afaan Oromoo",
  ti: "ትግርኛ",
  so: "Soomaali",
};

export const routing = defineRouting({
  locales,
  defaultLocale: "en",
  localePrefix: "as-needed",
  // Without this, the NEXT_LOCALE cookie redirects "/" back to the last
  // non-English locale, making it impossible to switch back to English.
  localeDetection: false,
});

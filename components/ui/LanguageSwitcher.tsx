"use client";

import { useLocale } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { locales, localeNames } from "@/i18n/routing";

export function LanguageSwitcher() {
  const locale = useLocale();
  // next-intl's usePathname returns the path WITHOUT any locale prefix
  const pathname = usePathname();

  function onChange(next: string) {
    // Direct navigation to the target locale URL — fast and identical for
    // every language (all pages are statically generated).
    const path = pathname === "/" ? "" : pathname;
    const target = next === "en" ? path || "/" : `/${next}${path}`;
    window.location.assign(target);
  }

  return (
    <label className="inline-flex items-center">
      <span className="sr-only">Language</span>
      <select
        value={locale}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-control border border-line bg-surface px-2.5 py-1.5 text-sm text-ink-soft outline-none focus:border-primary-500"
      >
        {locales.map((l) => (
          <option key={l} value={l}>
            {localeNames[l]}
          </option>
        ))}
      </select>
    </label>
  );
}

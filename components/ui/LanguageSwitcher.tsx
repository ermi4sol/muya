"use client";

import { useLocale } from "next-intl";
import { useParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { locales, localeNames, type Locale } from "@/i18n/routing";

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();

  function onChange(next: string) {
    router.replace(
      // @ts-expect-error — params are compatible with the current pathname
      { pathname, params },
      { locale: next as Locale }
    );
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

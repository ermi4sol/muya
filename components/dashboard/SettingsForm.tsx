"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { locales, localeNames } from "@/i18n/routing";

export function SettingsForm({ currentLocale }: { currentLocale: string }) {
  const t = useTranslations("dash");
  const pathname = usePathname();
  const [locale, setLocale] = useState(currentLocale);
  const [state, setState] = useState<"idle" | "busy" | "saved">("idle");

  async function change(next: string) {
    setLocale(next);
    setState("busy");
    const res = await fetch("/api/creator/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preferred_locale: next }),
    });
    if (res.ok) {
      // Navigate the dashboard into the chosen language
      const path = pathname === "/" ? "" : pathname;
      window.location.assign(next === "en" ? path || "/" : `/${next}${path}`);
    } else {
      setState("idle");
    }
  }

  return (
    <div className="rounded-card border border-line bg-surface p-5 shadow-card">
      <p className="text-sm font-medium text-ink-soft">{t("language")}</p>
      <select
        value={locale}
        disabled={state === "busy"}
        onChange={(e) => change(e.target.value)}
        className="mt-2 w-full rounded-control border border-line bg-surface px-3.5 py-3 text-ink outline-none focus:border-primary-500"
      >
        {locales.map((l) => (
          <option key={l} value={l}>
            {localeNames[l]}
          </option>
        ))}
      </select>
    </div>
  );
}

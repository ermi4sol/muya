"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { signInWithTelegram } from "@/lib/auth/client";
import type { TelegramAuthPayload } from "@/lib/auth/telegram-verify";

declare global {
  interface Window {
    __muyaOnTelegramAuth?: (user: TelegramAuthPayload) => void;
  }
}

/**
 * Renders the official Telegram Login Widget and completes the Better Auth
 * sign-in when Telegram calls back. The widget only renders on the domain
 * registered with @BotFather (/setdomain), so localhost shows a hint instead.
 */
export function TelegramLoginButton({
  botUsername,
  intent,
  redirectTo,
}: {
  botUsername: string;
  intent: "creator" | "customer";
  redirectTo?: string;
}) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const containerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"widget" | "signing" | "error">("widget");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    window.__muyaOnTelegramAuth = async (user) => {
      setState("signing");
      setError(null);
      const result = await signInWithTelegram(user, intent);
      if (!result.ok) {
        setError(result.error ?? t("errGeneric"));
        setState("error");
        return;
      }
      const prefix = locale === "en" ? "" : `/${locale}`;
      const target =
        redirectTo ??
        (intent === "creator"
          ? result.isNewCreator
            ? `${prefix}/dashboard/onboarding`
            : `${prefix}/dashboard`
          : `${prefix}/account`);
      window.location.assign(target);
    };

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", botUsername);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "12");
    script.setAttribute("data-request-access", "write"); // lets the bot message the person
    script.setAttribute("data-onauth", "window.__muyaOnTelegramAuth(user)");
    container.appendChild(script);

    return () => {
      container.innerHTML = "";
      delete window.__muyaOnTelegramAuth;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [botUsername, intent, redirectTo]);

  return (
    <div className="flex flex-col items-center gap-3">
      {state === "signing" ? (
        <div className="flex items-center gap-2 rounded-control bg-primary-50 px-4 py-3 text-sm font-medium text-primary-700">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
          {t("telegramSigning")}
        </div>
      ) : null}
      {error ? (
        <p className="w-full rounded-control bg-red-50 px-3 py-2 text-center text-sm text-danger">
          {error}
        </p>
      ) : null}
      <div ref={containerRef} className={state === "signing" ? "hidden" : ""} />
      <p className="text-center text-xs text-ink-faint">{t("telegramHint")}</p>
    </div>
  );
}

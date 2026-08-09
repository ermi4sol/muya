"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";

export function MagicLinkForm({
  ownerType,
  variant,
  initialError,
}: {
  ownerType: "creator" | "customer";
  variant: "signup" | "signin" | "restore";
  initialError?: string;
}) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(
    initialError === "invalid_or_expired"
      ? t("errInvalid")
      : initialError === "account_suspended"
        ? t("errSuspended")
        : null
  );
  const [cooldown, setCooldown] = useState(false);

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!email || state === "sending" || cooldown) return;
    setState("sending");
    setError(null);
    try {
      const res = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, ownerType, locale }),
      });
      if (res.ok) {
        setState("sent");
        setCooldown(true);
        setTimeout(() => setCooldown(false), 30_000);
      } else {
        const body = await res.json().catch(() => ({}));
        setError(body.error === "rate_limited" ? t("errRate") : t("errGeneric"));
        setState("idle");
      }
    } catch {
      setError(t("errGeneric"));
      setState("idle");
    }
  }

  if (state === "sent") {
    return (
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-50 text-2xl">
          ✉️
        </div>
        <h1 className="mt-4 text-2xl font-bold text-ink">
          {t("checkEmailTitle")}
        </h1>
        <p className="mt-2 text-ink-soft">
          {t("checkEmailBody")} <strong className="text-ink">{email}</strong>
        </p>
        <button
          onClick={() => submit()}
          disabled={cooldown}
          className="mt-6 text-sm font-medium text-primary-700 disabled:text-ink-faint"
        >
          {t("resend")}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit}>
      <h1 className="text-2xl font-bold text-ink">
        {variant === "signup"
          ? t("signupTitle")
          : variant === "signin"
            ? t("signinTitle")
            : t("restoreTitle")}
      </h1>
      {variant === "restore" && (
        <p className="mt-2 text-sm text-ink-soft">{t("restoreBody")}</p>
      )}
      {error && (
        <p className="mt-3 rounded-control bg-red-50 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
      <label className="mt-5 block text-sm font-medium text-ink-soft">
        {t("emailLabel")}
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1.5 w-full rounded-control border border-line bg-surface px-3.5 py-3 text-base text-ink outline-none focus:border-primary-500"
          placeholder="you@example.com"
        />
      </label>
      <button
        type="submit"
        disabled={state === "sending"}
        className="mt-4 w-full rounded-control bg-primary-600 py-3.5 font-semibold text-white shadow-card transition hover:bg-primary-700 disabled:opacity-60"
      >
        {state === "sending" ? "…" : t("continue")}
      </button>
      <p className="mt-3 text-center text-sm text-ink-faint">
        {t("noPassword")}
      </p>
    </form>
  );
}

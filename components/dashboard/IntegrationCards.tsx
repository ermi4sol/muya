"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

export function IntegrationCards({
  googleConnected,
  googleEmail,
}: {
  googleConnected: boolean;
  googleEmail: string | null;
}) {
  const t = useTranslations("dash");
  const router = useRouter();
  const params = useSearchParams();
  const [busy, setBusy] = useState(false);
  const flash = params.get("google");

  async function disconnect() {
    setBusy(true);
    await fetch("/api/integrations/google/disconnect", { method: "POST" });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="rounded-card border border-line bg-surface p-5 shadow-card">
      <p className="text-sm font-medium text-ink-soft">{t("integrations")}</p>
      {flash === "connected" && (
        <p className="mt-2 rounded-control bg-green-50 px-3 py-2 text-sm text-success">
          ✓ Google Calendar {t("connected")}
        </p>
      )}
      {flash === "error" && (
        <p className="mt-2 rounded-control bg-red-50 px-3 py-2 text-sm text-danger">
          {t("errGeneric")}
        </p>
      )}
      <div className="mt-2 space-y-2">
        <div className="flex items-center justify-between rounded-control border border-line px-3.5 py-3">
          <div>
            <p className="text-sm font-medium text-ink">🗓️ Google Calendar</p>
            <p className="text-xs text-ink-faint">
              {googleConnected
                ? `${t("connected")}${googleEmail ? ` · ${googleEmail}` : ""}`
                : t("gcalWhy")}
            </p>
          </div>
          {googleConnected ? (
            <button
              onClick={disconnect}
              disabled={busy}
              className="rounded-control border border-line px-3 py-1.5 text-xs font-semibold text-ink-soft hover:text-danger"
            >
              {t("disconnect")}
            </button>
          ) : (
            <a
              href="/api/integrations/google/start"
              className="rounded-control bg-primary-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-primary-700"
            >
              {t("connect")}
            </a>
          )}
        </div>
        <div className="flex items-center justify-between rounded-control border border-line px-3.5 py-3">
          <div>
            <p className="text-sm font-medium text-ink">🎥 Zoom</p>
            <p className="text-xs text-ink-faint">{t("zoomPlatform")}</p>
          </div>
          <span className="text-xs font-semibold text-success">✓</span>
        </div>
      </div>
    </div>
  );
}

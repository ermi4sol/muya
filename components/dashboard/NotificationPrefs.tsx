"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

const PREFS = ["sales", "orders", "payouts"] as const;

/** Settings → Telegram notifications: which bot alerts the creator receives. */
export function NotificationPrefs({
  initial,
}: {
  initial: Record<string, boolean>;
}) {
  const t = useTranslations("dash");
  const [prefs, setPrefs] = useState<Record<string, boolean>>({
    sales: initial.sales !== false,
    orders: initial.orders !== false,
    payouts: initial.payouts !== false,
  });
  const [state, setState] = useState<"idle" | "busy">("idle");

  async function toggle(key: (typeof PREFS)[number]) {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    setState("busy");
    await fetch("/api/creator/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notification_prefs: next }),
    }).catch(() => {});
    setState("idle");
  }

  return (
    <div className="space-y-2.5">
      {PREFS.map((key) => (
        <label
          key={key}
          className="flex items-center justify-between rounded-control border border-line px-3.5 py-3"
        >
          <span className="text-sm font-medium text-ink">
            {t(`notif_${key}`)}
          </span>
          <input
            type="checkbox"
            checked={prefs[key]}
            disabled={state === "busy"}
            onChange={() => toggle(key)}
            className="h-4 w-4"
          />
        </label>
      ))}
      <p className="text-xs text-ink-faint">{t("notifNote")}</p>
    </div>
  );
}

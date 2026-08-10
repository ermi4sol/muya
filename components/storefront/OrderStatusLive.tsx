"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

export function OrderStatusLive({
  orderId,
  initialStatus,
  initialReason,
}: {
  orderId: string;
  initialStatus: string;
  initialReason: string | null;
}) {
  const t = useTranslations("shop");
  const [status, setStatus] = useState(initialStatus);
  const [reason, setReason] = useState<string | null>(initialReason);

  useEffect(() => {
    if (status !== "pending") return;
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}/status`);
        if (res.ok) {
          const body = await res.json();
          if (body.status && body.status !== "pending") {
            setStatus(body.status);
            setReason(body.reason ?? null);
            // Reload so the server page can render the access button
            setTimeout(() => window.location.reload(), 1200);
          }
        }
      } catch {
        /* keep polling */
      }
    }, 8000);
    return () => clearInterval(timer);
  }, [status, orderId]);

  if (status === "paid") {
    return (
      <div>
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-50 text-3xl">✅</div>
        <h1 className="mt-3 font-heading text-2xl font-bold text-ink">{t("approvedTitle")}</h1>
        <p className="mt-2 text-sm text-ink-soft">{t("approvedBody")}</p>
      </div>
    );
  }
  if (status === "rejected" || status === "failed") {
    return (
      <div>
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-3xl">😔</div>
        <h1 className="mt-3 font-heading text-2xl font-bold text-ink">{t("rejectedTitle")}</h1>
        <p className="mt-2 text-sm text-ink-soft">{reason || t("rejectedBody")}</p>
      </div>
    );
  }
  return (
    <div>
      <div className="mx-auto flex h-16 w-16 animate-pulse items-center justify-center rounded-full bg-accent-100 text-3xl">⏳</div>
      <h1 className="mt-3 font-heading text-2xl font-bold text-ink">{t("pendingTitle")}</h1>
      <p className="mt-2 text-sm text-ink-soft">{t("pendingBody")}</p>
    </div>
  );
}

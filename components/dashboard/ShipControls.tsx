"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export function ShipControls({
  orderId,
  status,
  tracking,
  destination,
  cod,
}: {
  orderId: string;
  status: string;
  tracking: string | null;
  destination: string;
  cod: boolean;
}) {
  const t = useTranslations("dash");
  const router = useRouter();
  const [trackingInput, setTrackingInput] = useState("");
  const [busy, setBusy] = useState(false);

  async function update(next: "shipped" | "delivered") {
    setBusy(true);
    await fetch(`/api/creator/orders/${orderId}/ship`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: next,
        tracking: trackingInput || undefined,
      }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="mt-3 rounded-control bg-bg p-3">
      <p className="text-xs text-ink-soft">
        📦 {destination}
        {cod && <span className="ml-2 font-bold text-warning">💵 COD</span>}
        {tracking && <span className="ml-2 text-ink-faint">#{tracking}</span>}
      </p>
      {status === "pending" && (
        <div className="mt-2 flex flex-wrap gap-2">
          <input
            placeholder={t("trackingPlaceholder")}
            value={trackingInput}
            maxLength={80}
            onChange={(e) => setTrackingInput(e.target.value)}
            className="min-w-0 flex-1 rounded-control border border-line px-3 py-2 text-sm outline-none focus:border-primary-500"
          />
          <button
            onClick={() => update("shipped")}
            disabled={busy}
            className="rounded-control bg-primary-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {t("markShipped")}
          </button>
        </div>
      )}
      {status === "shipped" && (
        <button
          onClick={() => update("delivered")}
          disabled={busy}
          className="mt-2 rounded-control border border-primary-600 px-4 py-2 text-sm font-semibold text-primary-700 disabled:opacity-60"
        >
          {t("markDelivered")}
        </button>
      )}
      {status === "delivered" && (
        <p className="mt-1.5 text-sm font-semibold text-success">
          ✓ {t("delivered")}
        </p>
      )}
    </div>
  );
}

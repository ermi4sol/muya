"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CreatorActions({
  creatorId,
  status,
  tier,
}: {
  creatorId: string;
  status: string;
  tier?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function act(body: Record<string, string>) {
    setBusy(true);
    await fetch(`/api/admin/creators/${creatorId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    router.refresh();
  }

  function suspendOrReinstate(action: "suspend" | "reinstate") {
    if (
      action === "suspend" &&
      !window.confirm(
        "Suspend this creator? Their storefront goes offline immediately."
      )
    )
      return;
    void act({ action });
  }

  return (
    <div className="flex items-center gap-2">
      {tier !== undefined && (
        <select
          disabled={busy}
          value={tier || "free"}
          onChange={(e) => act({ action: "set_tier", tier: e.target.value })}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-xs font-medium text-neutral-700"
          title="Change tier"
        >
          <option value="free">free</option>
          <option value="premium_growth">growth</option>
          <option value="premium_business">business</option>
        </select>
      )}
      {status === "active" ? (
        <button
          onClick={() => suspendOrReinstate("suspend")}
          disabled={busy}
          className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
        >
          Suspend
        </button>
      ) : (
        <button
          onClick={() => suspendOrReinstate("reinstate")}
          disabled={busy}
          className="rounded-md border border-emerald-300 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
        >
          Reinstate
        </button>
      )}
    </div>
  );
}

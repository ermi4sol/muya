"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CreatorActions({
  creatorId,
  status,
}: {
  creatorId: string;
  status: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function act(action: "suspend" | "reinstate") {
    if (
      action === "suspend" &&
      !window.confirm("Suspend this creator? Their storefront goes offline immediately.")
    )
      return;
    setBusy(true);
    await fetch(`/api/admin/creators/${creatorId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setBusy(false);
    router.refresh();
  }

  return status === "active" ? (
    <button
      onClick={() => act("suspend")}
      disabled={busy}
      className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
    >
      Suspend
    </button>
  ) : (
    <button
      onClick={() => act("reinstate")}
      disabled={busy}
      className="rounded-md border border-emerald-300 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
    >
      Reinstate
    </button>
  );
}

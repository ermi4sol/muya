"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PayoutActions({
  payoutId,
  status,
}: {
  payoutId: string;
  status: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  async function act(action: "processing" | "paid" | "reject") {
    if (
      action === "paid" &&
      !window.confirm("Confirm you have SENT the money. This debits the creator's balance.")
    )
      return;
    setBusy(true);
    await fetch(`/api/admin/payouts/${payoutId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reason: reason || undefined }),
    });
    setBusy(false);
    setRejecting(false);
    router.refresh();
  }

  if (rejecting) {
    return (
      <div className="mt-3 flex flex-wrap gap-2">
        <input
          autoFocus
          placeholder="Reason (sent to creator)"
          value={reason}
          maxLength={300}
          onChange={(e) => setReason(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
        />
        <button
          onClick={() => act("reject")}
          disabled={busy}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          Confirm reject
        </button>
        <button
          onClick={() => setRejecting(false)}
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {status === "pending" && (
        <button
          onClick={() => act("processing")}
          disabled={busy}
          className="rounded-lg border border-neutral-900 px-4 py-2 text-sm font-semibold text-neutral-900 hover:bg-neutral-50 disabled:opacity-60"
        >
          Mark processing
        </button>
      )}
      <button
        onClick={() => act("paid")}
        disabled={busy}
        className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        {busy ? "…" : "✓ Money sent — mark paid"}
      </button>
      <button
        onClick={() => setRejecting(true)}
        disabled={busy}
        className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
      >
        Reject
      </button>
    </div>
  );
}

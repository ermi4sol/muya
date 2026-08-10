"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RefundButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function refund() {
    if (
      !window.confirm(
        "Refund this order? The creator's balance is debited and the customer's access is revoked. You handle the actual repayment outside MUYA."
      )
    )
      return;
    setBusy(true);
    await fetch("/api/admin/orders/refund", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <button
      onClick={refund}
      disabled={busy}
      className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs font-medium text-neutral-600 hover:border-red-300 hover:text-red-600 disabled:opacity-60"
    >
      {busy ? "…" : "Refund"}
    </button>
  );
}

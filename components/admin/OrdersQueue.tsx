"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface QueueOrder {
  id: string;
  created_at: string;
  quantity: number;
  item_amount: number;
  shipping_fee: number;
  total_charged: number;
  currency: string;
  payment_status: string;
  metadata: Record<string, unknown>;
  productTitle: string;
  productType: string;
  creatorName: string;
  creatorEmail: string;
  customerEmail: string;
  customerName: string | null;
  shipping: {
    name: string; phone: string; address: string; city: string; notes: string | null;
    payment_method: string;
  } | null;
}

export function OrdersQueue({ orders }: { orders: QueueOrder[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function decide(orderId: string, action: "approve" | "reject") {
    setBusyId(orderId);
    setError(null);
    const res = await fetch("/api/admin/orders/decide", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId,
        action,
        reason: action === "reject" ? reason || undefined : undefined,
      }),
    });
    setBusyId(null);
    if (res.ok) {
      setRejecting(null);
      setReason("");
      router.refresh();
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "failed");
    }
  }

  if (orders.length === 0) {
    return (
      <p className="rounded-xl border border-neutral-200 bg-white p-6 text-center text-sm text-neutral-500">
        No pending orders. 🎉
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      {orders.map((o) => {
        const meta = o.metadata ?? {};
        return (
          <div key={o.id} className="rounded-xl border border-neutral-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-neutral-900">
                  {o.productTitle}{" "}
                  <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs font-medium text-neutral-500">
                    {o.productType}
                  </span>
                </p>
                <p className="mt-0.5 text-xs text-neutral-500">
                  {new Date(o.created_at).toLocaleString()} · #{o.id.slice(0, 8).toUpperCase()}
                </p>
              </div>
              <p className="text-lg font-bold text-neutral-900">
                {Number(o.total_charged).toLocaleString()} {o.currency}
              </p>
            </div>

            <div className="mt-3 grid gap-2 text-sm text-neutral-700 sm:grid-cols-2">
              <div className="rounded-lg bg-neutral-50 p-2.5">
                <p className="text-xs font-semibold uppercase text-neutral-400">Customer</p>
                <p>{o.customerName ?? "—"}</p>
                <p className="break-all">{o.customerEmail}</p>
              </div>
              <div className="rounded-lg bg-neutral-50 p-2.5">
                <p className="text-xs font-semibold uppercase text-neutral-400">Creator</p>
                <p>{o.creatorName}</p>
                <p className="break-all">{o.creatorEmail}</p>
              </div>
              {Boolean(meta.variant) && (
                <div className="rounded-lg bg-neutral-50 p-2.5">
                  <p className="text-xs font-semibold uppercase text-neutral-400">Variant</p>
                  <p>{String(meta.variant)} × {o.quantity}</p>
                </div>
              )}
              {Boolean(meta.slot) && (
                <div className="rounded-lg bg-neutral-50 p-2.5">
                  <p className="text-xs font-semibold uppercase text-neutral-400">Booking</p>
                  <p>{new Date(String(meta.slot)).toLocaleString()}</p>
                </div>
              )}
              {Boolean(meta.custom_answer) && (
                <div className="rounded-lg bg-neutral-50 p-2.5 sm:col-span-2">
                  <p className="text-xs font-semibold uppercase text-neutral-400">Buyer request</p>
                  <p className="whitespace-pre-line">{String(meta.custom_answer)}</p>
                </div>
              )}
              {o.shipping && (
                <div className="rounded-lg bg-neutral-50 p-2.5 sm:col-span-2">
                  <p className="text-xs font-semibold uppercase text-neutral-400">
                    Shipping · {o.shipping.payment_method === "cash_on_delivery" ? "💵 CASH ON DELIVERY" : "order request"}
                  </p>
                  <p>{o.shipping.name} · {o.shipping.phone}</p>
                  <p>{o.shipping.address}, {o.shipping.city}</p>
                  {o.shipping.notes && <p className="text-neutral-500">{o.shipping.notes}</p>}
                  {Number(o.shipping_fee) > 0 && (
                    <p className="text-neutral-500">Shipping fee: {Number(o.shipping_fee).toLocaleString()} {o.currency}</p>
                  )}
                </div>
              )}
            </div>

            {rejecting === o.id ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <input
                  autoFocus
                  placeholder="Reason (optional, shown to customer)"
                  value={reason}
                  maxLength={300}
                  onChange={(e) => setReason(e.target.value)}
                  className="min-w-0 flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
                />
                <button
                  onClick={() => decide(o.id, "reject")}
                  disabled={busyId === o.id}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  Confirm reject
                </button>
                <button
                  onClick={() => { setRejecting(null); setReason(""); }}
                  className="rounded-lg border border-neutral-300 px-4 py-2 text-sm"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => decide(o.id, "approve")}
                  disabled={busyId === o.id}
                  className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {busyId === o.id ? "…" : "✓ Approve"}
                </button>
                <button
                  onClick={() => setRejecting(o.id)}
                  disabled={busyId === o.id}
                  className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
                >
                  ✕ Reject
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

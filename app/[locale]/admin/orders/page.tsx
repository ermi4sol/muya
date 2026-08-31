import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/db/client";
import { OrdersQueue, type QueueOrder } from "@/components/admin/OrdersQueue";
import { AdminNav } from "@/components/admin/AdminNav";

export const dynamic = "force-dynamic";

async function loadOrders(status: "pending" | "decided"): Promise<QueueOrder[]> {
  const db = supabaseAdmin();
  let query = db
    .from("orders")
    .select(
      "id, created_at, quantity, item_amount, shipping_fee, total_charged, currency, payment_status, metadata, products(title, type), creators(display_name, store_slug, telegram_username), customers(telegram_username, name), physical_orders(shipping_name, shipping_phone, shipping_address, shipping_city, shipping_notes, payment_method)"
    )
    .order("created_at", { ascending: status === "pending" });
  query =
    status === "pending"
      ? query.eq("payment_status", "pending")
      : query.in("payment_status", ["paid", "rejected", "refunded"]).limit(10);

  const { data } = await query;
  return (data ?? []).map((o) => {
    const p = o.products as unknown as { title: string; type: string } | null;
    const cr = o.creators as unknown as { display_name: string | null; store_slug: string; telegram_username: string | null } | null;
    const cu = o.customers as unknown as { telegram_username: string | null; name: string | null } | null;
    const ship = o.physical_orders as unknown as QueueOrder["shipping"] | null;
    return {
      id: o.id,
      created_at: o.created_at,
      quantity: o.quantity,
      item_amount: Number(o.item_amount),
      shipping_fee: Number(o.shipping_fee),
      total_charged: Number(o.total_charged),
      currency: o.currency,
      payment_status: o.payment_status,
      metadata: (o.metadata ?? {}) as Record<string, unknown>,
      productTitle: p?.title ?? "—",
      productType: p?.type ?? "—",
      creatorName: cr?.display_name ?? cr?.store_slug ?? "—",
      creatorEmail: cr?.telegram_username ? `@${cr.telegram_username}` : "—",
      customerEmail: cu?.telegram_username ? `@${cu.telegram_username}` : (cu?.name ?? "—"),
      customerName: cu?.name ?? null,
      shipping: ship ?? null,
    };
  });
}

export default async function AdminHomePage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  const [pending, recent] = await Promise.all([
    loadOrders("pending"),
    loadOrders("decided"),
  ]);

  return (
    <div className="min-h-dvh bg-neutral-100">
      <AdminNav email={session.email} role={session.adminRole ?? ""} active="/admin/orders" />

      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold text-neutral-900">
          Orders queue{" "}
          {pending.length > 0 && (
            <span className="ml-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-sm font-bold text-amber-800">
              {pending.length}
            </span>
          )}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Approving delivers the product via the Telegram bot and credits the
          creator (commission per the Commission tab). Rejecting notifies the
          customer on Telegram.
        </p>
        <div className="mt-4">
          <OrdersQueue orders={pending} />
        </div>

        {recent.length > 0 && (
          <>
            <h2 className="mt-10 text-sm font-semibold uppercase tracking-wide text-neutral-400">
              Recently decided
            </h2>
            <ul className="mt-2 divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
              {recent.map((o) => (
                <li key={o.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className="min-w-0 truncate text-neutral-700">
                    {o.productTitle}
                    <span className="ml-2 text-xs text-neutral-400">{o.customerEmail}</span>
                  </span>
                  <span
                    className={`ml-3 shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                      o.payment_status === "paid"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-red-50 text-red-600"
                    }`}
                  >
                    {o.payment_status === "paid" ? "approved" : o.payment_status}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </main>
    </div>
  );
}

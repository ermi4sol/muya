import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getUserSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/db/client";
import { ShipControls } from "@/components/dashboard/ShipControls";

export const dynamic = "force-dynamic";

export default async function CreatorOrdersPage() {
  const session = await getUserSession();
  if (!session || session.role !== "creator") redirect("/signin");
  const t = await getTranslations("dash");

  const { data: orders } = await supabaseAdmin()
    .from("orders")
    .select(
      "id, created_at, quantity, total_charged, creator_net_amount, currency, payment_status, metadata, products(title, type), customers(email, name), physical_orders(shipment_status, tracking_number, shipping_name, shipping_city, payment_method)"
    )
    .eq("creator_id", session.sub)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-heading text-2xl font-bold text-ink">
        {t("ordersTitle")}
      </h1>
      {(orders ?? []).length === 0 ? (
        <p className="mt-4 rounded-card border border-line bg-surface p-6 text-sm text-ink-soft shadow-card">
          {t("noOrders")}
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {(orders ?? []).map((o) => {
            const p = o.products as unknown as { title: string; type: string } | null;
            const cu = o.customers as unknown as { email: string; name: string | null } | null;
            const ship = o.physical_orders as unknown as {
              shipment_status: string; tracking_number: string | null;
              shipping_name: string; shipping_city: string; payment_method: string;
            } | null;
            const meta = (o.metadata ?? {}) as Record<string, unknown>;
            return (
              <li key={o.id} className="rounded-card border border-line bg-surface p-4 shadow-card">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink">{p?.title ?? "—"}</p>
                    <p className="text-xs text-ink-faint">
                      {cu?.name ?? cu?.email} · {new Date(o.created_at).toLocaleString()}
                    </p>
                    {Boolean(meta.variant) && (
                      <p className="text-xs text-ink-soft">{String(meta.variant)} × {o.quantity}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-ink">
                      {Number(o.total_charged).toLocaleString()} {o.currency}
                    </p>
                    <p
                      className={`text-xs font-semibold ${
                        o.payment_status === "paid"
                          ? "text-success"
                          : o.payment_status === "pending"
                            ? "text-warning"
                            : "text-danger"
                      }`}
                    >
                      {o.payment_status}
                    </p>
                  </div>
                </div>
                {ship && o.payment_status === "paid" && (
                  <ShipControls
                    orderId={o.id}
                    status={ship.shipment_status}
                    tracking={ship.tracking_number}
                    destination={`${ship.shipping_name}, ${ship.shipping_city}`}
                    cod={ship.payment_method === "cash_on_delivery"}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

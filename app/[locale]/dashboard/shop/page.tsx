import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getUserSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/db/client";
import { Link } from "@/i18n/navigation";
import { ShipControls } from "@/components/dashboard/ShipControls";

export const dynamic = "force-dynamic";

/** Shop tab (UI page 27): physical inventory table + shipment view. */
export default async function DashboardShopPage() {
  const session = await getUserSession();
  if (!session || session.role !== "creator") redirect("/signin");
  const t = await getTranslations("dash");
  const db = supabaseAdmin();

  const [{ data: physicals }, { data: shipments }] = await Promise.all([
    db
      .from("products")
      .select(
        "id, title, status, price, discount_price, currency, thumbnail_url, product_variants(id, stock_count)"
      )
      .eq("creator_id", session.sub)
      .eq("type", "physical")
      .neq("status", "archived")
      .order("sort_order"),
    db
      .from("orders")
      .select(
        "id, created_at, quantity, total_charged, currency, payment_status, metadata, products(title), physical_orders(shipment_status, tracking_number, shipping_name, shipping_city, payment_method)"
      )
      .eq("creator_id", session.sub)
      .eq("payment_status", "paid")
      .not("physical_orders", "is", null)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold text-ink">
          🛍️ {t("navShop")}
        </h1>
        <Link
          href="/dashboard/products/new/physical"
          className="rounded-control bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-card hover:bg-primary-700"
        >
          + {t("addProduct")}
        </Link>
      </div>

      {/* Inventory table */}
      <div className="rounded-card border border-line bg-surface p-5 shadow-card">
        <p className="text-sm font-medium text-ink-soft">{t("shopInventory")}</p>
        {(physicals ?? []).length === 0 ? (
          <p className="mt-3 rounded-control bg-primary-50 px-4 py-3 text-sm text-primary-800">
            {t("shopEmpty")}
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="text-left text-xs text-ink-faint">
                  <th className="py-1.5 pr-3">{t("colProduct")}</th>
                  <th className="py-1.5 pr-3 text-right">{t("colVariants")}</th>
                  <th className="py-1.5 pr-3 text-right">{t("colStock")}</th>
                  <th className="py-1.5 pr-3 text-right">{t("colPrice")}</th>
                  <th className="py-1.5">{t("colStatus")}</th>
                </tr>
              </thead>
              <tbody>
                {(physicals ?? []).map((p) => {
                  const variants =
                    (p.product_variants as { id: string; stock_count: number }[] | null) ??
                    [];
                  const totalStock = variants.reduce((a, v) => a + v.stock_count, 0);
                  return (
                    <tr key={p.id} className="border-t border-line">
                      <td className="py-2.5 pr-3">
                        <Link
                          href={`/dashboard/products/${p.id}`}
                          className="flex items-center gap-2.5 font-medium text-ink hover:text-primary-700"
                        >
                          {p.thumbnail_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={p.thumbnail_url}
                              alt=""
                              className="h-9 w-9 rounded-lg object-cover"
                            />
                          ) : (
                            <span className="text-xl">🛍️</span>
                          )}
                          <span className="max-w-[180px] truncate">{p.title}</span>
                        </Link>
                      </td>
                      <td className="py-2.5 pr-3 text-right text-ink-soft">
                        {variants.length}
                      </td>
                      <td
                        className={`py-2.5 pr-3 text-right font-semibold ${
                          totalStock === 0 ? "text-danger" : "text-ink"
                        }`}
                      >
                        {totalStock}
                      </td>
                      <td className="py-2.5 pr-3 text-right text-ink">
                        {Number(p.discount_price ?? p.price).toLocaleString()} {p.currency}
                      </td>
                      <td className="py-2.5">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            p.status === "active"
                              ? "bg-green-50 text-success"
                              : "bg-line/50 text-ink-faint"
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Shipments */}
      <div className="rounded-card border border-line bg-surface p-5 shadow-card">
        <p className="text-sm font-medium text-ink-soft">{t("shipments")}</p>
        {(shipments ?? []).length === 0 ? (
          <p className="mt-3 rounded-control bg-primary-50 px-4 py-3 text-sm text-primary-800">
            {t("noShipments")}
          </p>
        ) : (
          <ul className="mt-2 space-y-3">
            {(shipments ?? []).map((o) => {
              const p = o.products as unknown as { title: string } | null;
              const ship = o.physical_orders as unknown as {
                shipment_status: string;
                tracking_number: string | null;
                shipping_name: string;
                shipping_city: string;
                payment_method: string;
              } | null;
              const meta = (o.metadata ?? {}) as Record<string, unknown>;
              if (!ship) return null;
              return (
                <li key={o.id} className="rounded-control border border-line p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">
                        {p?.title ?? "—"}
                        {meta.variant ? ` · ${String(meta.variant)}` : ""} × {o.quantity}
                      </p>
                      <p className="text-xs text-ink-faint">
                        {new Date(o.created_at).toLocaleString()}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-ink">
                      {Number(o.total_charged).toLocaleString()} {o.currency}
                    </p>
                  </div>
                  <ShipControls
                    orderId={o.id}
                    status={ship.shipment_status}
                    tracking={ship.tracking_number}
                    destination={`${ship.shipping_name}, ${ship.shipping_city}`}
                    cod={ship.payment_method === "cash_on_delivery"}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

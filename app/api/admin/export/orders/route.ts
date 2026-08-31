import { getAdminSession, requireAdminRole } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/db/client";

export async function GET() {
  const session = await getAdminSession();
  if (!requireAdminRole(session, ["finance"])) {
    return new Response("forbidden", { status: 403 });
  }
  const { data: orders } = await supabaseAdmin()
    .from("orders")
    .select(
      "id, created_at, payment_status, quantity, item_amount, shipping_fee, total_charged, commission_amount, creator_net_amount, currency, products(title, type), creators(store_slug), customers(telegram_username)"
    )
    .order("created_at", { ascending: false })
    .limit(5000);

  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = [
    [
      "order_id", "created_at", "status", "product", "type", "creator",
      "customer", "quantity", "item_amount", "shipping_fee", "total",
      "commission", "creator_net", "currency",
    ].join(","),
    ...(orders ?? []).map((o) =>
      [
        o.id,
        o.created_at,
        o.payment_status,
        esc((o.products as unknown as { title: string } | null)?.title),
        (o.products as unknown as { type: string } | null)?.type,
        (o.creators as unknown as { store_slug: string } | null)?.store_slug,
        (o.customers as unknown as { telegram_username: string | null } | null)?.telegram_username,
        o.quantity,
        o.item_amount,
        o.shipping_fee,
        o.total_charged,
        o.commission_amount ?? "",
        o.creator_net_amount ?? "",
        o.currency,
      ].join(",")
    ),
  ].join("\n");

  return new Response(rows, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="muya-orders-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}

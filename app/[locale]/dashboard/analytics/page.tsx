import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getUserSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/db/client";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const session = await getUserSession();
  if (!session || session.role !== "creator") redirect("/signin");
  const t = await getTranslations("analytics");
  const db = supabaseAdmin();

  const since30 = new Date(Date.now() - 30 * 86400000).toISOString();
  const [
    { count: visits30 },
    { data: orders },
    { count: leads },
  ] = await Promise.all([
    db
      .from("store_visits")
      .select("id", { count: "exact", head: true })
      .eq("creator_id", session.sub)
      .gte("created_at", since30),
    db
      .from("orders")
      .select("payment_status, created_at, products(type)")
      .eq("creator_id", session.sub)
      .gte("created_at", since30),
    db
      .from("orders")
      .select("id, products!inner(type)", { count: "exact", head: true })
      .eq("creator_id", session.sub)
      .eq("products.type", "lead_magnet")
      .gte("created_at", since30),
  ]);

  const paidOrders = (orders ?? []).filter((o) => o.payment_status === "paid").length;
  const totalOrders = (orders ?? []).length;
  const conversion =
    visits30 && visits30 > 0 ? ((totalOrders / visits30) * 100).toFixed(1) : "0.0";

  const tiles: [string, string][] = [
    [t("visitors"), String(visits30 ?? 0)],
    [t("orders"), `${paidOrders} / ${totalOrders}`],
    [t("leads"), String(leads ?? 0)],
    [t("conversion"), `${conversion}%`],
  ];

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-heading text-2xl font-bold text-ink">{t("title")}</h1>
      <p className="mt-1 text-sm text-ink-soft">{t("subtitle")}</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {tiles.map(([label, value]) => (
          <div key={label} className="rounded-card border border-line bg-surface p-4 shadow-card">
            <p className="text-xs font-medium text-ink-faint">{label}</p>
            <p className="mt-1 font-heading text-2xl font-bold text-ink">{value}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 rounded-control bg-primary-50 px-4 py-3 text-xs text-primary-800">
        {t("note")}
      </p>
    </div>
  );
}

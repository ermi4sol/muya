import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getUserSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/db/client";
import { Link } from "@/i18n/navigation";

export const dynamic = "force-dynamic";

/** Analytics tab (UI page 29): multiple charts with a range filter. */
export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const session = await getUserSession();
  if (!session || session.role !== "creator") redirect("/signin");
  const t = await getTranslations("analytics");
  const td = await getTranslations("dash");
  const db = supabaseAdmin();

  const { range } = await searchParams;
  const days = range === "7" ? 7 : range === "90" ? 90 : 30;
  const since = new Date(Date.now() - days * 86400000);
  const sinceIso = since.toISOString();

  const [{ data: visits }, { data: orders }, { count: leads }] =
    await Promise.all([
      db
        .from("store_visits")
        .select("created_at")
        .eq("creator_id", session.sub)
        .gte("created_at", sinceIso)
        .limit(5000),
      db
        .from("orders")
        .select(
          "payment_status, created_at, customer_id, creator_net_amount, products(id, title, type)"
        )
        .eq("creator_id", session.sub)
        .gte("created_at", sinceIso)
        .limit(2000),
      db
        .from("lead_captures")
        .select("id", { count: "exact", head: true })
        .eq("creator_id", session.sub)
        .gte("created_at", sinceIso),
    ]);

  const totalVisits = (visits ?? []).length;
  const totalOrders = (orders ?? []).length;
  const paid = (orders ?? []).filter((o) => o.payment_status === "paid");
  const conversion =
    totalVisits > 0 ? ((totalOrders / totalVisits) * 100).toFixed(1) : "0.0";

  // Repeat rate: paying customers with 2+ orders
  const byCustomer = new Map<string, number>();
  for (const o of paid) {
    if (!o.customer_id) continue;
    byCustomer.set(o.customer_id, (byCustomer.get(o.customer_id) ?? 0) + 1);
  }
  const repeaters = [...byCustomer.values()].filter((n) => n >= 2).length;
  const repeatRate =
    byCustomer.size > 0 ? ((repeaters / byCustomer.size) * 100).toFixed(0) : "0";

  // Visits trend buckets
  const bucketCount = days === 7 ? 7 : days === 30 ? 30 : 45;
  const bucketMs = (days * 86400000) / bucketCount;
  const visitBuckets = new Array(bucketCount).fill(0) as number[];
  for (const v of visits ?? []) {
    const idx = Math.min(
      bucketCount - 1,
      Math.floor((new Date(v.created_at).getTime() - since.getTime()) / bucketMs)
    );
    if (idx >= 0) visitBuckets[idx]++;
  }
  const maxVisits = Math.max(1, ...visitBuckets);

  // Top products by net revenue
  const byProduct = new Map<string, { title: string; total: number; count: number }>();
  for (const o of paid) {
    const p = o.products as unknown as { id: string; title: string | null } | null;
    if (!p) continue;
    const cur = byProduct.get(p.id) ?? { title: p.title ?? "—", total: 0, count: 0 };
    cur.total += Number(o.creator_net_amount ?? 0);
    cur.count++;
    byProduct.set(p.id, cur);
  }
  const topProducts = [...byProduct.values()]
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);
  const maxProduct = Math.max(1, ...topProducts.map((p) => p.total));

  const ranges = [
    { v: "7", label: td("range7") },
    { v: "30", label: td("range30") },
    { v: "90", label: td("range90") },
  ];

  const tiles: [string, string][] = [
    [t("visitors"), String(totalVisits)],
    [t("orders"), `${paid.length} / ${totalOrders}`],
    [t("leads"), String(leads ?? 0)],
    [t("conversion"), `${conversion}%`],
    [t("repeatRate"), `${repeatRate}%`],
    [
      t("revenue"),
      `${paid.reduce((a, o) => a + Number(o.creator_net_amount ?? 0), 0).toLocaleString()} ETB`,
    ],
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-ink">
            📊 {t("title")}
          </h1>
          <p className="mt-1 text-sm text-ink-soft">{t("subtitle")}</p>
        </div>
        <div className="flex gap-1 rounded-control border border-line bg-surface p-1">
          {ranges.map((r) => (
            <Link
              key={r.v}
              href={`/dashboard/analytics?range=${r.v}`}
              className={`rounded-[9px] px-3 py-1.5 text-xs font-semibold ${
                String(days) === r.v
                  ? "bg-primary-600 text-white"
                  : "text-ink-soft hover:bg-primary-50"
              }`}
            >
              {r.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {tiles.map(([label, value]) => (
          <div
            key={label}
            className="rounded-card border border-line bg-surface p-4 shadow-card"
          >
            <p className="text-xs font-medium text-ink-faint">{label}</p>
            <p className="mt-1 font-heading text-2xl font-bold text-ink">{value}</p>
          </div>
        ))}
      </div>

      {/* Visits trend */}
      <div className="rounded-card border border-line bg-surface p-5 shadow-card">
        <p className="text-sm font-medium text-ink-soft">{t("visitsTrend")}</p>
        <div className="mt-4 flex h-28 items-end gap-[2px]">
          {visitBuckets.map((v, i) => (
            <div
              key={i}
              className="flex-1 rounded-t bg-accent-300"
              style={{
                height: `${Math.max(2, (v / maxVisits) * 100)}%`,
                opacity: v === 0 ? 0.2 : 1,
              }}
              title={String(v)}
            />
          ))}
        </div>
        <div className="mt-1.5 flex justify-between text-[10px] text-ink-faint">
          <span>{since.toLocaleDateString()}</span>
          <span>{new Date().toLocaleDateString()}</span>
        </div>
      </div>

      {/* Top products */}
      <div className="rounded-card border border-line bg-surface p-5 shadow-card">
        <p className="text-sm font-medium text-ink-soft">{t("topProducts")}</p>
        {topProducts.length === 0 ? (
          <p className="mt-3 rounded-control bg-primary-50 px-4 py-3 text-sm text-primary-800">
            {t("noSales")}
          </p>
        ) : (
          <div className="mt-3 space-y-2.5">
            {topProducts.map((p) => (
              <div key={p.title}>
                <div className="flex justify-between text-sm">
                  <span className="max-w-[240px] truncate font-medium text-ink">
                    {p.title}
                  </span>
                  <span className="text-ink-soft">
                    {p.total.toLocaleString()} ETB · {p.count}×
                  </span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-primary-50">
                  <div
                    className="h-2 rounded-full bg-primary-500"
                    style={{ width: `${(p.total / maxProduct) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getUserSession } from "@/lib/auth/session";
import { getCreator, getCreatorSnapshot } from "@/lib/db/creator";
import { supabaseAdmin } from "@/lib/db/client";
import { Link } from "@/i18n/navigation";

/** Home (UI page 20): date-range filter, Site Views / Revenue / Leads cards, trend chart. */
export default async function DashboardHome({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const session = await getUserSession();
  if (!session || session.role !== "creator") redirect("/signin");

  const creator = await getCreator(session.sub);
  if (!creator) redirect("/signin");
  if (!creator.display_name) redirect("/dashboard/onboarding");

  const t = await getTranslations("dash");
  const { range } = await searchParams;
  const days = range === "7" ? 7 : range === "90" ? 90 : 30;
  const since = new Date(Date.now() - days * 24 * 3600 * 1000);
  const sinceIso = since.toISOString();

  const db = supabaseAdmin();
  const [snap, { count: visits }, { count: leads }, { data: paidOrders }] =
    await Promise.all([
      getCreatorSnapshot(creator.id),
      db
        .from("store_visits")
        .select("id", { count: "exact", head: true })
        .eq("creator_id", creator.id)
        .gte("created_at", sinceIso),
      db
        .from("lead_captures")
        .select("id", { count: "exact", head: true })
        .eq("creator_id", creator.id)
        .gte("created_at", sinceIso),
      db
        .from("orders")
        .select("creator_net_amount, created_at")
        .eq("creator_id", creator.id)
        .eq("payment_status", "paid")
        .gte("created_at", sinceIso),
    ]);

  const rangeRevenue = (paidOrders ?? []).reduce(
    (a, o) => a + Number(o.creator_net_amount ?? 0),
    0
  );

  // Daily buckets for the trend chart
  const bucketCount = days === 7 ? 7 : days === 30 ? 30 : 45; // 90d → 2-day buckets
  const bucketMs = (days * 24 * 3600 * 1000) / bucketCount;
  const buckets = new Array(bucketCount).fill(0) as number[];
  for (const o of paidOrders ?? []) {
    const idx = Math.min(
      bucketCount - 1,
      Math.floor((new Date(o.created_at).getTime() - since.getTime()) / bucketMs)
    );
    if (idx >= 0) buckets[idx] += Number(o.creator_net_amount ?? 0);
  }
  const maxBucket = Math.max(1, ...buckets);

  const fmt = (n: number) =>
    `${n.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${creator.currency}`;

  const ranges = [
    { v: "7", label: t("range7") },
    { v: "30", label: t("range30") },
    { v: "90", label: t("range90") },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-bold text-ink">
          {creator.display_name} 👋
        </h1>
        {/* date-range filter */}
        <div className="flex gap-1 rounded-control border border-line bg-surface p-1">
          {ranges.map((r) => (
            <Link
              key={r.v}
              href={`/dashboard?range=${r.v}`}
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

      {/* Metric cards: Site Views / Total Revenue / Leads */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard icon="👁" label={t("siteViews")} value={(visits ?? 0).toLocaleString()} />
        <MetricCard icon="💰" label={t("totalRevenue")} value={fmt(rangeRevenue)} />
        <MetricCard icon="🧲" label={t("leads")} value={(leads ?? 0).toLocaleString()} />
      </div>

      {/* Trend chart */}
      <div className="rounded-card border border-line bg-surface p-5 shadow-card">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-ink-soft">{t("revenueTrend")}</p>
          <p className="text-xs text-ink-faint">
            {t("balance")}: <span className="font-bold text-ink">{fmt(snap.balance)}</span>
          </p>
        </div>
        <div className="mt-4 flex h-32 items-end gap-[2px]">
          {buckets.map((v, i) => (
            <div
              key={i}
              className="flex-1 rounded-t bg-primary-500/80"
              style={{
                height: `${Math.max(2, (v / maxBucket) * 100)}%`,
                opacity: v === 0 ? 0.15 : 1,
              }}
              title={fmt(v)}
            />
          ))}
        </div>
        <div className="mt-1.5 flex justify-between text-[10px] text-ink-faint">
          <span>{since.toLocaleDateString()}</span>
          <span>{new Date().toLocaleDateString()}</span>
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <p className="text-sm font-medium text-ink-soft">{t("quickActions")}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Link
            href="/dashboard/products/new"
            className="rounded-control bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-card hover:bg-primary-700"
          >
            + {t("addProduct")}
          </Link>
          <Link
            href="/dashboard/preview"
            className="rounded-control border border-primary-600 px-4 py-2.5 text-sm font-semibold text-primary-700 hover:bg-primary-50"
          >
            {t("viewStore")}
          </Link>
          <Link
            href="/dashboard/income"
            className="rounded-control border border-line px-4 py-2.5 text-sm font-semibold text-ink-soft hover:border-primary-600 hover:text-primary-700"
          >
            {t("requestPayout")}
          </Link>
        </div>
      </div>

      {/* Recent orders */}
      <div className="rounded-card border border-line bg-surface p-5 shadow-card">
        <p className="text-sm font-medium text-ink-soft">{t("recentOrders")}</p>
        {snap.recentOrders.length === 0 ? (
          <p className="mt-3 rounded-control bg-primary-50 px-4 py-3 text-sm text-primary-800">
            {t("noOrders")}
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-line">
            {snap.recentOrders.map((o) => (
              <li key={o.id} className="flex items-center justify-between py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">
                    {o.productTitle}
                  </p>
                  <p className="truncate text-xs text-ink-faint">{o.customerName}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-ink">
                    {o.amount.toLocaleString()} {o.currency}
                  </p>
                  <p
                    className={`text-xs ${
                      o.status === "paid"
                        ? "text-success"
                        : o.status === "pending"
                          ? "text-warning"
                          : "text-danger"
                    }`}
                  >
                    {o.status}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-card border border-line bg-surface p-5 shadow-card">
      <p className="text-sm font-medium text-ink-soft">
        {icon} {label}
      </p>
      <p className="mt-2 font-heading text-2xl font-bold text-ink">{value}</p>
    </div>
  );
}

import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getUserSession } from "@/lib/auth/session";
import { getCreator } from "@/lib/db/creator";
import { getLedgerSummary } from "@/lib/db/ledger";
import { getCommissionRate, splitAmount } from "@/lib/fulfillment/commission";
import { supabaseAdmin } from "@/lib/db/client";
import { PayoutSheet } from "@/components/dashboard/PayoutSheet";
import { Link } from "@/i18n/navigation";

export const dynamic = "force-dynamic";

const TYPE_BADGE: Record<string, string> = {
  sale: "💰",
  payout: "🏦",
  refund: "↩️",
  adjustment: "⚙️",
};

const STATUS_FILTERS = ["all", "pending", "paid", "refunded", "rejected"] as const;

/** Income v2 (UI page 28): chart, Available for Cashout / Available Soon, payout, filterable orders. */
export default async function IncomePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await getUserSession();
  if (!session || session.role !== "creator") redirect("/signin");
  const creator = await getCreator(session.sub);
  if (!creator) redirect("/signin");
  const t = await getTranslations("income");
  const { status } = await searchParams;
  const statusFilter = STATUS_FILTERS.includes(
    status as (typeof STATUS_FILTERS)[number]
  )
    ? (status as (typeof STATUS_FILTERS)[number])
    : "all";

  const db = supabaseAdmin();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  let ordersQuery = db
    .from("orders")
    .select(
      "id, created_at, quantity, total_charged, creator_net_amount, currency, payment_status, products(title, type)"
    )
    .eq("creator_id", creator.id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (statusFilter !== "all") {
    ordersQuery = ordersQuery.eq("payment_status", statusFilter);
  }

  const [s, { data: pendingOrders }, { data: chartOrders }, { data: orders }] =
    await Promise.all([
      getLedgerSummary(creator.id),
      db
        .from("orders")
        .select("total_charged, products(type)")
        .eq("creator_id", creator.id)
        .eq("payment_status", "pending"),
      db
        .from("orders")
        .select("creator_net_amount, created_at")
        .eq("creator_id", creator.id)
        .eq("payment_status", "paid")
        .gte("created_at", sixMonthsAgo.toISOString()),
      ordersQuery,
    ]);

  // "Available soon": estimated net of orders still awaiting approval
  let availableSoon = 0;
  for (const o of pendingOrders ?? []) {
    const type = (o.products as unknown as { type: string } | null)?.type ?? "";
    const rate = await getCommissionRate(type);
    availableSoon += splitAmount(Number(o.total_charged), rate).net;
  }
  availableSoon = Math.round(availableSoon * 100) / 100;

  // Monthly buckets (last 6 months)
  const months: { label: string; total: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(sixMonthsAgo);
    d.setMonth(d.getMonth() + i);
    months.push({
      label: d.toLocaleDateString(undefined, { month: "short" }),
      total: 0,
    });
  }
  for (const o of chartOrders ?? []) {
    const d = new Date(o.created_at);
    const idx =
      (d.getFullYear() - sixMonthsAgo.getFullYear()) * 12 +
      d.getMonth() -
      sixMonthsAgo.getMonth();
    if (idx >= 0 && idx < 6) months[idx].total += Number(o.creator_net_amount ?? 0);
  }
  const maxMonth = Math.max(1, ...months.map((m) => m.total));

  const fmt = (n: number) =>
    `${n.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${creator.currency}`;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <h1 className="font-heading text-2xl font-bold text-ink">{t("title")}</h1>

      {/* Revenue chart */}
      <div className="rounded-card border border-line bg-surface p-5 shadow-card">
        <p className="text-sm font-medium text-ink-soft">{t("revenueChart")}</p>
        <div className="mt-4 flex h-32 items-end gap-3">
          {months.map((m, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-t-lg bg-primary-500/80"
                style={{
                  height: `${Math.max(3, (m.total / maxMonth) * 100)}%`,
                  opacity: m.total === 0 ? 0.15 : 1,
                }}
                title={fmt(m.total)}
              />
              <span className="text-[10px] text-ink-faint">{m.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Available for cashout / available soon */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-card border border-line bg-surface p-5 shadow-card">
          <p className="text-sm font-medium text-ink-soft">{t("available")}</p>
          <p className="mt-1 font-heading text-3xl font-bold text-ink">
            {fmt(s.available)}
          </p>
          {s.held > 0 && (
            <p className="mt-1 text-sm text-warning">
              {t("held", { amount: fmt(s.held) })}
            </p>
          )}
          <div className="mt-4">
            <PayoutSheet available={s.available} currency={creator.currency} />
          </div>
        </div>
        <div className="rounded-card border border-line bg-surface p-5 shadow-card">
          <p className="text-sm font-medium text-ink-soft">{t("availableSoon")}</p>
          <p className="mt-1 font-heading text-3xl font-bold text-ink-soft">
            {fmt(availableSoon)}
          </p>
          <p className="mt-1 text-xs text-ink-faint">{t("availableSoonNote")}</p>
        </div>
      </div>

      {s.pendingPayouts.length > 0 && (
        <div className="rounded-card border border-line bg-surface p-5 shadow-card">
          <p className="text-sm font-medium text-ink-soft">{t("pendingTitle")}</p>
          <ul className="mt-2 divide-y divide-line">
            {s.pendingPayouts.map((p) => (
              <li key={p.id} className="flex justify-between py-2 text-sm">
                <span className="text-ink">
                  {Number(p.amount).toLocaleString()} {creator.currency} ·{" "}
                  {p.payout_method}
                </span>
                <span className="font-semibold text-warning">{p.status}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Filterable orders table */}
      <div className="rounded-card border border-line bg-surface p-5 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-ink-soft">{t("ordersTable")}</p>
          <div className="flex flex-wrap gap-1">
            {STATUS_FILTERS.map((f) => (
              <Link
                key={f}
                href={f === "all" ? "/dashboard/income" : `/dashboard/income?status=${f}`}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  statusFilter === f
                    ? "bg-primary-600 text-white"
                    : "bg-primary-50 text-primary-800 hover:bg-primary-100"
                }`}
              >
                {t(`filter_${f}`)}
              </Link>
            ))}
          </div>
        </div>
        {(orders ?? []).length === 0 ? (
          <p className="mt-3 rounded-control bg-primary-50 px-4 py-3 text-sm text-primary-800">
            {t("empty")}
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="text-left text-xs text-ink-faint">
                  <th className="py-1.5 pr-3">{t("colProduct")}</th>
                  <th className="py-1.5 pr-3">{t("colDate")}</th>
                  <th className="py-1.5 pr-3">{t("colStatus")}</th>
                  <th className="py-1.5 pr-3 text-right">{t("colTotal")}</th>
                  <th className="py-1.5 text-right">{t("colNet")}</th>
                </tr>
              </thead>
              <tbody>
                {(orders ?? []).map((o) => {
                  const p = o.products as unknown as { title: string | null } | null;
                  return (
                    <tr key={o.id} className="border-t border-line">
                      <td className="max-w-[200px] truncate py-2 pr-3 font-medium text-ink">
                        {p?.title ?? "—"}
                      </td>
                      <td className="py-2 pr-3 text-ink-faint">
                        {new Date(o.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-2 pr-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            o.payment_status === "paid"
                              ? "bg-green-50 text-success"
                              : o.payment_status === "pending"
                                ? "bg-amber-50 text-warning"
                                : "bg-red-50 text-danger"
                          }`}
                        >
                          {o.payment_status}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-right text-ink">
                        {Number(o.total_charged).toLocaleString()} {o.currency}
                      </td>
                      <td className="py-2 text-right font-semibold text-ink">
                        {o.creator_net_amount != null
                          ? `${Number(o.creator_net_amount).toLocaleString()} ${o.currency}`
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Ledger history */}
      <div className="rounded-card border border-line bg-surface p-5 shadow-card">
        <p className="text-sm font-medium text-ink-soft">{t("history")}</p>
        {s.entries.length === 0 ? (
          <p className="mt-3 rounded-control bg-primary-50 px-4 py-3 text-sm text-primary-800">
            {t("empty")}
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-line">
            {s.entries.map((e) => (
              <li key={e.id} className="flex items-center justify-between py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">
                    {TYPE_BADGE[e.entry_type] ?? "•"} {t(`type_${e.entry_type}`)}
                    {e.productTitle ? ` — ${e.productTitle}` : ""}
                  </p>
                  <p className="text-xs text-ink-faint">
                    {new Date(e.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={`text-sm font-bold ${
                      e.amount >= 0 ? "text-success" : "text-danger"
                    }`}
                  >
                    {e.amount >= 0 ? "+" : ""}
                    {fmt(e.amount)}
                  </p>
                  <p className="text-xs text-ink-faint">{fmt(e.balance_after)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getUserSession } from "@/lib/auth/session";
import { getCreator, getCreatorSnapshot } from "@/lib/db/creator";
import { Link } from "@/i18n/navigation";

export default async function DashboardHome() {
  const session = await getUserSession();
  if (!session || session.role !== "creator") redirect("/signin");

  const creator = await getCreator(session.sub);
  if (!creator) redirect("/signin");
  if (!creator.display_name) redirect("/dashboard/onboarding");

  const t = await getTranslations("dash");
  const snap = await getCreatorSnapshot(creator.id);
  const fmt = (n: number) =>
    `${n.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${creator.currency}`;

  return (
    <div className="space-y-5">
      <h1 className="font-heading text-2xl font-bold text-ink">
        {creator.display_name} 👋
      </h1>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Revenue snapshot */}
        <div className="rounded-card border border-line bg-surface p-5 shadow-card lg:col-span-2">
          <p className="text-sm font-medium text-ink-soft">{t("revenue")}</p>
          <div className="mt-3 grid grid-cols-3 gap-3">
            {(
              [
                ["today", snap.revenue.today],
                ["week", snap.revenue.week],
                ["month", snap.revenue.month],
              ] as const
            ).map(([k, v]) => (
              <div key={k} className="rounded-control bg-primary-50 p-3">
                <p className="text-xs text-primary-800">{t(k)}</p>
                <p className="mt-1 font-heading text-lg font-bold text-primary-900">
                  {fmt(v)}
                </p>
              </div>
            ))}
          </div>
        </div>
        {/* Balance */}
        <div className="rounded-card border border-line bg-surface p-5 shadow-card">
          <p className="text-sm font-medium text-ink-soft">{t("balance")}</p>
          <p className="mt-2 font-heading text-3xl font-bold text-ink">
            {fmt(snap.balance)}
          </p>
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
          <span className="cursor-not-allowed rounded-control border border-line px-4 py-2.5 text-sm font-semibold text-ink-faint">
            {t("requestPayout")} · {t("soon")}
          </span>
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
                  <p className="truncate text-xs text-ink-faint">
                    {o.customerEmail}
                  </p>
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

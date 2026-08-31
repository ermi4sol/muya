import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/db/client";
import { AdminNav } from "@/components/admin/AdminNav";
import { AdminTelegramLink } from "@/components/admin/AdminTelegramLink";
import { Link } from "@/i18n/navigation";

export const dynamic = "force-dynamic";

/** Admin lands on the Dashboard first (UI page 37). */
export default async function AdminDashboardPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  const db = supabaseAdmin();

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000).toISOString();

  const [
    { data: paidOrders },
    { count: creatorsCount },
    { count: newCreators },
    { count: customersCount },
    { count: pendingOrders },
    { count: pendingPayouts },
    { data: settings },
    { data: adminRow },
  ] = await Promise.all([
    db
      .from("orders")
      .select("total_charged, commission_amount, created_at")
      .eq("payment_status", "paid"),
    db
      .from("creators")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    db
      .from("creators")
      .select("id", { count: "exact", head: true })
      .gte("created_at", thirtyDaysAgo),
    db.from("customers").select("id", { count: "exact", head: true }),
    db
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("payment_status", "pending"),
    db
      .from("payout_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    db
      .from("platform_settings")
      .select("commission_percent")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    db
      .from("admin_users")
      .select("telegram_user_id")
      .eq("id", session.sub)
      .maybeSingle(),
  ]);

  const gmv = (paidOrders ?? []).reduce((a, o) => a + Number(o.total_charged), 0);
  const commission = (paidOrders ?? []).reduce(
    (a, o) => a + Number(o.commission_amount ?? 0),
    0
  );
  const rate = Number(settings?.commission_percent ?? 7);

  // 14-day GMV chart
  const days: { label: string; total: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const day = new Date(Date.now() - i * 86400000);
    const key = day.toISOString().slice(0, 10);
    const total = (paidOrders ?? [])
      .filter(
        (o) => o.created_at?.slice(0, 10) === key && o.created_at >= fourteenDaysAgo
      )
      .reduce((a, o) => a + Number(o.total_charged), 0);
    days.push({ label: key.slice(5), total });
  }
  const max = Math.max(1, ...days.map((d) => d.total));

  const tiles: [string, string, string?][] = [
    ["Total GMV", `${gmv.toLocaleString()} ETB`],
    [`Commission revenue (${rate}%)`, `${commission.toLocaleString()} ETB`, "/admin/commission"],
    ["Subscription revenue", "0 ETB (free launch)"],
    ["Active creators", String(creatorsCount ?? 0), "/admin/creators"],
    ["New signups (30d)", String(newCreators ?? 0)],
    ["Customers", String(customersCount ?? 0)],
    ["Pending orders", String(pendingOrders ?? 0), "/admin/orders"],
    ["Pending payouts", String(pendingPayouts ?? 0), "/admin/payouts"],
  ];

  return (
    <div className="min-h-dvh bg-neutral-100">
      <AdminNav email={session.email} role={session.adminRole ?? ""} active="/admin" />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-xl font-semibold text-neutral-900">Platform dashboard</h1>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {tiles.map(([label, value, href]) => {
            const card = (
              <div className="rounded-xl border border-neutral-200 bg-white p-4 transition hover:border-neutral-300">
                <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
                  {label}
                </p>
                <p className="mt-1 text-xl font-bold text-neutral-900">{value}</p>
              </div>
            );
            return href ? (
              <Link key={label} href={href}>
                {card}
              </Link>
            ) : (
              <div key={label}>{card}</div>
            );
          })}
        </div>

        <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
            GMV — last 14 days
          </p>
          <div className="mt-3 flex h-40 items-end gap-1">
            {days.map((d) => (
              <div key={d.label} className="group flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t bg-emerald-500/80 transition group-hover:bg-emerald-600"
                  style={{ height: `${Math.max(2, (d.total / max) * 100)}%` }}
                  title={`${d.label}: ${d.total.toLocaleString()} ETB`}
                />
                <span className="hidden text-[9px] text-neutral-400 sm:block">
                  {d.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <AdminTelegramLink current={adminRow?.telegram_user_id ?? null} />
        </div>
      </main>
    </div>
  );
}

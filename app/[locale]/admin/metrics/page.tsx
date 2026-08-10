import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/db/client";
import { AdminNav } from "@/components/admin/AdminNav";

export const dynamic = "force-dynamic";

export default async function AdminMetricsPage() {
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
  ] = await Promise.all([
    db.from("orders").select("total_charged, commission_amount, created_at").eq("payment_status", "paid"),
    db.from("creators").select("id", { count: "exact", head: true }).eq("status", "active"),
    db.from("creators").select("id", { count: "exact", head: true }).gte("created_at", thirtyDaysAgo),
    db.from("customers").select("id", { count: "exact", head: true }),
    db.from("orders").select("id", { count: "exact", head: true }).eq("payment_status", "pending"),
    db.from("payout_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);

  const gmv = (paidOrders ?? []).reduce((a, o) => a + Number(o.total_charged), 0);
  const commission = (paidOrders ?? []).reduce((a, o) => a + Number(o.commission_amount ?? 0), 0);

  // 14-day GMV mini-chart
  const days: { label: string; total: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const day = new Date(Date.now() - i * 86400000);
    const key = day.toISOString().slice(0, 10);
    const total = (paidOrders ?? [])
      .filter((o) => o.created_at?.slice(0, 10) === key && o.created_at >= fourteenDaysAgo)
      .reduce((a, o) => a + Number(o.total_charged), 0);
    days.push({ label: key.slice(5), total });
  }
  const max = Math.max(1, ...days.map((d) => d.total));

  const tiles = [
    ["Total GMV", `${gmv.toLocaleString()} ETB`],
    ["MUYA commission (7%)", `${commission.toLocaleString()} ETB`],
    ["Active creators", String(creatorsCount ?? 0)],
    ["New creators (30d)", String(newCreators ?? 0)],
    ["Customers", String(customersCount ?? 0)],
    ["Pending orders", String(pendingOrders ?? 0)],
    ["Pending payouts", String(pendingPayouts ?? 0)],
  ];

  return (
    <div className="min-h-dvh bg-neutral-100">
      <AdminNav email={session.email} role={session.adminRole ?? ""} active="/admin/metrics" />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-xl font-semibold text-neutral-900">Platform dashboard</h1>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {tiles.map(([label, value]) => (
            <div key={label} className="rounded-xl border border-neutral-200 bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
                {label}
              </p>
              <p className="mt-1 text-xl font-bold text-neutral-900">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
            GMV — last 14 days
          </p>
          <div className="mt-3 flex h-32 items-end gap-1">
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
      </main>
    </div>
  );
}

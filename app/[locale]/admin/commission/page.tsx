import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/db/client";
import { AdminNav } from "@/components/admin/AdminNav";
import { CommissionControls } from "@/components/admin/CommissionControls";

export const dynamic = "force-dynamic";

/** Commission & Revenue (UI page 43): revenue figures + the rate control. */
export default async function AdminCommissionPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  const db = supabaseAdmin();

  const { range } = await searchParams;
  const days = range === "7" ? 7 : range === "90" ? 90 : 30;
  const since = new Date(Date.now() - days * 86400000).toISOString();

  const [{ data: settings }, { data: exclusions }, { data: paidOrders }] =
    await Promise.all([
      db
        .from("platform_settings")
        .select("commission_percent")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      db.from("commission_type_exclusions").select("product_type, is_excluded"),
      db
        .from("orders")
        .select("commission_amount, total_charged, created_at")
        .eq("payment_status", "paid")
        .gte("created_at", since),
    ]);

  const commissionRevenue = (paidOrders ?? []).reduce(
    (a, o) => a + Number(o.commission_amount ?? 0),
    0
  );
  const gmv = (paidOrders ?? []).reduce((a, o) => a + Number(o.total_charged), 0);

  const exclusionMap: Record<string, boolean> = {};
  for (const e of exclusions ?? []) exclusionMap[e.product_type] = e.is_excluded;

  const ranges = [
    ["7", "7 days"],
    ["30", "30 days"],
    ["90", "90 days"],
  ] as const;

  return (
    <div className="min-h-dvh bg-neutral-100">
      <AdminNav
        email={session.email}
        role={session.adminRole ?? ""}
        active="/admin/commission"
      />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold text-neutral-900">
            Commission &amp; revenue
          </h1>
          <div className="flex gap-1 rounded-md border border-neutral-200 bg-white p-1">
            {ranges.map(([v, label]) => (
              <a
                key={v}
                href={`/admin/commission?range=${v}`}
                className={`rounded px-3 py-1.5 text-xs font-semibold ${
                  String(days) === v
                    ? "bg-neutral-900 text-white"
                    : "text-neutral-600 hover:bg-neutral-100"
                }`}
              >
                {label}
              </a>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
              Commission revenue ({days}d)
            </p>
            <p className="mt-1 text-2xl font-bold text-neutral-900">
              {commissionRevenue.toLocaleString()} ETB
            </p>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
              Subscription revenue ({days}d)
            </p>
            <p className="mt-1 text-2xl font-bold text-neutral-900">
              0 ETB{" "}
              <span className="text-sm font-normal text-neutral-400">
                (free launch)
              </span>
            </p>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
              GMV ({days}d)
            </p>
            <p className="mt-1 text-2xl font-bold text-neutral-900">
              {gmv.toLocaleString()} ETB
            </p>
          </div>
        </div>

        <div className="mt-6">
          <CommissionControls
            initialRate={Number(settings?.commission_percent ?? 7)}
            initialExclusions={exclusionMap}
          />
        </div>
      </main>
    </div>
  );
}

import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/db/client";
import { AdminNav } from "@/components/admin/AdminNav";
import { RefundButton } from "@/components/admin/RefundButton";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  paid: "bg-emerald-50 text-emerald-700",
  pending: "bg-amber-50 text-amber-700",
  rejected: "bg-red-50 text-red-600",
  refunded: "bg-neutral-100 text-neutral-500",
};

export default async function AdminLedgerPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  const db = supabaseAdmin();

  const { data: orders } = await db
    .from("orders")
    .select(
      "id, created_at, payment_status, quantity, total_charged, commission_amount, currency, metadata, products(title, type), creators(store_slug), customers(email)"
    )
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="min-h-dvh bg-neutral-100">
      <AdminNav email={session.email} role={session.adminRole ?? ""} active="/admin/ledger" />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-neutral-900">
            Transaction ledger
          </h1>
          <a
            href="/api/admin/export/orders"
            className="rounded-lg border border-neutral-900 px-4 py-2 text-sm font-semibold text-neutral-900 hover:bg-neutral-50"
          >
            ⬇ Export CSV
          </a>
        </div>
        <div className="mt-4 overflow-x-auto rounded-xl border border-neutral-200 bg-white">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400">
                <th className="px-3 py-2.5">Date</th>
                <th className="px-3 py-2.5">Product</th>
                <th className="px-3 py-2.5">Creator</th>
                <th className="px-3 py-2.5">Customer</th>
                <th className="px-3 py-2.5 text-right">Total</th>
                <th className="px-3 py-2.5 text-right">MUYA 7%</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {(orders ?? []).map((o) => {
                const p = o.products as unknown as { title: string; type: string } | null;
                const cr = o.creators as unknown as { store_slug: string } | null;
                const cu = o.customers as unknown as { email: string } | null;
                return (
                  <tr key={o.id} className="text-neutral-700">
                    <td className="whitespace-nowrap px-3 py-2.5 text-xs">
                      {new Date(o.created_at).toLocaleString()}
                    </td>
                    <td className="max-w-[180px] truncate px-3 py-2.5">{p?.title}</td>
                    <td className="px-3 py-2.5">/{cr?.store_slug}</td>
                    <td className="max-w-[160px] truncate px-3 py-2.5">{cu?.email}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right font-semibold">
                      {Number(o.total_charged).toLocaleString()} {o.currency}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right">
                      {o.commission_amount != null
                        ? Number(o.commission_amount).toLocaleString()
                        : "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[o.payment_status] ?? "bg-neutral-100"}`}
                      >
                        {o.payment_status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      {o.payment_status === "paid" && <RefundButton orderId={o.id} />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

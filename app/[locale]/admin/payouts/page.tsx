import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/db/client";
import { AdminNav } from "@/components/admin/AdminNav";
import { PayoutActions } from "@/components/admin/PayoutActions";

export const dynamic = "force-dynamic";

export default async function AdminPayoutsPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  const db = supabaseAdmin();

  const { data: payouts } = await db
    .from("payout_requests")
    .select(
      "id, amount, status, payout_method, payout_details, requested_at, processed_at, rejection_reason, creators(display_name, store_slug, telegram_username, currency)"
    )
    .order("requested_at", { ascending: false })
    .limit(50);

  const open = (payouts ?? []).filter((p) => ["pending", "processing"].includes(p.status));
  const done = (payouts ?? []).filter((p) => !["pending", "processing"].includes(p.status));

  return (
    <div className="min-h-dvh bg-neutral-100">
      <AdminNav email={session.email} role={session.adminRole ?? ""} active="/admin/payouts" />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold text-neutral-900">
          Payout queue{" "}
          {open.length > 0 && (
            <span className="ml-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-sm font-bold text-amber-800">
              {open.length}
            </span>
          )}
        </h1>
        <div className="mt-4 space-y-3">
          {open.length === 0 && (
            <p className="rounded-xl border border-neutral-200 bg-white p-6 text-center text-sm text-neutral-500">
              No open payout requests. 🎉
            </p>
          )}
          {open.map((p) => {
            const c = p.creators as unknown as {
              display_name: string | null; store_slug: string; telegram_username: string | null; currency: string;
            } | null;
            const details = (p.payout_details ?? {}) as Record<string, string>;
            return (
              <div key={p.id} className="rounded-xl border border-neutral-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-neutral-900">
                      {c?.display_name ?? c?.store_slug} · {c?.telegram_username ? `@${c.telegram_username}` : "—"}
                    </p>
                    <p className="text-xs text-neutral-500">
                      requested {new Date(p.requested_at).toLocaleString()}
                    </p>
                  </div>
                  <p className="text-lg font-bold text-neutral-900">
                    {Number(p.amount).toLocaleString()} {c?.currency ?? "ETB"}
                  </p>
                </div>
                <div className="mt-2 rounded-lg bg-neutral-50 p-2.5 text-sm text-neutral-700">
                  <p className="text-xs font-semibold uppercase text-neutral-400">
                    {p.payout_method === "telebirr" ? "📱 Telebirr" : "🏦 Bank"}
                  </p>
                  <p>
                    {details.account_name} · {details.account_number}
                    {details.bank_name ? ` · ${details.bank_name}` : ""}
                  </p>
                </div>
                <PayoutActions payoutId={p.id} status={p.status} />
              </div>
            );
          })}
        </div>

        {done.length > 0 && (
          <>
            <h2 className="mt-10 text-sm font-semibold uppercase tracking-wide text-neutral-400">
              History
            </h2>
            <ul className="mt-2 divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
              {done.map((p) => {
                const c = p.creators as unknown as { store_slug: string } | null;
                return (
                  <li key={p.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <span className="text-neutral-700">
                      /{c?.store_slug} · {Number(p.amount).toLocaleString()} ETB
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        p.status === "paid"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-red-50 text-red-600"
                      }`}
                    >
                      {p.status}
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </main>
    </div>
  );
}

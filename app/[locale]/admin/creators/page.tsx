import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/db/client";
import { AdminNav } from "@/components/admin/AdminNav";
import { CreatorActions } from "@/components/admin/CreatorActions";

export const dynamic = "force-dynamic";

export default async function AdminCreatorsPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  const db = supabaseAdmin();

  const { data: creators } = await db
    .from("creators")
    .select(
      "id, telegram_username, store_slug, display_name, status, created_at, creator_subscriptions(tier)"
    )
    .order("created_at", { ascending: false })
    .limit(100);

  // Balances per creator (latest ledger entry)
  const { data: ledger } = await db
    .from("creator_ledger_entries")
    .select("creator_id, balance_after, created_at")
    .order("created_at", { ascending: false });
  const balance = new Map<string, number>();
  for (const e of ledger ?? []) {
    if (!balance.has(e.creator_id)) balance.set(e.creator_id, Number(e.balance_after));
  }

  return (
    <div className="min-h-dvh bg-neutral-100">
      <AdminNav email={session.email} role={session.adminRole ?? ""} active="/admin/creators" />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-xl font-semibold text-neutral-900">
          Creators ({creators?.length ?? 0})
        </h1>
        <div className="mt-4 space-y-2">
          {(creators ?? []).map((c) => {
            const tier =
              (c.creator_subscriptions as unknown as { tier: string } | null)
                ?.tier ?? "free";
            return (
              <div
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-4"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-neutral-900">
                    {c.display_name ?? "—"}{" "}
                    <a
                      href={`/${c.store_slug}`}
                      target="_blank"
                      className="text-sm font-normal text-emerald-700 hover:underline"
                    >
                      /{c.store_slug}
                    </a>
                  </p>
                  <p className="text-xs text-neutral-500">
                    {c.telegram_username ? `@${c.telegram_username}` : "—"} · joined {new Date(c.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-neutral-600">
                    {tier}
                  </span>
                  <span className="text-sm font-semibold text-neutral-700">
                    {(balance.get(c.id) ?? 0).toLocaleString()} ETB
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      c.status === "active"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-red-50 text-red-600"
                    }`}
                  >
                    {c.status}
                  </span>
                  <CreatorActions creatorId={c.id} status={c.status} tier={tier} />
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

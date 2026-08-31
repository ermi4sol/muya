import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/db/client";
import { AdminNav } from "@/components/admin/AdminNav";

export const dynamic = "force-dynamic";

export default async function AdminLookupPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  const { q } = await searchParams;
  const db = supabaseAdmin();

  let creator = null;
  let customer = null;
  let customerOrders: { title: string; status: string; total: number; currency: string; date: string }[] = [];

  if (q && q.length >= 3) {
    const like = `%${q.trim()}%`;
    const [{ data: cr }, { data: cu }] = await Promise.all([
      db
        .from("creators")
        .select("id, telegram_username, store_slug, display_name, status, created_at, creator_subscriptions(tier)")
        .or(`telegram_username.ilike.${like},store_slug.ilike.${like},display_name.ilike.${like}`)
        .limit(1)
        .maybeSingle(),
      db
        .from("customers")
        .select("id, telegram_username, name, created_at")
        .or(`telegram_username.ilike.${like},name.ilike.${like}`)
        .limit(1)
        .maybeSingle(),
    ]);
    creator = cr;
    customer = cu;
    if (cu) {
      const { data: orders } = await db
        .from("orders")
        .select("payment_status, total_charged, currency, created_at, products(title)")
        .eq("customer_id", cu.id)
        .order("created_at", { ascending: false })
        .limit(10);
      customerOrders = (orders ?? []).map((o) => ({
        title: (o.products as unknown as { title: string } | null)?.title ?? "—",
        status: o.payment_status,
        total: Number(o.total_charged),
        currency: o.currency,
        date: o.created_at,
      }));
    }
  }

  return (
    <div className="min-h-dvh bg-neutral-100">
      <AdminNav email={session.email} role={session.adminRole ?? ""} active="/admin/lookup" />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold text-neutral-900">Support lookup</h1>
        <p className="mt-1 text-xs text-neutral-500">
          Read-only — search by Telegram handle, store link, or name.
        </p>
        <form className="mt-4 flex gap-2">
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="telegram handle, store slug, or name…"
            className="w-full rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-neutral-900"
          />
          <button className="rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white">
            Search
          </button>
        </form>

        {q && !creator && !customer && (
          <p className="mt-4 rounded-xl border border-neutral-200 bg-white p-5 text-center text-sm text-neutral-500">
            No match for “{q}”.
          </p>
        )}

        {creator && (
          <div className="mt-4 rounded-xl border border-neutral-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase text-neutral-400">Creator</p>
            <p className="mt-1 font-semibold text-neutral-900">
              {creator.display_name ?? "—"} · /{creator.store_slug}
            </p>
            <p className="text-sm text-neutral-600">{creator.telegram_username ? `@${creator.telegram_username}` : "—"}</p>
            <p className="mt-1 text-xs text-neutral-500">
              {creator.status} ·{" "}
              {(creator.creator_subscriptions as unknown as { tier: string } | null)?.tier ?? "free"}{" "}
              tier · joined {new Date(creator.created_at).toLocaleDateString()}
            </p>
          </div>
        )}

        {customer && (
          <div className="mt-4 rounded-xl border border-neutral-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase text-neutral-400">Customer</p>
            <p className="mt-1 font-semibold text-neutral-900">{customer.name ?? "—"}</p>
            <p className="text-sm text-neutral-600">{customer.telegram_username ? `@${customer.telegram_username}` : "—"}</p>
            {customerOrders.length > 0 && (
              <ul className="mt-2 divide-y divide-neutral-100 border-t border-neutral-100">
                {customerOrders.map((o, i) => (
                  <li key={i} className="flex justify-between py-2 text-sm">
                    <span className="min-w-0 truncate text-neutral-700">{o.title}</span>
                    <span className="ml-2 shrink-0 text-neutral-500">
                      {o.total.toLocaleString()} {o.currency} · {o.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

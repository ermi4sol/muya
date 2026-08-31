import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/db/client";
import { AdminNav } from "@/components/admin/AdminNav";
import { Link } from "@/i18n/navigation";

export const dynamic = "force-dynamic";

/**
 * v2 Trust & safety — storefront/creator level (communities removed).
 * Suspend/reinstate itself lives in the Creators tab; this page surfaces
 * the current state at a glance.
 */
export default async function AdminSafetyPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  const db = supabaseAdmin();

  const [{ data: suspended }, { data: recent }] = await Promise.all([
    db
      .from("creators")
      .select("id, store_slug, display_name, telegram_username, created_at")
      .eq("status", "suspended")
      .order("created_at", { ascending: false })
      .limit(100),
    db
      .from("creators")
      .select("id, store_slug, display_name, telegram_username, status, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  return (
    <div className="min-h-dvh bg-neutral-100">
      <AdminNav
        email={session.email}
        role={session.adminRole ?? ""}
        active="/admin/safety"
      />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold text-neutral-900">
          Trust &amp; safety
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Storefront-level enforcement. Suspend or reinstate creators from the{" "}
          <Link href="/admin/creators" className="font-medium text-neutral-900 underline">
            Creators tab
          </Link>
          .
        </p>

        <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-neutral-400">
          Suspended storefronts ({suspended?.length ?? 0})
        </h2>
        <ul className="mt-2 divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
          {(suspended ?? []).length === 0 && (
            <li className="px-4 py-4 text-center text-sm text-neutral-500">
              No suspended creators. 🎉
            </li>
          )}
          {(suspended ?? []).map((c) => (
            <li key={c.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="text-neutral-700">
                {c.display_name ?? "—"}{" "}
                <span className="text-xs text-neutral-400">
                  /{c.store_slug} · @{c.telegram_username ?? "?"}
                </span>
              </span>
              <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                suspended
              </span>
            </li>
          ))}
        </ul>

        <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-neutral-400">
          Newest creators
        </h2>
        <ul className="mt-2 divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
          {(recent ?? []).map((c) => (
            <li key={c.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="text-neutral-700">
                {c.display_name ?? "—"}{" "}
                <span className="text-xs text-neutral-400">
                  /{c.store_slug} · @{c.telegram_username ?? "?"}
                </span>
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  c.status === "active"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {c.status}
              </span>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}

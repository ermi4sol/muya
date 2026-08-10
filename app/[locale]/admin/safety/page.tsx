import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/db/client";
import { AdminNav } from "@/components/admin/AdminNav";
import { SafetyActions } from "@/components/admin/SafetyActions";

export const dynamic = "force-dynamic";

export default async function AdminSafetyPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  const db = supabaseAdmin();

  const [{ data: reported }, { data: communities }] = await Promise.all([
    db
      .from("community_posts")
      .select(
        "id, body, report_reason, created_at, communities(id, name, frozen), customers(email)"
      )
      .eq("reported", true)
      .eq("removed", false)
      .order("created_at", { ascending: false })
      .limit(50),
    db
      .from("communities")
      .select("id, name, frozen, products(creators(store_slug))")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  return (
    <div className="min-h-dvh bg-neutral-100">
      <AdminNav email={session.email} role={session.adminRole ?? ""} active="/admin/safety" />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold text-neutral-900">
          Trust &amp; safety{" "}
          {(reported?.length ?? 0) > 0 && (
            <span className="ml-1 rounded-full bg-red-100 px-2.5 py-0.5 text-sm font-bold text-red-700">
              {reported?.length}
            </span>
          )}
        </h1>

        <h2 className="mt-5 text-sm font-semibold uppercase tracking-wide text-neutral-400">
          Reported posts
        </h2>
        <div className="mt-2 space-y-2">
          {(reported ?? []).length === 0 && (
            <p className="rounded-xl border border-neutral-200 bg-white p-5 text-center text-sm text-neutral-500">
              Nothing reported. 🎉
            </p>
          )}
          {(reported ?? []).map((p) => {
            const community = p.communities as unknown as {
              id: string; name: string; frozen: boolean;
            } | null;
            const author = p.customers as unknown as { email: string } | null;
            return (
              <div key={p.id} className="rounded-xl border border-red-200 bg-white p-4">
                <p className="text-xs text-neutral-500">
                  {community?.name} · {author?.email} ·{" "}
                  {new Date(p.created_at).toLocaleString()}
                </p>
                <p className="mt-1 whitespace-pre-line text-sm text-neutral-800">
                  {p.body}
                </p>
                <p className="mt-1 text-xs font-semibold text-red-600">
                  Reason: {p.report_reason ?? "—"}
                </p>
                <SafetyActions
                  postId={p.id}
                  communityId={community?.id ?? null}
                  communityFrozen={community?.frozen ?? false}
                />
              </div>
            );
          })}
        </div>

        <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-neutral-400">
          Communities
        </h2>
        <ul className="mt-2 divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
          {(communities ?? []).map((c) => {
            const creator = (
              c.products as unknown as { creators: { store_slug: string } | null } | null
            )?.creators;
            return (
              <li key={c.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="text-neutral-700">
                  {c.name}{" "}
                  <span className="text-xs text-neutral-400">
                    /{creator?.store_slug}
                  </span>
                </span>
                <SafetyActions
                  postId={null}
                  communityId={c.id}
                  communityFrozen={c.frozen}
                />
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}

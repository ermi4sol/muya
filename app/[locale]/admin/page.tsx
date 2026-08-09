import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/session";

export default async function AdminHomePage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  return (
    <div className="min-h-dvh bg-neutral-100">
      <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-5 py-3">
        <span className="text-sm font-semibold text-neutral-900">
          MUYA administration
        </span>
        <div className="flex items-center gap-3 text-sm text-neutral-500">
          <span>
            {session.email} · <span className="font-medium">{session.adminRole}</span>
          </span>
          <form action="/api/auth/logout?admin=1" method="post">
            <button className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs hover:bg-neutral-50">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-10">
        <div className="rounded-xl border border-neutral-200 bg-white p-6">
          <h1 className="text-xl font-semibold text-neutral-900">
            Admin panel
          </h1>
          <p className="mt-2 text-sm text-neutral-600">
            Authentication is live (password + two-factor). The dashboard,
            orders queue, creator management, payouts, and reporting arrive in
            Phase 11 — earlier phases will progressively add the orders queue
            as soon as checkout exists.
          </p>
        </div>
      </main>
    </div>
  );
}

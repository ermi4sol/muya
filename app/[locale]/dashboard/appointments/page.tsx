import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getUserSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/db/client";

export const dynamic = "force-dynamic";

/** Appointments tab (UI page 32): upcoming + past coaching bookings. */
export default async function AppointmentsPage() {
  const session = await getUserSession();
  if (!session || session.role !== "creator") redirect("/signin");
  const t = await getTranslations("dash");
  const db = supabaseAdmin();

  const { data: bookings } = await db
    .from("bookings")
    .select(
      "id, scheduled_at, duration_minutes, meeting_link, status, products!inner(title, creator_id), entitlements(customers(name, telegram_username))"
    )
    .eq("products.creator_id", session.sub)
    .order("scheduled_at", { ascending: true })
    .limit(100);

  const now = Date.now();
  const upcoming = (bookings ?? []).filter(
    (b) => new Date(b.scheduled_at).getTime() >= now && b.status !== "canceled"
  );
  const past = (bookings ?? [])
    .filter((b) => new Date(b.scheduled_at).getTime() < now)
    .reverse()
    .slice(0, 20);

  function customerOf(b: (typeof upcoming)[number]) {
    const c = (
      b.entitlements as unknown as {
        customers: { name: string | null; telegram_username: string | null } | null;
      } | null
    )?.customers;
    return c?.name ?? (c?.telegram_username ? `@${c.telegram_username}` : "—");
  }

  function Card({ b }: { b: (typeof upcoming)[number] }) {
    const p = b.products as unknown as { title: string } | null;
    return (
      <li className="rounded-card border border-line bg-surface p-4 shadow-card">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink">{p?.title ?? "—"}</p>
            <p className="text-sm text-ink-soft">
              🗓️{" "}
              {new Date(b.scheduled_at).toLocaleString(undefined, {
                dateStyle: "full",
                timeStyle: "short",
              })}{" "}
              · {b.duration_minutes ?? 60} min
            </p>
            <p className="text-xs text-ink-faint">{customerOf(b)}</p>
          </div>
          {b.meeting_link && (
            <a
              href={b.meeting_link}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 rounded-control bg-primary-600 px-3.5 py-2 text-sm font-semibold text-white shadow-card hover:bg-primary-700"
            >
              🎥 {t("joinMeeting")}
            </a>
          )}
        </div>
      </li>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="font-heading text-2xl font-bold text-ink">
        🗓️ {t("navAppointments")}
      </h1>

      <div>
        <p className="text-sm font-medium text-ink-soft">{t("upcoming")}</p>
        {upcoming.length === 0 ? (
          <p className="mt-2 rounded-card border border-line bg-surface p-5 text-sm text-ink-soft shadow-card">
            {t("noAppointments")}
          </p>
        ) : (
          <ul className="mt-2 space-y-3">
            {upcoming.map((b) => (
              <Card key={b.id} b={b} />
            ))}
          </ul>
        )}
      </div>

      {past.length > 0 && (
        <div>
          <p className="text-sm font-medium text-ink-soft">{t("past")}</p>
          <ul className="mt-2 space-y-3 opacity-70">
            {past.map((b) => (
              <Card key={b.id} b={b} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

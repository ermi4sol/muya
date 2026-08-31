import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getUserSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/db/client";

export const dynamic = "force-dynamic";

type Row = {
  key: string;
  who: string;
  method: string;
  source: string;
  date: string;
};

/** Audience tab (UI page 30): customers + captured leads with source/method. */
export default async function AudiencePage() {
  const session = await getUserSession();
  if (!session || session.role !== "creator") redirect("/signin");
  const t = await getTranslations("dash");
  const db = supabaseAdmin();

  const [{ data: buyers }, { data: leads }] = await Promise.all([
    db
      .from("orders")
      .select("created_at, customers(id, name, telegram_username), products(title)")
      .eq("creator_id", session.sub)
      .in("payment_status", ["paid", "pending"])
      .order("created_at", { ascending: false })
      .limit(300),
    db
      .from("lead_captures")
      .select(
        "id, created_at, captured_email, captured_telegram_username, customers(name, telegram_username), products(title)"
      )
      .eq("creator_id", session.sub)
      .order("created_at", { ascending: false })
      .limit(300),
  ]);

  // De-duplicate buyers by customer id (latest order wins)
  const rows: Row[] = [];
  const seen = new Set<string>();
  for (const o of buyers ?? []) {
    const c = o.customers as unknown as {
      id: string;
      name: string | null;
      telegram_username: string | null;
    } | null;
    if (!c || seen.has(`c:${c.id}`)) continue;
    seen.add(`c:${c.id}`);
    rows.push({
      key: `c:${c.id}`,
      who: c.name ?? (c.telegram_username ? `@${c.telegram_username}` : "—"),
      method: "Telegram",
      source:
        (o.products as unknown as { title: string | null } | null)?.title ?? "—",
      date: o.created_at,
    });
  }
  for (const l of leads ?? []) {
    const c = l.customers as unknown as {
      name: string | null;
      telegram_username: string | null;
    } | null;
    const who =
      c?.name ??
      (l.captured_telegram_username
        ? `@${l.captured_telegram_username}`
        : (l.captured_email ?? "—"));
    rows.push({
      key: `l:${l.id}`,
      who,
      method: l.captured_email ? "Email" : "Telegram",
      source:
        (l.products as unknown as { title: string | null } | null)?.title ?? "—",
      date: l.created_at,
    });
  }
  rows.sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <h1 className="font-heading text-2xl font-bold text-ink">
        👥 {t("navAudience")}
      </h1>
      <p className="text-sm text-ink-soft">{t("audienceSub")}</p>

      {rows.length === 0 ? (
        <p className="rounded-card border border-line bg-surface p-6 text-sm text-ink-soft shadow-card">
          {t("audienceEmpty")}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-card border border-line bg-surface p-5 shadow-card">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="text-left text-xs text-ink-faint">
                <th className="py-1.5 pr-3">{t("audWho")}</th>
                <th className="py-1.5 pr-3">{t("audMethod")}</th>
                <th className="py-1.5 pr-3">{t("audSource")}</th>
                <th className="py-1.5">{t("audDate")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 200).map((r) => (
                <tr key={r.key} className="border-t border-line">
                  <td className="max-w-[180px] truncate py-2 pr-3 font-medium text-ink">
                    {r.who}
                  </td>
                  <td className="py-2 pr-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        r.method === "Telegram"
                          ? "bg-primary-50 text-primary-800"
                          : "bg-accent-100 text-accent-900"
                      }`}
                    >
                      {r.method === "Telegram" ? "✈️ Telegram" : "✉️ Email"}
                    </span>
                  </td>
                  <td className="max-w-[180px] truncate py-2 pr-3 text-ink-soft">
                    {r.source}
                  </td>
                  <td className="py-2 text-ink-faint">
                    {new Date(r.date).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

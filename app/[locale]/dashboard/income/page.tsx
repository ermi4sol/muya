import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getUserSession } from "@/lib/auth/session";
import { getCreator } from "@/lib/db/creator";
import { getLedgerSummary } from "@/lib/db/ledger";
import { PayoutSheet } from "@/components/dashboard/PayoutSheet";

export const dynamic = "force-dynamic";

const TYPE_BADGE: Record<string, string> = {
  sale: "💰",
  payout: "🏦",
  refund: "↩️",
  adjustment: "⚙️",
};

export default async function IncomePage() {
  const session = await getUserSession();
  if (!session || session.role !== "creator") redirect("/signin");
  const creator = await getCreator(session.sub);
  if (!creator) redirect("/signin");
  const t = await getTranslations("income");
  const s = await getLedgerSummary(creator.id);
  const fmt = (n: number) =>
    `${n.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${creator.currency}`;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="font-heading text-2xl font-bold text-ink">{t("title")}</h1>

      <div className="rounded-card border border-line bg-surface p-5 shadow-card">
        <p className="text-sm font-medium text-ink-soft">{t("available")}</p>
        <p className="mt-1 font-heading text-4xl font-bold text-ink">
          {fmt(s.available)}
        </p>
        {s.held > 0 && (
          <p className="mt-1 text-sm text-warning">
            {t("held", { amount: fmt(s.held) })}
          </p>
        )}
        <div className="mt-4">
          <PayoutSheet available={s.available} currency={creator.currency} />
        </div>
      </div>

      {s.pendingPayouts.length > 0 && (
        <div className="rounded-card border border-line bg-surface p-5 shadow-card">
          <p className="text-sm font-medium text-ink-soft">{t("pendingTitle")}</p>
          <ul className="mt-2 divide-y divide-line">
            {s.pendingPayouts.map((p) => (
              <li key={p.id} className="flex justify-between py-2 text-sm">
                <span className="text-ink">
                  {Number(p.amount).toLocaleString()} {creator.currency} · {p.payout_method}
                </span>
                <span className="font-semibold text-warning">{p.status}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-card border border-line bg-surface p-5 shadow-card">
        <p className="text-sm font-medium text-ink-soft">{t("history")}</p>
        {s.entries.length === 0 ? (
          <p className="mt-3 rounded-control bg-primary-50 px-4 py-3 text-sm text-primary-800">
            {t("empty")}
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-line">
            {s.entries.map((e) => (
              <li key={e.id} className="flex items-center justify-between py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">
                    {TYPE_BADGE[e.entry_type] ?? "•"} {t(`type_${e.entry_type}`)}
                    {e.productTitle ? ` — ${e.productTitle}` : ""}
                  </p>
                  <p className="text-xs text-ink-faint">
                    {new Date(e.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={`text-sm font-bold ${
                      e.amount >= 0 ? "text-success" : "text-danger"
                    }`}
                  >
                    {e.amount >= 0 ? "+" : ""}
                    {fmt(e.amount)}
                  </p>
                  <p className="text-xs text-ink-faint">{fmt(e.balance_after)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

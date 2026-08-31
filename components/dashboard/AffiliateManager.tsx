"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

export type AffiliateRow = {
  id: string;
  name: string | null;
  referral_code: string | null;
  commission_percent: number;
  referrals: number;
  earned: number;
};

/** Referrals tab interactivity: invite affiliates, adjust commission, copy links. */
export function AffiliateManager({
  affiliates,
  storeSlug,
  currency,
}: {
  affiliates: AffiliateRow[];
  storeSlug: string;
  currency: string;
}) {
  const t = useTranslations("growth");
  const router = useRouter();
  const [name, setName] = useState("");
  const [percent, setPercent] = useState(20);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    const res = await fetch("/api/creator/affiliates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, commission_percent: percent }),
    });
    setBusy(false);
    if (res.ok) {
      setName("");
      router.refresh();
    }
  }

  async function copyLink(code: string) {
    const url = `${window.location.origin}/${storeSlug}?ref=${code}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(code);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      window.prompt(t("copyManually"), url);
    }
  }

  const input =
    "rounded-control border border-line bg-surface px-3.5 py-3 text-sm text-ink outline-none focus:border-primary-500";

  return (
    <div className="space-y-4">
      {/* Invite */}
      <form
        onSubmit={invite}
        className="flex flex-wrap items-end gap-2 rounded-card border border-line bg-surface p-4 shadow-card"
      >
        <label className="block min-w-0 flex-1 text-sm font-medium text-ink-soft">
          {t("affName")}
          <input
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
            className={`${input} mt-1.5 w-full`}
          />
        </label>
        <label className="block w-28 text-sm font-medium text-ink-soft">
          {t("affPercent")}
          <input
            type="number"
            min={1}
            max={90}
            value={percent}
            onChange={(e) => setPercent(Number(e.target.value))}
            className={`${input} mt-1.5 w-full`}
          />
        </label>
        <button
          disabled={busy || !name.trim()}
          className="rounded-control bg-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-card hover:bg-primary-700 disabled:opacity-60"
        >
          + {t("invite")}
        </button>
      </form>

      {/* Table */}
      {affiliates.length === 0 ? (
        <p className="rounded-card border border-line bg-surface p-6 text-sm text-ink-soft shadow-card">
          {t("affEmpty")}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-card border border-line bg-surface p-5 shadow-card">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="text-left text-xs text-ink-faint">
                <th className="py-1.5 pr-3">{t("affName")}</th>
                <th className="py-1.5 pr-3 text-right">{t("affReferrals")}</th>
                <th className="py-1.5 pr-3 text-right">{t("affEarned")}</th>
                <th className="py-1.5 pr-3 text-right">{t("affPercent")}</th>
                <th className="py-1.5">{t("affLink")}</th>
              </tr>
            </thead>
            <tbody>
              {affiliates.map((a) => (
                <tr key={a.id} className="border-t border-line">
                  <td className="max-w-[160px] truncate py-2.5 pr-3 font-medium text-ink">
                    {a.name ?? a.referral_code}
                  </td>
                  <td className="py-2.5 pr-3 text-right text-ink-soft">
                    {a.referrals}
                  </td>
                  <td className="py-2.5 pr-3 text-right font-semibold text-ink">
                    {a.earned.toLocaleString()} {currency}
                  </td>
                  <td className="py-2.5 pr-3 text-right text-ink-soft">
                    {a.commission_percent}%
                  </td>
                  <td className="py-2.5">
                    {a.referral_code && (
                      <button
                        onClick={() => copyLink(a.referral_code!)}
                        className="rounded-control border border-primary-600 px-3 py-1.5 text-xs font-semibold text-primary-700 hover:bg-primary-50"
                      >
                        {copied === a.referral_code ? `✓ ${t("copied")}` : `🔗 ${t("copyLink")}`}
                      </button>
                    )}
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

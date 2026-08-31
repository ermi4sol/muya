"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

/** Settings → Payout: saved default payout account. */
export function PayoutDetailsForm({
  initial,
}: {
  initial: Record<string, string>;
}) {
  const t = useTranslations("income");
  const td = useTranslations("dash");
  const [method, setMethod] = useState(initial.method ?? "telebirr");
  const [accountName, setAccountName] = useState(initial.account_name ?? "");
  const [accountNumber, setAccountNumber] = useState(initial.account_number ?? "");
  const [bankName, setBankName] = useState(initial.bank_name ?? "");
  const [state, setState] = useState<"idle" | "busy" | "saved">("idle");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setState("busy");
    const res = await fetch("/api/creator/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        payout_details: {
          method,
          account_name: accountName,
          account_number: accountNumber,
          bank_name: method === "bank" ? bankName : "",
        },
      }),
    });
    setState(res.ok ? "saved" : "idle");
    if (res.ok) setTimeout(() => setState("idle"), 2000);
  }

  const input =
    "mt-1.5 w-full rounded-control border border-line bg-surface px-3.5 py-3 text-ink outline-none focus:border-primary-500";
  const label = "block text-sm font-medium text-ink-soft";

  return (
    <form onSubmit={save} className="space-y-3">
      <div>
        <p className={label}>{t("method")}</p>
        <div className="mt-1.5 flex gap-2">
          {(["telebirr", "bank"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMethod(m)}
              className={`flex-1 rounded-control border-2 px-3 py-2.5 text-sm font-semibold ${
                method === m
                  ? "border-primary-600 bg-primary-50 text-primary-700"
                  : "border-line text-ink-soft"
              }`}
            >
              {m === "telebirr" ? "📱 telebirr" : `🏦 ${t("bank")}`}
            </button>
          ))}
        </div>
      </div>
      <label className={label}>
        {t("accountName")}
        <input
          value={accountName}
          maxLength={80}
          onChange={(e) => setAccountName(e.target.value)}
          className={input}
        />
      </label>
      <label className={label}>
        {t("accountNumber")}
        <input
          value={accountNumber}
          maxLength={40}
          onChange={(e) => setAccountNumber(e.target.value)}
          className={input}
        />
      </label>
      {method === "bank" && (
        <label className={label}>
          {t("bankName")}
          <input
            value={bankName}
            maxLength={80}
            onChange={(e) => setBankName(e.target.value)}
            className={input}
          />
        </label>
      )}
      <button
        disabled={state === "busy"}
        className="rounded-control bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-card hover:bg-primary-700 disabled:opacity-60"
      >
        {state === "saved" ? `✓ ${td("saved")}` : td("save")}
      </button>
    </form>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export function PayoutSheet({
  available,
  currency,
}: {
  available: number;
  currency: string;
}) {
  const t = useTranslations("income");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(available || ""));
  const [method, setMethod] = useState<"bank" | "telebirr">("telebirr");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  const input =
    "w-full rounded-control border border-line px-3.5 py-3 text-sm text-ink outline-none focus:border-primary-500";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("busy");
    setError(null);
    const res = await fetch("/api/creator/payouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: Number(amount),
        method,
        details: {
          account_name: accountName,
          account_number: accountNumber,
          ...(method === "bank" && bankName ? { bank_name: bankName } : {}),
        },
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok) {
      setState("done");
      setTimeout(() => {
        setOpen(false);
        router.refresh();
      }, 1500);
    } else {
      setState("idle");
      setError(body.error === "insufficient" ? t("insufficient") : t("errGeneric"));
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={available <= 0}
        className="rounded-control bg-primary-600 px-5 py-3 text-sm font-semibold text-white shadow-card hover:bg-primary-700 disabled:opacity-50"
      >
        {t("request")}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
          onClick={() => state !== "busy" && setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-t-3xl bg-surface p-5 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-line" />
            <h2 className="text-lg font-bold text-ink">{t("request")}</h2>

            {state === "done" ? (
              <p className="mt-4 rounded-control bg-green-50 px-4 py-3 text-sm font-semibold text-success">
                ✓ {t("requested")}
              </p>
            ) : (
              <form onSubmit={submit} className="mt-4 space-y-3">
                {error && (
                  <p className="rounded-control bg-red-50 px-3 py-2 text-sm text-danger">
                    {error}
                  </p>
                )}
                <label className="block text-sm font-medium text-ink-soft">
                  {t("amount")} ({currency})
                  <input
                    type="number"
                    min={1}
                    max={available}
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className={`${input} mt-1.5`}
                  />
                </label>
                <div className="flex gap-2">
                  {(["telebirr", "bank"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMethod(m)}
                      className={`flex-1 rounded-control border py-2.5 text-sm font-semibold ${
                        method === m
                          ? "border-primary-600 bg-primary-50 text-primary-800"
                          : "border-line text-ink-soft"
                      }`}
                    >
                      {m === "telebirr" ? "📱 Telebirr" : `🏦 ${t("bank")}`}
                    </button>
                  ))}
                </div>
                <input
                  required
                  placeholder={t("accountName")}
                  value={accountName}
                  maxLength={80}
                  onChange={(e) => setAccountName(e.target.value)}
                  className={input}
                />
                <input
                  required
                  placeholder={method === "telebirr" ? t("phoneNumber") : t("accountNumber")}
                  value={accountNumber}
                  maxLength={40}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className={input}
                />
                {method === "bank" && (
                  <input
                    placeholder={t("bankName")}
                    value={bankName}
                    maxLength={80}
                    onChange={(e) => setBankName(e.target.value)}
                    className={input}
                  />
                )}
                <button
                  disabled={state === "busy"}
                  className="w-full rounded-control bg-primary-600 py-3.5 font-semibold text-white shadow-card disabled:opacity-60"
                >
                  {state === "busy" ? "…" : t("submit")}
                </button>
                <p className="text-center text-xs text-ink-faint">{t("note")}</p>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

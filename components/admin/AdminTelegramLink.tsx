"use client";

import { useState } from "react";

/** Links the admin's Telegram account for bot alerts (new orders, payouts, products). */
export function AdminTelegramLink({ current }: { current: string | null }) {
  const [value, setValue] = useState(current ?? "");
  const [state, setState] = useState<"idle" | "busy" | "saved" | "error">("idle");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setState("busy");
    const res = await fetch("/api/admin/telegram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telegram_user_id: value.trim() || null }),
    });
    setState(res.ok ? "saved" : "error");
    if (res.ok) setTimeout(() => setState("idle"), 2000);
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
        Telegram alerts
      </p>
      <p className="mt-1 text-sm text-neutral-600">
        Get new-order, payout and new-product alerts from @MuyaOfficialBot. Send{" "}
        <code className="rounded bg-neutral-100 px-1">/id</code> to the bot to see
        your numeric Telegram ID, then paste it here.
      </p>
      <form onSubmit={save} className="mt-3 flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))}
          placeholder="e.g. 123456789"
          className="w-56 rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
        />
        <button
          disabled={state === "busy"}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {state === "saved" ? "✓ Saved" : state === "busy" ? "…" : "Save"}
        </button>
      </form>
      {state === "error" && (
        <p className="mt-2 text-xs text-red-600">Could not save — try again.</p>
      )}
      {current && (
        <p className="mt-2 text-xs text-emerald-700">
          Linked to Telegram ID {current} — a test message was sent when you saved.
        </p>
      )}
    </div>
  );
}

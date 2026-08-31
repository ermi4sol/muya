"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";

const TYPE_LABELS: Record<string, string> = {
  digital_product: "📥 Digital product",
  lead_magnet: "🎁 Lead magnet",
  coaching_call: "🗓️ Coaching call",
  course: "🎓 Course",
  webinar: "🎥 Webinar",
  affiliate_link: "🤝 Affiliate link",
  url_media: "🔗 Link / media",
  physical: "🛍️ Physical product",
  custom_product: "✨ Custom product",
};

/** The commission rate control: one % field + nine per-type exclusion toggles. */
export function CommissionControls({
  initialRate,
  initialExclusions,
}: {
  initialRate: number;
  initialExclusions: Record<string, boolean>;
}) {
  const router = useRouter();
  const [rate, setRate] = useState(String(initialRate));
  const [exclusions, setExclusions] = useState(initialExclusions);
  const [state, setState] = useState<"idle" | "busy" | "saved" | "error">("idle");

  async function save() {
    const parsed = Number(rate);
    if (Number.isNaN(parsed) || parsed < 0 || parsed > 100) {
      setState("error");
      return;
    }
    setState("busy");
    const res = await fetch("/api/admin/commission", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commission_percent: parsed, exclusions }),
    });
    setState(res.ok ? "saved" : "error");
    if (res.ok) {
      setTimeout(() => setState("idle"), 2000);
      router.refresh();
    }
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
        Commission rate control
      </p>
      <div className="mt-3 flex items-end gap-3">
        <label className="block text-sm font-medium text-neutral-600">
          Platform commission (%)
          <input
            type="number"
            min={0}
            max={100}
            step="0.5"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            className="mt-1.5 block w-32 rounded-md border border-neutral-300 px-3 py-2.5 text-lg font-bold outline-none focus:border-neutral-900"
          />
        </label>
        <p className="pb-2 text-xs text-neutral-500">
          Applied to every newly approved order (existing orders keep their
          recorded commission).
        </p>
      </div>

      <p className="mt-5 text-xs font-medium uppercase tracking-wide text-neutral-400">
        Per-type exclusions — excluded types pay NO commission
      </p>
      <div className="mt-2 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(TYPE_LABELS).map(([type, label]) => (
          <label
            key={type}
            className={`flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm ${
              exclusions[type]
                ? "border-amber-300 bg-amber-50"
                : "border-neutral-200"
            }`}
          >
            <span className="font-medium text-neutral-800">{label}</span>
            <input
              type="checkbox"
              checked={exclusions[type] ?? false}
              onChange={(e) =>
                setExclusions((x) => ({ ...x, [type]: e.target.checked }))
              }
              className="h-4 w-4"
            />
          </label>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={save}
          disabled={state === "busy"}
          className="rounded-md bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60"
        >
          {state === "saved" ? "✓ Saved" : state === "busy" ? "…" : "Save changes"}
        </button>
        {state === "error" && (
          <p className="text-sm text-red-600">Could not save — check the rate.</p>
        )}
      </div>
    </div>
  );
}

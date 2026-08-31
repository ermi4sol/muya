"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

type Step = { message: string; delay_hours: number };

export type FunnelRow = {
  id: string;
  name: string;
  status: string;
  trigger_product_id: string | null;
  steps: Step[];
  enrolled: number;
};

export type TriggerOption = { id: string; title: string };

/** Funnels tab (UI page 31): list + linear sequence builder. */
export function FunnelManager({
  funnels,
  triggerOptions,
}: {
  funnels: FunnelRow[];
  triggerOptions: TriggerOption[];
}) {
  const t = useTranslations("growth");
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || busy) return;
    setBusy(true);
    const res = await fetch("/api/creator/funnels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });
    setBusy(false);
    if (res.ok) {
      setNewName("");
      router.refresh();
    }
  }

  const input =
    "rounded-control border border-line bg-surface px-3.5 py-3 text-sm text-ink outline-none focus:border-primary-500";

  return (
    <div className="space-y-4">
      <form
        onSubmit={create}
        className="flex items-end gap-2 rounded-card border border-line bg-surface p-4 shadow-card"
      >
        <label className="block min-w-0 flex-1 text-sm font-medium text-ink-soft">
          {t("funnelName")}
          <input
            value={newName}
            maxLength={80}
            onChange={(e) => setNewName(e.target.value)}
            className={`${input} mt-1.5 w-full`}
            placeholder={t("funnelNamePh")}
          />
        </label>
        <button
          disabled={busy || !newName.trim()}
          className="rounded-control bg-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-card hover:bg-primary-700 disabled:opacity-60"
        >
          + {t("newFunnel")}
        </button>
      </form>

      {funnels.length === 0 ? (
        <p className="rounded-card border border-line bg-surface p-6 text-sm text-ink-soft shadow-card">
          {t("funnelsEmpty")}
        </p>
      ) : (
        <div className="space-y-3">
          {funnels.map((f) => (
            <div key={f.id} className="rounded-card border border-line bg-surface shadow-card">
              <button
                onClick={() => setOpenId(openId === f.id ? null : f.id)}
                className="flex w-full items-center justify-between p-4 text-left"
              >
                <div>
                  <p className="font-semibold text-ink">{f.name}</p>
                  <p className="text-xs text-ink-faint">
                    {t("stepsCount", { n: f.steps.length })} ·{" "}
                    {t("enrolledCount", { n: f.enrolled })}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    f.status === "active"
                      ? "bg-green-50 text-success"
                      : "bg-line/50 text-ink-faint"
                  }`}
                >
                  {f.status}
                </span>
              </button>
              {openId === f.id && (
                <FunnelEditor funnel={f} triggerOptions={triggerOptions} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FunnelEditor({
  funnel,
  triggerOptions,
}: {
  funnel: FunnelRow;
  triggerOptions: TriggerOption[];
}) {
  const t = useTranslations("growth");
  const router = useRouter();
  const [steps, setSteps] = useState<Step[]>(funnel.steps ?? []);
  const [trigger, setTrigger] = useState(funnel.trigger_product_id ?? "");
  const [status, setStatus] = useState(funnel.status);
  const [state, setState] = useState<"idle" | "busy" | "saved">("idle");

  async function save() {
    setState("busy");
    const res = await fetch("/api/creator/funnels", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: funnel.id,
        status,
        trigger_product_id: trigger || null,
        steps: steps.filter((s) => s.message.trim()),
      }),
    });
    setState(res.ok ? "saved" : "idle");
    if (res.ok) {
      setTimeout(() => setState("idle"), 1500);
      router.refresh();
    }
  }

  async function remove() {
    if (!window.confirm(t("funnelDeleteConfirm"))) return;
    await fetch(`/api/creator/funnels?id=${funnel.id}`, { method: "DELETE" });
    router.refresh();
  }

  const input =
    "w-full rounded-control border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary-500";

  return (
    <div className="space-y-3 border-t border-line p-4">
      <div className="flex flex-wrap gap-3">
        <label className="block min-w-[200px] flex-1 text-sm font-medium text-ink-soft">
          {t("funnelTrigger")}
          <select
            value={trigger}
            onChange={(e) => setTrigger(e.target.value)}
            className={`${input} mt-1.5`}
          >
            <option value="">{t("anyPurchase")}</option>
            {triggerOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </label>
        <label className="block w-36 text-sm font-medium text-ink-soft">
          {t("funnelStatus")}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={`${input} mt-1.5`}
          >
            <option value="draft">draft</option>
            <option value="active">active</option>
            <option value="archived">archived</option>
          </select>
        </label>
      </div>

      {/* Linear sequence */}
      <div className="space-y-2.5">
        {steps.map((s, i) => (
          <div key={i} className="rounded-control border border-line bg-bg p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-primary-700">
                {t("step")} {i + 1}
              </p>
              <button
                onClick={() => setSteps(steps.filter((_, j) => j !== i))}
                className="px-1 text-ink-faint hover:text-danger"
              >
                ✕
              </button>
            </div>
            <textarea
              rows={2}
              maxLength={1500}
              value={s.message}
              placeholder={t("stepMessagePh")}
              onChange={(e) =>
                setSteps(steps.map((x, j) => (j === i ? { ...x, message: e.target.value } : x)))
              }
              className={`${input} mt-1.5`}
            />
            <label className="mt-1.5 flex items-center gap-2 text-xs text-ink-soft">
              {t("stepDelay")}
              <input
                type="number"
                min={0}
                max={720}
                value={s.delay_hours}
                onChange={(e) =>
                  setSteps(
                    steps.map((x, j) =>
                      j === i ? { ...x, delay_hours: Number(e.target.value) } : x
                    )
                  )
                }
                className="w-20 rounded-control border border-line px-2 py-1.5"
              />
              {t("hours")}
            </label>
            {i < steps.length - 1 && (
              <p className="mt-1.5 text-center text-ink-faint">↓</p>
            )}
          </div>
        ))}
        {steps.length < 10 && (
          <button
            onClick={() => setSteps([...steps, { message: "", delay_hours: 24 }])}
            className="text-sm font-semibold text-primary-700"
          >
            + {t("addStep")}
          </button>
        )}
      </div>

      <div className="flex gap-2 border-t border-line pt-3">
        <button
          onClick={save}
          disabled={state === "busy"}
          className="rounded-control bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-card hover:bg-primary-700 disabled:opacity-60"
        >
          {state === "saved" ? "✓" : t("save")}
        </button>
        <button
          onClick={remove}
          className="ml-auto rounded-control px-3 py-2.5 text-sm font-semibold text-danger hover:bg-red-50"
        >
          {t("delete")}
        </button>
      </div>
    </div>
  );
}

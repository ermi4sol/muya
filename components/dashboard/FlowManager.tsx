"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

type Block = { type: "text" | "button"; text: string; url?: string };

export type FlowRow = {
  id: string;
  name: string;
  status: string;
  blocks: Block[];
  scheduled_at: string | null;
  sent_at: string | null;
  recipients_count: number;
};

/** Telegram Flows tab (UI page 34): broadcasts with block editor + Telegram-style preview. */
export function FlowManager({
  flows,
  creatorName,
}: {
  flows: FlowRow[];
  creatorName: string;
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
    const res = await fetch("/api/creator/flows", {
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

  const badge = (status: string) =>
    status === "sent"
      ? "bg-green-50 text-success"
      : status === "scheduled"
        ? "bg-amber-50 text-warning"
        : "bg-line/50 text-ink-faint";

  return (
    <div className="space-y-4">
      <form
        onSubmit={create}
        className="flex items-end gap-2 rounded-card border border-line bg-surface p-4 shadow-card"
      >
        <label className="block min-w-0 flex-1 text-sm font-medium text-ink-soft">
          {t("flowName")}
          <input
            value={newName}
            maxLength={80}
            onChange={(e) => setNewName(e.target.value)}
            className={`${input} mt-1.5 w-full`}
            placeholder={t("flowNamePh")}
          />
        </label>
        <button
          disabled={busy || !newName.trim()}
          className="rounded-control bg-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-card hover:bg-primary-700 disabled:opacity-60"
        >
          + {t("newFlow")}
        </button>
      </form>

      {flows.length === 0 ? (
        <p className="rounded-card border border-line bg-surface p-6 text-sm text-ink-soft shadow-card">
          {t("flowsEmpty")}
        </p>
      ) : (
        <div className="space-y-3">
          {flows.map((f) => (
            <div key={f.id} className="rounded-card border border-line bg-surface shadow-card">
              <button
                onClick={() => setOpenId(openId === f.id ? null : f.id)}
                className="flex w-full items-center justify-between p-4 text-left"
              >
                <div>
                  <p className="font-semibold text-ink">{f.name}</p>
                  <p className="text-xs text-ink-faint">
                    {f.status === "sent"
                      ? t("sentTo", { n: f.recipients_count })
                      : f.status === "scheduled" && f.scheduled_at
                        ? `⏰ ${new Date(f.scheduled_at).toLocaleString()}`
                        : t("draft")}
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badge(f.status)}`}>
                  {f.status}
                </span>
              </button>
              {openId === f.id && <FlowEditor flow={f} creatorName={creatorName} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FlowEditor({ flow, creatorName }: { flow: FlowRow; creatorName: string }) {
  const t = useTranslations("growth");
  const router = useRouter();
  const [blocks, setBlocks] = useState<Block[]>(
    flow.blocks?.length ? flow.blocks : [{ type: "text", text: "" }]
  );
  const [scheduleAt, setScheduleAt] = useState("");
  const [state, setState] = useState<"idle" | "busy">("idle");
  const [feedback, setFeedback] = useState<string | null>(null);
  const locked = flow.status === "sent";

  async function act(action: "save" | "schedule" | "send_now" | "unschedule") {
    if (state === "busy") return;
    if (action === "send_now" && !window.confirm(t("sendNowConfirm"))) return;
    setState("busy");
    setFeedback(null);
    const res = await fetch("/api/creator/flows", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: flow.id,
        action,
        blocks: blocks.filter((b) => b.text.trim()),
        ...(action === "schedule" && scheduleAt
          ? { scheduled_at: new Date(scheduleAt).toISOString() }
          : {}),
      }),
    });
    const body = await res.json().catch(() => ({}));
    setState("idle");
    if (res.ok) {
      setFeedback(
        action === "send_now" ? t("sentTo", { n: body.sent ?? 0 }) : `✓ ${t("save")}`
      );
      router.refresh();
    } else {
      setFeedback(t("errGeneric"));
    }
  }

  async function remove() {
    if (!window.confirm(t("flowDeleteConfirm"))) return;
    await fetch(`/api/creator/flows?id=${flow.id}`, { method: "DELETE" });
    router.refresh();
  }

  const input =
    "w-full rounded-control border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary-500";

  return (
    <div className="border-t border-line p-4">
      <div className="gap-5 md:grid md:grid-cols-2">
        {/* block editor */}
        <div className="space-y-2.5">
          {blocks.map((b, i) => (
            <div key={i} className="rounded-control border border-line bg-bg p-3">
              <div className="flex items-center justify-between">
                <select
                  disabled={locked}
                  value={b.type}
                  onChange={(e) =>
                    setBlocks(
                      blocks.map((x, j) =>
                        j === i ? { ...x, type: e.target.value as Block["type"] } : x
                      )
                    )
                  }
                  className="rounded-control border border-line px-2 py-1 text-xs"
                >
                  <option value="text">💬 {t("blockText")}</option>
                  <option value="button">🔘 {t("blockButton")}</option>
                </select>
                <button
                  onClick={() => setBlocks(blocks.filter((_, j) => j !== i))}
                  disabled={locked}
                  className="px-1 text-ink-faint hover:text-danger"
                >
                  ✕
                </button>
              </div>
              {b.type === "text" ? (
                <textarea
                  rows={3}
                  disabled={locked}
                  maxLength={1500}
                  value={b.text}
                  placeholder={t("blockTextPh")}
                  onChange={(e) =>
                    setBlocks(blocks.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))
                  }
                  className={`${input} mt-1.5`}
                />
              ) : (
                <>
                  <input
                    disabled={locked}
                    maxLength={40}
                    value={b.text}
                    placeholder={t("blockButtonPh")}
                    onChange={(e) =>
                      setBlocks(blocks.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))
                    }
                    className={`${input} mt-1.5`}
                  />
                  <input
                    disabled={locked}
                    type="url"
                    maxLength={500}
                    value={b.url ?? ""}
                    placeholder="https://…"
                    onChange={(e) =>
                      setBlocks(blocks.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))
                    }
                    className={`${input} mt-1.5`}
                  />
                </>
              )}
            </div>
          ))}
          {!locked && blocks.length < 12 && (
            <button
              onClick={() => setBlocks([...blocks, { type: "text", text: "" }])}
              className="text-sm font-semibold text-primary-700"
            >
              + {t("addBlock")}
            </button>
          )}
        </div>

        {/* Telegram-style preview */}
        <div className="mt-4 md:mt-0">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">
            {t("tgPreview")}
          </p>
          <div className="rounded-2xl bg-[#8babd8]/30 p-4">
            <div className="max-w-[280px] rounded-2xl rounded-tl-sm bg-white p-3 shadow">
              <p className="text-xs font-bold text-[#3390ec]">MUYA</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-900">
                {blocks
                  .filter((b) => b.type === "text" && b.text.trim())
                  .map((b) => b.text)
                  .join("\n\n") || t("blockTextPh")}
                {"\n\n"}— {creatorName}
              </p>
              <p className="mt-1 text-right text-[10px] text-neutral-400">
                {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
            {blocks
              .filter((b) => b.type === "button" && b.text.trim())
              .map((b, i) => (
                <div
                  key={i}
                  className="mx-auto mt-1.5 max-w-[280px] rounded-xl bg-white/80 py-2 text-center text-sm font-medium text-[#3390ec]"
                >
                  {b.text}
                </div>
              ))}
          </div>
        </div>
      </div>

      {feedback && (
        <p className="mt-3 rounded-control bg-primary-50 px-3 py-2 text-sm text-primary-800">
          {feedback}
        </p>
      )}

      {!locked && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3">
          <button
            onClick={() => act("save")}
            disabled={state === "busy"}
            className="rounded-control border border-primary-600 px-4 py-2.5 text-sm font-semibold text-primary-700 hover:bg-primary-50 disabled:opacity-60"
          >
            {t("save")}
          </button>
          <button
            onClick={() => act("send_now")}
            disabled={state === "busy"}
            className="rounded-control bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-card hover:bg-primary-700 disabled:opacity-60"
          >
            ✈️ {t("sendNow")}
          </button>
          <div className="flex items-center gap-1.5">
            <input
              type="datetime-local"
              value={scheduleAt}
              onChange={(e) => setScheduleAt(e.target.value)}
              className="rounded-control border border-line px-2.5 py-2 text-sm"
            />
            <button
              onClick={() => act("schedule")}
              disabled={state === "busy" || !scheduleAt}
              className="rounded-control border border-line px-3 py-2.5 text-sm font-semibold text-ink-soft hover:border-primary-600 hover:text-primary-700 disabled:opacity-60"
            >
              ⏰ {t("schedule")}
            </button>
          </div>
          {flow.status === "scheduled" && (
            <button
              onClick={() => act("unschedule")}
              className="rounded-control px-3 py-2.5 text-sm font-semibold text-warning hover:bg-amber-50"
            >
              {t("unschedule")}
            </button>
          )}
          <button
            onClick={remove}
            className="ml-auto rounded-control px-3 py-2.5 text-sm font-semibold text-danger hover:bg-red-50"
          >
            {t("delete")}
          </button>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

interface ModPost {
  id: string;
  body: string | null;
  reported: boolean;
  reportReason: string | null;
  removed: boolean;
  createdAt: string;
  authorEmail: string;
}

export function ModerationList({
  productId,
  posts,
}: {
  productId: string;
  posts: ModPost[];
}) {
  const t = useTranslations("community");
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function act(postId: string, action: "remove" | "restore") {
    setBusy(postId);
    await fetch(`/api/creator/community/${productId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId, action }),
    });
    setBusy(null);
    router.refresh();
  }

  if (posts.length === 0) {
    return (
      <p className="mt-4 rounded-card border border-line bg-surface p-6 text-center text-sm text-ink-soft shadow-card">
        {t("empty")}
      </p>
    );
  }

  return (
    <ul className="mt-4 space-y-2">
      {posts.map((p) => (
        <li
          key={p.id}
          className={`rounded-card border p-3.5 shadow-card ${
            p.removed
              ? "border-line bg-bg opacity-60"
              : p.reported
                ? "border-danger/40 bg-red-50/40"
                : "border-line bg-surface"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-ink-faint">
            <span>{p.authorEmail}</span>
            <span>{new Date(p.createdAt).toLocaleString()}</span>
          </div>
          <p className="mt-1 whitespace-pre-line text-sm text-ink">{p.body}</p>
          {p.reported && !p.removed && (
            <p className="mt-1 text-xs font-semibold text-danger">
              ⚠️ {t("flagLabel")}: {p.reportReason ?? "—"}
            </p>
          )}
          <div className="mt-2">
            {p.removed ? (
              <button
                onClick={() => act(p.id, "restore")}
                disabled={busy === p.id}
                className="rounded-control border border-line px-3 py-1.5 text-xs font-semibold text-ink-soft"
              >
                {t("restore")}
              </button>
            ) : (
              <button
                onClick={() => act(p.id, "remove")}
                disabled={busy === p.id}
                className="rounded-control border border-danger/40 px-3 py-1.5 text-xs font-semibold text-danger hover:bg-red-50"
              >
                {t("remove")}
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

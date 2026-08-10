"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { FeedPost } from "@/lib/db/community";

export function CommunityFeed({
  orderId,
  initialPosts,
  communityName,
}: {
  orderId: string;
  initialPosts: FeedPost[];
  communityName: string;
}) {
  const t = useTranslations("community");
  const [posts, setPosts] = useState<FeedPost[]>(initialPosts);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [openComments, setOpenComments] = useState<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/community/${orderId}`);
      if (res.ok) {
        const body = await res.json();
        if (body.posts) setPosts(body.posts);
      }
    } catch { /* offline — keep current */ }
  }, [orderId]);

  // Poll every 8s — feels live without websockets
  useEffect(() => {
    const timer = setInterval(refresh, 8000);
    return () => clearInterval(timer);
  }, [refresh]);

  async function submitPost(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim() || busy) return;
    setBusy(true);
    await fetch(`/api/community/${orderId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: draft.trim() }),
    });
    setDraft("");
    setBusy(false);
    refresh();
  }

  async function act(postId: string, action: string, body?: string) {
    await fetch(`/api/community/${orderId}/posts/${postId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, body }),
    });
    refresh();
  }

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <h1 className="font-heading text-xl font-bold text-ink">💬 {communityName}</h1>

      {/* Composer */}
      <form onSubmit={submitPost} className="mt-4 rounded-card border border-line bg-surface p-3 shadow-card">
        <textarea
          rows={2}
          maxLength={2000}
          placeholder={t("placeholder")}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="w-full resize-none rounded-control border border-line px-3 py-2.5 text-sm outline-none focus:border-primary-500"
        />
        <div className="mt-2 flex justify-end">
          <button
            disabled={!draft.trim() || busy}
            className="rounded-control bg-primary-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {t("post")}
          </button>
        </div>
      </form>

      {/* Feed */}
      <div className="mt-4 space-y-3">
        {posts.length === 0 && (
          <p className="rounded-card border border-line bg-surface p-6 text-center text-sm text-ink-soft shadow-card">
            {t("empty")}
          </p>
        )}
        {posts.map((p) => (
          <div key={p.id} className="rounded-card border border-line bg-surface p-4 shadow-card">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-ink">{p.authorName}</p>
              <p className="text-xs text-ink-faint">
                {new Date(p.createdAt).toLocaleString()}
              </p>
            </div>
            <p className="mt-1.5 whitespace-pre-line text-[15px] text-ink">{p.body}</p>
            <div className="mt-2.5 flex items-center gap-4 text-sm">
              <button
                onClick={() => act(p.id, p.likedByMe ? "unlike" : "like")}
                className={`font-medium ${p.likedByMe ? "text-primary-700" : "text-ink-faint"}`}
              >
                {p.likedByMe ? "❤️" : "🤍"} {p.likes}
              </button>
              <button
                onClick={() =>
                  setOpenComments((s) => {
                    const next = new Set(s);
                    if (next.has(p.id)) next.delete(p.id);
                    else next.add(p.id);
                    return next;
                  })
                }
                className="font-medium text-ink-faint"
              >
                💬 {p.comments.length}
              </button>
              {p.mine ? (
                <button onClick={() => act(p.id, "delete")} className="ml-auto text-xs text-ink-faint hover:text-danger">
                  {t("delete")}
                </button>
              ) : (
                <button onClick={() => act(p.id, "report")} className="ml-auto text-xs text-ink-faint hover:text-danger">
                  {p.reported ? t("reported") : t("report")}
                </button>
              )}
            </div>

            {openComments.has(p.id) && (
              <div className="mt-3 border-t border-line pt-2">
                {p.comments.map((c) => (
                  <div key={c.id} className="py-1.5">
                    <p className="text-xs font-semibold text-ink">{c.authorName}</p>
                    <p className="text-sm text-ink-soft">{c.body}</p>
                  </div>
                ))}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const val = commentDrafts[p.id]?.trim();
                    if (val) {
                      act(p.id, "comment", val);
                      setCommentDrafts((d) => ({ ...d, [p.id]: "" }));
                    }
                  }}
                  className="mt-1.5 flex gap-2"
                >
                  <input
                    maxLength={1000}
                    placeholder={t("commentPlaceholder")}
                    value={commentDrafts[p.id] ?? ""}
                    onChange={(e) =>
                      setCommentDrafts((d) => ({ ...d, [p.id]: e.target.value }))
                    }
                    className="min-w-0 flex-1 rounded-control border border-line px-3 py-2 text-sm outline-none focus:border-primary-500"
                  />
                  <button className="rounded-control bg-primary-50 px-3 py-2 text-sm font-semibold text-primary-700">
                    ↑
                  </button>
                </form>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

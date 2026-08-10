"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SafetyActions({
  postId,
  communityId,
  communityFrozen,
}: {
  postId: string | null;
  communityId: string | null;
  communityFrozen: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function act(action: string, id: string) {
    if (action === "freeze" && !window.confirm("Freeze this community? All members lose access until unfrozen.")) return;
    setBusy(true);
    await fetch("/api/admin/safety", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, id }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {postId && (
        <>
          <button
            onClick={() => act("remove_post", postId)}
            disabled={busy}
            className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
          >
            Remove post
          </button>
          <button
            onClick={() => act("approve_post", postId)}
            disabled={busy}
            className="rounded-md border border-emerald-300 px-3 py-1.5 text-xs font-semibold text-emerald-700 disabled:opacity-60"
          >
            Keep (clear report)
          </button>
        </>
      )}
      {communityId && (
        <button
          onClick={() => act(communityFrozen ? "unfreeze" : "freeze", communityId)}
          disabled={busy}
          className={`rounded-md border px-3 py-1.5 text-xs font-semibold disabled:opacity-60 ${
            communityFrozen
              ? "border-emerald-300 text-emerald-700"
              : "border-neutral-300 text-neutral-600 hover:border-red-300 hover:text-red-600"
          }`}
        >
          {communityFrozen ? "Unfreeze community" : "Freeze community"}
        </button>
      )}
    </div>
  );
}

"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";

export function ImageUpload({
  value,
  onUploaded,
}: {
  value: string | null;
  onUploaded: (url: string) => void;
}) {
  const t = useTranslations("dash");
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch("/api/creator/upload", {
        method: "POST",
        body: form,
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.url) onUploaded(body.url);
      else setError(t("errGeneric"));
    } catch {
      setError(t("errGeneric"));
    }
    setBusy(false);
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-line bg-primary-50 text-2xl">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="h-full w-full object-cover" />
        ) : (
          "🏪"
        )}
      </div>
      <div>
        <button
          type="button"
          disabled={busy}
          onClick={() => input.current?.click()}
          className="rounded-control border border-primary-600 px-3 py-2 text-sm font-semibold text-primary-700 hover:bg-primary-50 disabled:opacity-60"
        >
          {busy ? "…" : value ? t("changePhoto") : t("uploadPhoto")}
        </button>
        {error && <p className="mt-1 text-xs text-danger">{error}</p>}
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { ImageUpload } from "@/components/dashboard/ImageUpload";

export default function OnboardingPage() {
  const t = useTranslations("dash");
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [bio, setBio] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/creator/profile")
      .then((r) => r.json())
      .then((b) => {
        if (b.creator) {
          setSlug(b.creator.store_slug ?? "");
          setName(b.creator.display_name ?? "");
          setBio(b.creator.bio ?? "");
          setPhoto(b.creator.profile_image_url);
        }
      })
      .catch(() => {});
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/creator/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        display_name: name,
        store_slug: slug,
        bio: bio || undefined,
        ...(photo ? { profile_image_url: photo } : {}),
      }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) {
      router.push("/dashboard");
      router.refresh();
    } else if (body.error === "slug_taken") {
      setError(t("slugTaken"));
    } else {
      setError(t("errGeneric"));
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="font-heading text-2xl font-bold text-ink">
        {t("obTitle")}
      </h1>
      <p className="mt-1 text-sm text-ink-soft">{t("obSub")}</p>

      <form
        onSubmit={save}
        className="mt-6 space-y-4 rounded-card border border-line bg-surface p-5 shadow-card"
      >
        {error && (
          <p className="rounded-control bg-red-50 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
        <ImageUpload value={photo} onUploaded={setPhoto} />
        <label className="block text-sm font-medium text-ink-soft">
          {t("storeName")}
          <input
            required
            maxLength={60}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1.5 w-full rounded-control border border-line bg-surface px-3.5 py-3 text-ink outline-none focus:border-primary-500"
          />
        </label>
        <label className="block text-sm font-medium text-ink-soft">
          {t("storeLink")}
          <div className="mt-1.5 flex items-center rounded-control border border-line bg-surface focus-within:border-primary-500">
            <span className="pl-3.5 text-sm text-ink-faint">muya.app/</span>
            <input
              required
              minLength={3}
              maxLength={30}
              pattern="[a-z0-9][a-z0-9\-]*[a-z0-9]"
              value={slug}
              onChange={(e) =>
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
              }
              className="w-full bg-transparent py-3 pr-3.5 text-ink outline-none"
            />
          </div>
        </label>
        <label className="block text-sm font-medium text-ink-soft">
          {t("bio")}
          <textarea
            rows={3}
            maxLength={300}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="mt-1.5 w-full rounded-control border border-line bg-surface px-3.5 py-3 text-ink outline-none focus:border-primary-500"
          />
        </label>
        <button
          disabled={busy || !name || slug.length < 3}
          className="w-full rounded-control bg-primary-600 py-3.5 font-semibold text-white shadow-card hover:bg-primary-700 disabled:opacity-60"
        >
          {busy ? "…" : t("saveContinue")}
        </button>
      </form>
    </div>
  );
}

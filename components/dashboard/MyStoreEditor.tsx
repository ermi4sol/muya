"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ImageUpload } from "@/components/dashboard/ImageUpload";
import { THEME_PRESETS, type ThemePresetKey } from "@/lib/themes";
import type { CreatorFull, ProductRow } from "@/lib/db/creator";

const SOCIALS = ["tiktok", "instagram", "youtube", "telegram"] as const;
const TYPE_ICONS: Record<string, string> = {
  digital_download: "📥", course: "🎓", coaching_call: "🗓️", webinar: "🎥",
  membership: "⭐", lead_magnet: "🎁", custom_product: "✨", external_link: "🔗",
  community: "💬", physical: "🛍️",
};

export function MyStoreEditor({
  creator,
  products,
  initialTab,
}: {
  creator: CreatorFull;
  products: ProductRow[];
  initialTab?: string;
}) {
  const t = useTranslations("dash");
  const [tab, setTab] = useState<"profile" | "design" | "products">(
    initialTab === "products" ? "products" : initialTab === "design" ? "design" : "profile"
  );

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold text-ink">
          {t("navStore")}
        </h1>
        <Link
          href="/dashboard/preview"
          className="rounded-control border border-primary-600 px-3 py-2 text-sm font-semibold text-primary-700 hover:bg-primary-50"
        >
          {t("preview")}
        </Link>
      </div>

      <div className="mt-4 flex gap-1 rounded-card border border-line bg-surface p-1 shadow-card">
        {(
          [
            ["profile", t("tabProfile")],
            ["design", t("tabDesign")],
            ["products", t("tabProducts")],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`flex-1 rounded-control py-2 text-sm font-semibold ${
              tab === k ? "bg-primary-600 text-white" : "text-ink-soft hover:bg-primary-50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {tab === "profile" && <ProfileTab creator={creator} />}
        {tab === "design" && <DesignTab creator={creator} />}
        {tab === "products" && <ProductsTab initial={products} />}
      </div>
    </div>
  );
}

function ProfileTab({ creator }: { creator: CreatorFull }) {
  const t = useTranslations("dash");
  const [name, setName] = useState(creator.display_name ?? "");
  const [slug, setSlug] = useState(creator.store_slug);
  const [bio, setBio] = useState(creator.bio ?? "");
  const [photo, setPhoto] = useState<string | null>(creator.profile_image_url);
  const [socials, setSocials] = useState<Record<string, string>>(
    creator.social_links ?? {}
  );
  const [state, setState] = useState<"idle" | "busy" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setState("busy");
    setError(null);
    const res = await fetch("/api/creator/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        display_name: name,
        store_slug: slug,
        bio,
        social_links: socials,
        ...(photo ? { profile_image_url: photo } : {}),
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok) {
      setState("saved");
      setTimeout(() => setState("idle"), 2000);
    } else {
      setState("idle");
      setError(body.error === "slug_taken" ? t("slugTaken") : t("errGeneric"));
    }
  }

  return (
    <form
      onSubmit={save}
      className="space-y-4 rounded-card border border-line bg-surface p-5 shadow-card"
    >
      {error && (
        <p className="rounded-control bg-red-50 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
      <ImageUpload value={photo} onUploaded={setPhoto} />
      <label className="block text-sm font-medium text-ink-soft">
        {t("displayName")}
        <input
          required
          maxLength={60}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1.5 w-full rounded-control border border-line px-3.5 py-3 text-ink outline-none focus:border-primary-500"
        />
      </label>
      <label className="block text-sm font-medium text-ink-soft">
        {t("storeLink")}
        <div className="mt-1.5 flex items-center rounded-control border border-line focus-within:border-primary-500">
          <span className="pl-3.5 text-sm text-ink-faint">muya.app/</span>
          <input
            required
            minLength={3}
            maxLength={30}
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
          className="mt-1.5 w-full rounded-control border border-line px-3.5 py-3 text-ink outline-none focus:border-primary-500"
        />
      </label>
      <div>
        <p className="text-sm font-medium text-ink-soft">{t("socials")}</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {SOCIALS.map((s) => (
            <input
              key={s}
              placeholder={`${s}.com/…`}
              value={socials[s] ?? ""}
              onChange={(e) =>
                setSocials({ ...socials, [s]: e.target.value })
              }
              className="rounded-control border border-line px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary-500"
            />
          ))}
        </div>
      </div>
      <button
        disabled={state === "busy"}
        className="w-full rounded-control bg-primary-600 py-3 font-semibold text-white shadow-card hover:bg-primary-700 disabled:opacity-60 sm:w-auto sm:px-6"
      >
        {state === "saved" ? t("saved") : state === "busy" ? "…" : t("save")}
      </button>
    </form>
  );
}

function DesignTab({ creator }: { creator: CreatorFull }) {
  const t = useTranslations("dash");
  const [preset, setPreset] = useState<ThemePresetKey>(
    (creator.theme?.preset as ThemePresetKey) ?? "teal"
  );
  const [state, setState] = useState<"idle" | "busy" | "saved">("idle");

  async function pick(key: ThemePresetKey) {
    setPreset(key);
    setState("busy");
    const res = await fetch("/api/creator/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: { preset: key } }),
    });
    setState(res.ok ? "saved" : "idle");
    if (res.ok) setTimeout(() => setState("idle"), 2000);
  }

  return (
    <div className="rounded-card border border-line bg-surface p-5 shadow-card">
      <p className="font-semibold text-ink">{t("theme")}</p>
      <p className="mt-1 text-sm text-ink-soft">{t("themeSub")}</p>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(Object.keys(THEME_PRESETS) as ThemePresetKey[]).map((key) => {
          const th = THEME_PRESETS[key];
          return (
            <button
              key={key}
              onClick={() => pick(key)}
              className={`rounded-card border-2 p-3 text-left ${
                preset === key ? "border-primary-600" : "border-line"
              }`}
              style={{ background: th.bg }}
            >
              <div
                className="h-8 rounded-lg"
                style={{ background: th.button }}
              />
              <div
                className="mt-2 h-3 w-3/4 rounded"
                style={{ background: th.card, border: "1px solid #00000014" }}
              />
              <p className="mt-2 text-xs font-semibold" style={{ color: th.ink }}>
                {th.name}
              </p>
            </button>
          );
        })}
      </div>
      {state === "saved" && (
        <p className="mt-3 text-sm font-medium text-success">{t("saved")}</p>
      )}
    </div>
  );
}

function ProductsTab({ initial }: { initial: ProductRow[] }) {
  const t = useTranslations("dash");
  const [items, setItems] = useState(initial);

  async function toggle(p: ProductRow) {
    const next = p.status === "active" ? "draft" : "active";
    setItems((xs) =>
      xs.map((x) => (x.id === p.id ? { ...x, status: next } : x))
    );
    await fetch(`/api/products/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
  }

  async function move(index: number, dir: -1 | 1) {
    const j = index + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[index], next[j]] = [next[j], next[index]];
    setItems(next);
    await Promise.all(
      next.map((p, i) =>
        fetch(`/api/products/${p.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sort_order: i }),
        })
      )
    );
  }

  return (
    <div className="rounded-card border border-line bg-surface p-5 shadow-card">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-ink">{t("productsTitle")}</p>
        <span className="rounded-control bg-accent-100 px-3 py-1.5 text-xs font-semibold text-accent-900">
          + {t("addProduct")} · {t("soon")}
        </span>
      </div>
      <p className="mt-2 rounded-control bg-primary-50 px-3 py-2 text-xs text-primary-800">
        {t("productsSoon")}
      </p>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-ink-faint">{t("productsEmpty")}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((p, i) => (
            <li
              key={p.id}
              className="flex items-center gap-3 rounded-control border border-line p-3"
            >
              <span className="text-xl">{TYPE_ICONS[p.type] ?? "📦"}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">
                  {p.title}
                </p>
                <p className="text-xs text-ink-faint">
                  {Number(p.price).toLocaleString()} {p.currency}
                </p>
              </div>
              <button
                onClick={() => toggle(p)}
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  p.status === "active"
                    ? "bg-primary-50 text-primary-800"
                    : "bg-line/50 text-ink-faint"
                }`}
              >
                {p.status === "active" ? t("visible") : t("hidden")}
              </button>
              <div className="flex flex-col">
                <button
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className="px-1 text-ink-faint disabled:opacity-30"
                  aria-label="up"
                >
                  ▲
                </button>
                <button
                  onClick={() => move(i, 1)}
                  disabled={i === items.length - 1}
                  className="px-1 text-ink-faint disabled:opacity-30"
                  aria-label="down"
                >
                  ▼
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

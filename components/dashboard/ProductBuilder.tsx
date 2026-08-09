"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { ImageUpload } from "@/components/dashboard/ImageUpload";

import { TYPE_META } from "@/lib/product-types";

type Attr = { name: string; values: string[] };
type Variant = {
  attribute_values: Record<string, string>;
  sku?: string;
  price_override?: number | null;
  stock_count: number;
  weight_grams?: number | null;
};
type Lesson = { title: string; video_url?: string; text?: string };
type Module = { title: string; lessons: Lesson[] };

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

export interface BuilderInitial {
  id?: string;
  type: string;
  title?: string;
  description?: string;
  price?: number;
  status?: string;
  is_recurring?: boolean;
  billing_interval?: string | null;
  config?: Record<string, unknown>;
  attributes?: Attr[];
  variants?: Variant[];
}

export function ProductBuilder({ initial }: { initial: BuilderInitial }) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const type = initial.type;
  const meta = TYPE_META[type];

  const [title, setTitle] = useState(initial.title ?? "");
  const [description, setDescription] = useState(initial.description ?? "");
  const [price, setPrice] = useState<string>(String(initial.price ?? 0));
  const [interval, setInterval] = useState(initial.billing_interval ?? "monthly");
  const [config, setConfig] = useState<Record<string, unknown>>(
    initial.config ?? {}
  );
  const [attrs, setAttrs] = useState<Attr[]>(initial.attributes ?? []);
  const [variantData, setVariantData] = useState<Record<string, Partial<Variant>>>(
    Object.fromEntries(
      (initial.variants ?? []).map((v) => [JSON.stringify(v.attribute_values), v])
    )
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isFreeType = type === "lead_magnet";
  const isRecurring = type === "membership" || initial.is_recurring;

  const dayLabel = useMemo(() => {
    const base = new Date(Date.UTC(2024, 0, 1)); // a Monday
    const fmt = new Intl.DateTimeFormat(locale, { weekday: "short" });
    return DAYS.map((_, i) => fmt.format(new Date(base.getTime() + i * 86400000)));
  }, [locale]);

  // Cartesian product of attribute values → variant combinations
  const combos = useMemo(() => {
    const valid = attrs.filter((a) => a.name && a.values.length > 0);
    if (valid.length === 0) return [] as Record<string, string>[];
    return valid.reduce<Record<string, string>[]>(
      (acc, a) =>
        acc.flatMap((c) => a.values.map((v) => ({ ...c, [a.name]: v }))),
      [{}]
    );
  }, [attrs]);

  function set(key: string, value: unknown) {
    setConfig((c) => ({ ...c, [key]: value }));
  }

  async function save(status: "active" | "draft") {
    setBusy(true);
    setError(null);
    const variants: Variant[] = combos.map((combo) => {
      const key = JSON.stringify(combo);
      const d = variantData[key] ?? {};
      return {
        attribute_values: combo,
        sku: d.sku || undefined,
        price_override:
          d.price_override != null && !Number.isNaN(d.price_override)
            ? d.price_override
            : null,
        stock_count: d.stock_count ?? 0,
        weight_grams: d.weight_grams ?? null,
      };
    });
    const body = {
      type,
      title,
      description,
      price: isFreeType ? 0 : Number(price) || 0,
      status,
      is_recurring: type === "membership",
      billing_interval: type === "membership" ? interval : null,
      config,
      ...(type === "physical" ? { attributes: attrs.filter((a) => a.name && a.values.length), variants } : {}),
    };
    const res = await fetch(
      initial.id ? `/api/products/${initial.id}` : "/api/products",
      {
        method: initial.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );
    const resBody = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) {
      router.push("/dashboard/store?tab=products");
      router.refresh();
    } else {
      setError(resBody.detail ?? t("dash.errGeneric"));
    }
  }

  async function remove() {
    if (!initial.id) return;
    if (!window.confirm(t("builder.confirmDelete"))) return;
    setBusy(true);
    await fetch(`/api/products/${initial.id}`, { method: "DELETE" });
    router.push("/dashboard/store?tab=products");
    router.refresh();
  }

  const input =
    "mt-1.5 w-full rounded-control border border-line bg-surface px-3.5 py-3 text-ink outline-none focus:border-primary-500";
  const label = "block text-sm font-medium text-ink-soft";

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center gap-3">
        <span className="text-3xl">{meta.icon}</span>
        <div>
          <h1 className="font-heading text-xl font-bold text-ink">
            {initial.id ? t("builder.editProduct") : t("builder.newProduct")} ·{" "}
            {t(meta.nameKey)}
          </h1>
          <p className="text-sm text-ink-faint">{t(meta.descKey)}</p>
        </div>
      </div>

      <div className="mt-5 space-y-4 rounded-card border border-line bg-surface p-5 shadow-card">
        {error && (
          <p className="rounded-control bg-red-50 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        {/* ===== Shared basics ===== */}
        <label className={label}>
          {t("builder.title")}
          <input required maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} className={input} />
        </label>
        <label className={label}>
          {t("builder.description")}
          <textarea rows={3} maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} className={input} />
        </label>

        {type !== "external_link" && (
          <div>
            <p className={label}>{t("builder.image")}</p>
            <div className="mt-1.5">
              <ImageUpload
                value={(config.image_url as string) ?? null}
                onUploaded={(url) => set("image_url", url)}
              />
            </div>
          </div>
        )}

        {!isFreeType && type !== "external_link" && (
          <div className="flex gap-3">
            <label className={`${label} flex-1`}>
              {t("builder.price")} (ETB)
              <input
                type="number" min={0} step="0.01" value={price}
                onChange={(e) => setPrice(e.target.value)}
                className={input} placeholder={t("builder.freePrice")}
              />
            </label>
            {type === "membership" && (
              <label className={`${label} flex-1`}>
                {t("builder.interval")}
                <select value={interval ?? "monthly"} onChange={(e) => setInterval(e.target.value)} className={input}>
                  <option value="weekly">{t("builder.weekly")}</option>
                  <option value="monthly">{t("builder.monthly")}</option>
                  <option value="yearly">{t("builder.yearly")}</option>
                </select>
              </label>
            )}
          </div>
        )}

        {/* ===== Type-specific ===== */}
        {(type === "digital_download" || type === "lead_magnet") && (
          <FileField
            file={config.file as { name?: string } | undefined}
            onUploaded={(f) => set("file", f)}
          />
        )}

        {type === "lead_magnet" && (
          <Toggle
            checked={config.email_only !== false}
            onChange={(v) => set("email_only", v)}
            label={t("builder.emailOnly")}
          />
        )}

        {type === "course" && (
          <CourseEditor
            modules={(config.modules as Module[]) ?? []}
            onChange={(m) => set("modules", m)}
          />
        )}

        {type === "coaching_call" && (
          <>
            <label className={label}>
              {t("builder.duration")}
              <input
                type="number" min={15} max={240} step={15}
                value={(config.duration_minutes as number) ?? 60}
                onChange={(e) => set("duration_minutes", Number(e.target.value))}
                className={input}
              />
            </label>
            <div>
              <p className={label}>{t("builder.availability")}</p>
              <div className="mt-2 space-y-1.5">
                {DAYS.map((d, i) => {
                  const av = (config.availability as Record<string, { enabled?: boolean; from?: string; to?: string }>) ?? {};
                  const day = av[d] ?? {};
                  return (
                    <div key={d} className="flex items-center gap-2 text-sm">
                      <label className="flex w-16 items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={day.enabled ?? false}
                          onChange={(e) =>
                            set("availability", { ...av, [d]: { ...day, enabled: e.target.checked, from: day.from ?? "09:00", to: day.to ?? "17:00" } })
                          }
                        />
                        <span className="font-medium text-ink">{dayLabel[i]}</span>
                      </label>
                      {day.enabled && (
                        <>
                          <input type="time" value={day.from ?? "09:00"}
                            onChange={(e) => set("availability", { ...av, [d]: { ...day, from: e.target.value } })}
                            className="rounded-control border border-line px-2 py-1.5" />
                          <span className="text-ink-faint">–</span>
                          <input type="time" value={day.to ?? "17:00"}
                            onChange={(e) => set("availability", { ...av, [d]: { ...day, to: e.target.value } })}
                            className="rounded-control border border-line px-2 py-1.5" />
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {type === "webinar" && (
          <>
            <div className="flex gap-3">
              <label className={`${label} flex-1`}>
                {t("builder.dateTime")}
                <input
                  type="datetime-local"
                  value={(config.starts_at as string) ?? ""}
                  onChange={(e) => set("starts_at", e.target.value)}
                  className={input}
                />
              </label>
              <label className={`${label} w-36`}>
                {t("builder.duration")}
                <input
                  type="number" min={15} max={480} step={15}
                  value={(config.duration_minutes as number) ?? 60}
                  onChange={(e) => set("duration_minutes", Number(e.target.value))}
                  className={input}
                />
              </label>
            </div>
            <p className="rounded-control bg-primary-50 px-3 py-2 text-xs text-primary-800">
              {t("builder.zoomNote")}
            </p>
          </>
        )}

        {type === "membership" && (
          <ListEditor
            items={(config.included as string[]) ?? []}
            onChange={(xs) => set("included", xs)}
            title={t("builder.included")}
            addLabel={t("builder.addItem")}
          />
        )}

        {type === "custom_product" && (
          <>
            <label className={label}>
              {t("builder.turnaround")}
              <input
                type="number" min={1} max={90}
                value={(config.turnaround_days as number) ?? 3}
                onChange={(e) => set("turnaround_days", Number(e.target.value))}
                className={input}
              />
            </label>
            <label className={label}>
              {t("builder.promptLabel")}
              <input
                maxLength={200}
                value={(config.prompt as string) ?? ""}
                onChange={(e) => set("prompt", e.target.value)}
                className={input}
              />
            </label>
          </>
        )}

        {type === "external_link" && (
          <label className={label}>
            {t("builder.destinationUrl")}
            <input
              type="url" required placeholder="https://…"
              value={(config.url as string) ?? ""}
              onChange={(e) => set("url", e.target.value)}
              className={input}
            />
          </label>
        )}

        {type === "physical" && (
          <PhysicalEditor
            attrs={attrs}
            setAttrs={setAttrs}
            combos={combos}
            variantData={variantData}
            setVariantData={setVariantData}
            shipping={(config.shipping_fee as number) ?? 0}
            setShipping={(n) => set("shipping_fee", n)}
            cod={(config.cod_enabled as boolean) ?? false}
            setCod={(v) => set("cod_enabled", v)}
          />
        )}

        {/* ===== Actions ===== */}
        <div className="flex flex-wrap gap-2 border-t border-line pt-4">
          <button
            onClick={() => save("active")}
            disabled={busy || !title}
            className="rounded-control bg-primary-600 px-6 py-3 font-semibold text-white shadow-card hover:bg-primary-700 disabled:opacity-60"
          >
            {busy ? "…" : t("builder.publish")}
          </button>
          <button
            onClick={() => save("draft")}
            disabled={busy || !title}
            className="rounded-control border border-primary-600 px-5 py-3 font-semibold text-primary-700 hover:bg-primary-50 disabled:opacity-60"
          >
            {t("builder.saveDraft")}
          </button>
          {initial.id && (
            <button
              onClick={remove}
              disabled={busy}
              className="ml-auto rounded-control px-4 py-3 text-sm font-semibold text-danger hover:bg-red-50"
            >
              {t("builder.delete")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ===== Sub-editors ===== */

function FileField({
  file,
  onUploaded,
}: {
  file?: { name?: string };
  onUploaded: (f: { path: string; name: string; size: number }) => void;
}) {
  const t = useTranslations();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function upload(f: File) {
    setBusy(true);
    setErr(null);
    const form = new FormData();
    form.append("file", f);
    const res = await fetch("/api/creator/upload-file", { method: "POST", body: form });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok && body.path) onUploaded(body);
    else setErr(body.detail ?? t("dash.errGeneric"));
  }

  return (
    <div>
      <p className="text-sm font-medium text-ink-soft">{t("builder.file")}</p>
      <div className="mt-1.5 flex items-center gap-3">
        <label className="cursor-pointer rounded-control border border-primary-600 px-3.5 py-2.5 text-sm font-semibold text-primary-700 hover:bg-primary-50">
          {busy ? "…" : t("builder.uploadFile")}
          <input
            type="file" className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
              e.target.value = "";
            }}
          />
        </label>
        {file?.name && (
          <span className="text-sm text-success">
            {t("builder.fileAttached")} <span className="text-ink-faint">({file.name})</span>
          </span>
        )}
      </div>
      {err && <p className="mt-1 text-xs text-danger">{err}</p>}
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-2.5 text-sm font-medium text-ink">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4" />
      {label}
    </label>
  );
}

function ListEditor({ items, onChange, title, addLabel }: { items: string[]; onChange: (xs: string[]) => void; title: string; addLabel: string }) {
  return (
    <div>
      <p className="text-sm font-medium text-ink-soft">{title}</p>
      <div className="mt-1.5 space-y-1.5">
        {items.map((it, i) => (
          <div key={i} className="flex gap-2">
            <input
              value={it} maxLength={120}
              onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))}
              className="w-full rounded-control border border-line px-3 py-2 text-sm outline-none focus:border-primary-500"
            />
            <button onClick={() => onChange(items.filter((_, j) => j !== i))} className="px-2 text-ink-faint hover:text-danger">✕</button>
          </div>
        ))}
        <button onClick={() => onChange([...items, ""])} className="text-sm font-semibold text-primary-700">
          {addLabel}
        </button>
      </div>
    </div>
  );
}

function CourseEditor({ modules, onChange }: { modules: Module[]; onChange: (m: Module[]) => void }) {
  const t = useTranslations("builder");
  const input = "w-full rounded-control border border-line px-3 py-2 text-sm outline-none focus:border-primary-500";
  return (
    <div>
      <p className="text-sm font-medium text-ink-soft">{t("modules")}</p>
      <div className="mt-2 space-y-3">
        {modules.map((m, mi) => (
          <div key={mi} className="rounded-control border border-line p-3">
            <div className="flex gap-2">
              <input
                placeholder={t("moduleTitle")} value={m.title} maxLength={120}
                onChange={(e) => onChange(modules.map((x, j) => (j === mi ? { ...x, title: e.target.value } : x)))}
                className={`${input} font-semibold`}
              />
              <button onClick={() => onChange(modules.filter((_, j) => j !== mi))} className="px-2 text-ink-faint hover:text-danger">✕</button>
            </div>
            <div className="mt-2 space-y-2 pl-3">
              {m.lessons.map((l, li) => (
                <div key={li} className="rounded-control bg-bg p-2.5">
                  <div className="flex gap-2">
                    <input
                      placeholder={t("lessonTitle")} value={l.title} maxLength={120}
                      onChange={(e) => {
                        const lessons = m.lessons.map((x, j) => (j === li ? { ...x, title: e.target.value } : x));
                        onChange(modules.map((x, j) => (j === mi ? { ...x, lessons } : x)));
                      }}
                      className={input}
                    />
                    <button
                      onClick={() => {
                        const lessons = m.lessons.filter((_, j) => j !== li);
                        onChange(modules.map((x, j) => (j === mi ? { ...x, lessons } : x)));
                      }}
                      className="px-2 text-ink-faint hover:text-danger"
                    >✕</button>
                  </div>
                  <input
                    placeholder={t("videoUrl")} value={l.video_url ?? ""}
                    onChange={(e) => {
                      const lessons = m.lessons.map((x, j) => (j === li ? { ...x, video_url: e.target.value } : x));
                      onChange(modules.map((x, j) => (j === mi ? { ...x, lessons } : x)));
                    }}
                    className={`${input} mt-1.5`}
                  />
                  <textarea
                    placeholder={t("lessonText")} rows={2} value={l.text ?? ""}
                    onChange={(e) => {
                      const lessons = m.lessons.map((x, j) => (j === li ? { ...x, text: e.target.value } : x));
                      onChange(modules.map((x, j) => (j === mi ? { ...x, lessons } : x)));
                    }}
                    className={`${input} mt-1.5`}
                  />
                </div>
              ))}
              <button
                onClick={() => onChange(modules.map((x, j) => (j === mi ? { ...x, lessons: [...x.lessons, { title: "" }] } : x)))}
                className="text-sm font-semibold text-primary-700"
              >
                {t("addLesson")}
              </button>
            </div>
          </div>
        ))}
        <button
          onClick={() => onChange([...modules, { title: "", lessons: [] }])}
          className="text-sm font-semibold text-primary-700"
        >
          {t("addModule")}
        </button>
      </div>
    </div>
  );
}

function PhysicalEditor({
  attrs, setAttrs, combos, variantData, setVariantData, shipping, setShipping, cod, setCod,
}: {
  attrs: Attr[];
  setAttrs: (a: Attr[]) => void;
  combos: Record<string, string>[];
  variantData: Record<string, Partial<Variant>>;
  setVariantData: React.Dispatch<React.SetStateAction<Record<string, Partial<Variant>>>>;
  shipping: number;
  setShipping: (n: number) => void;
  cod: boolean;
  setCod: (v: boolean) => void;
}) {
  const t = useTranslations("builder");
  const input = "rounded-control border border-line px-2.5 py-2 text-sm outline-none focus:border-primary-500";

  function setV(key: string, patch: Partial<Variant>) {
    setVariantData((d) => ({ ...d, [key]: { ...d[key], ...patch } }));
  }

  return (
    <div className="space-y-4">
      {/* Attributes */}
      <div>
        <p className="text-sm font-medium text-ink-soft">{t("attributes")}</p>
        <div className="mt-2 space-y-2">
          {attrs.map((a, i) => (
            <div key={i} className="flex flex-wrap gap-2">
              <input
                placeholder={t("attrName")} value={a.name} maxLength={40}
                onChange={(e) => setAttrs(attrs.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                className={`${input} w-32`}
              />
              <input
                placeholder={t("attrValues")} value={a.values.join(", ")}
                onChange={(e) =>
                  setAttrs(attrs.map((x, j) => (j === i ? { ...x, values: e.target.value.split(",").map((v) => v.trim()).filter(Boolean) } : x)))
                }
                className={`${input} min-w-0 flex-1`}
              />
              <button onClick={() => setAttrs(attrs.filter((_, j) => j !== i))} className="px-2 text-ink-faint hover:text-danger">✕</button>
            </div>
          ))}
          {attrs.length < 5 && (
            <button onClick={() => setAttrs([...attrs, { name: "", values: [] }])} className="text-sm font-semibold text-primary-700">
              {t("addAttribute")}
            </button>
          )}
        </div>
      </div>

      {/* Variant matrix */}
      {combos.length > 0 && (
        <div>
          <p className="text-sm font-medium text-ink-soft">
            {t("variants")} ({combos.length})
          </p>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[540px] text-sm">
              <thead>
                <tr className="text-left text-xs text-ink-faint">
                  <th className="py-1.5 pr-2">{t("variant")}</th>
                  <th className="py-1.5 pr-2">{t("stock")}</th>
                  <th className="py-1.5 pr-2">{t("priceOverride")}</th>
                  <th className="py-1.5 pr-2">{t("sku")}</th>
                  <th className="py-1.5">{t("weightG")}</th>
                </tr>
              </thead>
              <tbody>
                {combos.map((combo) => {
                  const key = JSON.stringify(combo);
                  const d = variantData[key] ?? {};
                  return (
                    <tr key={key} className="border-t border-line">
                      <td className="py-2 pr-2 font-medium text-ink">
                        {Object.values(combo).join(" / ")}
                      </td>
                      <td className="py-2 pr-2">
                        <input type="number" min={0} value={d.stock_count ?? 0}
                          onChange={(e) => setV(key, { stock_count: Number(e.target.value) })}
                          className={`${input} w-20`} />
                      </td>
                      <td className="py-2 pr-2">
                        <input type="number" min={0} step="0.01" value={d.price_override ?? ""}
                          placeholder="—"
                          onChange={(e) => setV(key, { price_override: e.target.value === "" ? null : Number(e.target.value) })}
                          className={`${input} w-24`} />
                      </td>
                      <td className="py-2 pr-2">
                        <input value={d.sku ?? ""} maxLength={60}
                          onChange={(e) => setV(key, { sku: e.target.value })}
                          className={`${input} w-28`} />
                      </td>
                      <td className="py-2">
                        <input type="number" min={0} value={d.weight_grams ?? ""}
                          placeholder="—"
                          onChange={(e) => setV(key, { weight_grams: e.target.value === "" ? null : Number(e.target.value) })}
                          className={`${input} w-24`} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Shipping */}
      <div className="flex flex-wrap items-end gap-4">
        <label className="block text-sm font-medium text-ink-soft">
          {t("shippingFee")} (ETB)
          <input
            type="number" min={0} step="0.01" value={shipping}
            onChange={(e) => setShipping(Number(e.target.value) || 0)}
            className="mt-1.5 w-36 rounded-control border border-line px-3.5 py-3 text-ink outline-none focus:border-primary-500"
          />
        </label>
        <label className="mb-3 flex items-center gap-2.5 text-sm font-medium text-ink">
          <input type="checkbox" checked={cod} onChange={(e) => setCod(e.target.checked)} className="h-4 w-4" />
          {t("cod")}
        </label>
      </div>
    </div>
  );
}

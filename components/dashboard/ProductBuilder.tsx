"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { TYPE_META, FREE_TYPES, LINK_OUT_TYPES } from "@/lib/product-types";
import type { CardStyle, ProductType } from "@/lib/product-types";

/* ============================== types ============================== */

type Attr = { name: string; values: string[]; valuesText?: string };
type Variant = {
  attribute_values: Record<string, string>;
  sku?: string;
  price_override?: number | null;
  stock_count: number;
  weight_grams?: number | null;
};
type Lesson = { title: string; video_url?: string; text?: string };
type Module = { title: string; lessons: Lesson[] };
type CustomField = { label: string; field_type: "text" | "textarea" | "phone" | "email" };
type Review = { name: string; stars: number; text: string };

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

export interface BuilderInitial {
  id?: string;
  type: string;
  title?: string;
  subtitle?: string;
  card_style?: string;
  thumbnail_url?: string | null;
  hero_image_url?: string | null;
  description_body?: string;
  bottom_title?: string;
  cta_button_text?: string;
  price?: number;
  discount_price?: number | null;
  status?: string;
  config?: Record<string, unknown>;
  custom_fields?: CustomField[];
  attributes?: Attr[];
  variants?: Variant[];
}

/** Other products by the same creator (for the order-bump picker). */
export type BumpOption = { id: string; title: string };

/* ============================== main ============================== */

export function ProductBuilder({
  initial,
  bumpOptions = [],
}: {
  initial: BuilderInitial;
  bumpOptions?: BumpOption[];
}) {
  const t = useTranslations();
  const tb = useTranslations("builder");
  const locale = useLocale();
  const router = useRouter();
  const type = initial.type as ProductType;
  const meta = TYPE_META[type];

  const [tab, setTab] = useState<"thumbnail" | "product" | "options">("thumbnail");
  const [showPreview, setShowPreview] = useState(false); // mobile toggle

  // Thumbnail tab
  const [cardStyle, setCardStyle] = useState<CardStyle>(
    (initial.card_style as CardStyle) ?? "callout"
  );
  const [thumbnailUrl, setThumbnailUrl] = useState(initial.thumbnail_url ?? null);
  const [title, setTitle] = useState(initial.title ?? "");
  const [subtitle, setSubtitle] = useState(initial.subtitle ?? "");
  const [ctaText, setCtaText] = useState(initial.cta_button_text ?? "");

  // Product (checkout page) tab
  const [heroUrl, setHeroUrl] = useState(initial.hero_image_url ?? null);
  const [descriptionBody, setDescriptionBody] = useState(initial.description_body ?? "");
  const [bottomTitle, setBottomTitle] = useState(initial.bottom_title ?? "");
  const [price, setPrice] = useState<string>(String(initial.price ?? 0));
  const [discountPrice, setDiscountPrice] = useState<string>(
    initial.discount_price != null ? String(initial.discount_price) : ""
  );
  const [customFields, setCustomFields] = useState<CustomField[]>(
    initial.custom_fields ?? []
  );

  // Type-specific config + physical structures
  const [config, setConfig] = useState<Record<string, unknown>>(initial.config ?? {});
  const [attrs, setAttrs] = useState<Attr[]>(initial.attributes ?? []);
  const [variantData, setVariantData] = useState<Record<string, Partial<Variant>>>(
    Object.fromEntries(
      (initial.variants ?? []).map((v) => [JSON.stringify(v.attribute_values), v])
    )
  );

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isFree = FREE_TYPES.includes(type);
  const isLinkOut = LINK_OUT_TYPES.includes(type);

  const combos = useMemo(() => {
    const valid = attrs.filter((a) => a.name && a.values.length > 0);
    if (valid.length === 0) return [] as Record<string, string>[];
    return valid.reduce<Record<string, string>[]>(
      (acc, a) => acc.flatMap((c) => a.values.map((v) => ({ ...c, [a.name]: v }))),
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
      subtitle,
      card_style: cardStyle,
      thumbnail_url: thumbnailUrl,
      hero_image_url: heroUrl,
      description_body: descriptionBody,
      bottom_title: bottomTitle,
      cta_button_text: ctaText || defaultCta(type, tb),
      price: isFree ? 0 : Number(price) || 0,
      discount_price:
        !isFree && discountPrice !== "" && !Number.isNaN(Number(discountPrice))
          ? Number(discountPrice)
          : null,
      status,
      config,
      custom_fields: customFields.filter((f) => f.label.trim()),
      ...(type === "physical"
        ? {
            attributes: attrs.filter((a) => a.name && a.values.length),
            variants,
          }
        : {}),
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
    if (!window.confirm(tb("confirmDelete"))) return;
    setBusy(true);
    await fetch(`/api/products/${initial.id}`, { method: "DELETE" });
    router.push("/dashboard/store?tab=products");
    router.refresh();
  }

  const input =
    "mt-1.5 w-full rounded-control border border-line bg-surface px-3.5 py-3 text-ink outline-none focus:border-primary-500";
  const label = "block text-sm font-medium text-ink-soft";

  const tabs = [
    { id: "thumbnail" as const, label: tb("tabThumbnail") },
    { id: "product" as const, label: tb("tabProduct") },
    { id: "options" as const, label: tb("tabOptions") },
  ];

  const previewProps = {
    tab,
    cardStyle,
    thumbnailUrl,
    heroUrl,
    title,
    subtitle,
    ctaText: ctaText || defaultCta(type, tb),
    descriptionBody,
    bottomTitle,
    price: isFree ? 0 : Number(price) || 0,
    discountPrice:
      discountPrice !== "" && !Number.isNaN(Number(discountPrice))
        ? Number(discountPrice)
        : null,
    customFields,
    type,
    isLinkOut,
  };

  return (
    <div className="mx-auto max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="text-3xl">{meta.icon}</span>
        <div>
          <h1 className="font-heading text-xl font-bold text-ink">
            {initial.id ? tb("editProduct") : tb("newProduct")} · {t(meta.nameKey)}
          </h1>
          <p className="text-sm text-ink-faint">{t(meta.descKey)}</p>
        </div>
      </div>

      <div className="mt-5 gap-6 lg:grid lg:grid-cols-[1fr_360px]">
        {/* ===== Left: the three tabs ===== */}
        <div>
          <div className="flex gap-1 rounded-control border border-line bg-surface p-1 shadow-card">
            {tabs.map((x) => (
              <button
                key={x.id}
                onClick={() => setTab(x.id)}
                className={`flex-1 rounded-[9px] px-3 py-2.5 text-sm font-semibold transition ${
                  tab === x.id
                    ? "bg-primary-600 text-white"
                    : "text-ink-soft hover:bg-primary-50"
                }`}
              >
                {x.label}
              </button>
            ))}
          </div>

          <div className="mt-4 space-y-4 rounded-card border border-line bg-surface p-5 shadow-card">
            {error && (
              <p className="rounded-control bg-red-50 px-3 py-2 text-sm text-danger">
                {error}
              </p>
            )}

            {/* ---------- Tab 1: Thumbnail ---------- */}
            {tab === "thumbnail" && (
              <>
                <div>
                  <p className={label}>{tb("pickStyle")}</p>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {(["button", "callout", "preview"] as CardStyle[]).map((s) => (
                      <button
                        key={s}
                        onClick={() => setCardStyle(s)}
                        className={`rounded-control border-2 p-3 text-center transition ${
                          cardStyle === s
                            ? "border-primary-600 bg-primary-50"
                            : "border-line hover:border-primary-300"
                        }`}
                      >
                        <StyleGlyph style={s} />
                        <span className="mt-1.5 block text-xs font-semibold text-ink">
                          {tb(`style_${s}`)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className={label}>{tb("thumbImage")}</p>
                  <RectImageUpload
                    value={thumbnailUrl}
                    onUploaded={setThumbnailUrl}
                    aspect="square"
                    hint="400×400"
                  />
                </div>

                <label className={label}>
                  {tb("title")}
                  <input
                    required
                    maxLength={120}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className={input}
                  />
                </label>
                <label className={label}>
                  {tb("subtitle")}
                  <input
                    maxLength={160}
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    className={input}
                  />
                </label>
                <label className={label}>
                  {tb("ctaText")}
                  <input
                    maxLength={40}
                    value={ctaText}
                    placeholder={defaultCta(type, tb)}
                    onChange={(e) => setCtaText(e.target.value)}
                    className={input}
                  />
                </label>
              </>
            )}

            {/* ---------- Tab 2: Checkout page / Product ---------- */}
            {tab === "product" && (
              <>
                {!isLinkOut && (
                  <div>
                    <p className={label}>{tb("heroImage")}</p>
                    <RectImageUpload
                      value={heroUrl}
                      onUploaded={setHeroUrl}
                      aspect="wide"
                      hint="1920×1080"
                    />
                  </div>
                )}

                {!isLinkOut && (
                  <>
                    <label className={label}>
                      {tb("descriptionBody")}
                      <textarea
                        rows={5}
                        maxLength={8000}
                        value={descriptionBody}
                        onChange={(e) => setDescriptionBody(e.target.value)}
                        className={input}
                      />
                    </label>
                    <label className={label}>
                      {tb("bottomTitle")}
                      <input
                        maxLength={160}
                        value={bottomTitle}
                        onChange={(e) => setBottomTitle(e.target.value)}
                        className={input}
                      />
                    </label>
                  </>
                )}

                {!isFree && !isLinkOut && (
                  <div className="flex gap-3">
                    <label className={`${label} flex-1`}>
                      {tb("price")} (ETB)
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className={input}
                      />
                    </label>
                    <label className={`${label} flex-1`}>
                      {tb("discountPrice")}
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={discountPrice}
                        placeholder={tb("noDiscount")}
                        onChange={(e) => setDiscountPrice(e.target.value)}
                        className={input}
                      />
                    </label>
                  </div>
                )}

                {!isLinkOut && (
                  <CollectInfoEditor fields={customFields} onChange={setCustomFields} />
                )}

                {/* ----- type-specific final step ----- */}
                <div className="border-t border-line pt-4">
                  <p className="text-sm font-semibold text-ink">
                    {tb("typeStep")} · {t(meta.nameKey)}
                  </p>
                  <div className="mt-3 space-y-4">
                    <TypeStep
                      type={type}
                      config={config}
                      set={set}
                      locale={locale}
                      attrs={attrs}
                      setAttrs={setAttrs}
                      combos={combos}
                      variantData={variantData}
                      setVariantData={setVariantData}
                    />
                  </div>
                </div>
              </>
            )}

            {/* ---------- Tab 3: Options ---------- */}
            {tab === "options" && (
              <OptionsTab
                config={config}
                set={set}
                bumpOptions={bumpOptions.filter((b) => b.id !== initial.id)}
              />
            )}

            {/* ---------- Actions ---------- */}
            <div className="flex flex-wrap gap-2 border-t border-line pt-4">
              <button
                onClick={() => save("active")}
                disabled={busy || !title}
                className="rounded-control bg-primary-600 px-6 py-3 font-semibold text-white shadow-card hover:bg-primary-700 disabled:opacity-60"
              >
                {busy ? "…" : tb("publish")}
              </button>
              <button
                onClick={() => save("draft")}
                disabled={busy || !title}
                className="rounded-control border border-primary-600 px-5 py-3 font-semibold text-primary-700 hover:bg-primary-50 disabled:opacity-60"
              >
                {tb("saveDraft")}
              </button>
              {initial.id && (
                <button
                  onClick={remove}
                  disabled={busy}
                  className="ml-auto rounded-control px-4 py-3 text-sm font-semibold text-danger hover:bg-red-50"
                >
                  {tb("delete")}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ===== Right: live preview (PC persistent, mobile toggled) ===== */}
        <div className="hidden lg:block">
          <div className="sticky top-6">
            <LivePreview {...previewProps} />
          </div>
        </div>
      </div>

      {/* Mobile preview toggle */}
      <button
        onClick={() => setShowPreview(true)}
        className="fixed bottom-20 right-4 z-40 rounded-full bg-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-lg lg:hidden"
      >
        👁 {tb("preview")}
      </button>
      {showPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 lg:hidden"
          onClick={() => setShowPreview(false)}
        >
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm">
            <LivePreview {...previewProps} />
            <button
              onClick={() => setShowPreview(false)}
              className="mx-auto mt-3 block rounded-control bg-surface px-4 py-2 text-sm font-semibold text-ink"
            >
              ✕ {tb("closePreview")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function defaultCta(
  type: ProductType,
  tb: ReturnType<typeof useTranslations<"builder">>
): string {
  if (type === "lead_magnet") return tb("ctaGet");
  if (type === "affiliate_link" || type === "url_media") return tb("ctaOpen");
  return tb("ctaBuy");
}

/* ============================== style glyphs ============================== */

function StyleGlyph({ style }: { style: CardStyle }) {
  if (style === "button") {
    return (
      <span className="mx-auto block h-10 w-full max-w-[88px] rounded-md border border-line bg-bg p-1.5">
        <span className="block h-full w-full rounded bg-primary-200" />
      </span>
    );
  }
  if (style === "callout") {
    return (
      <span className="mx-auto flex h-10 w-full max-w-[88px] items-center gap-1 rounded-md border border-line bg-bg p-1.5">
        <span className="block h-full w-6 shrink-0 rounded bg-primary-200" />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="block h-1.5 w-full rounded bg-line" />
          <span className="block h-1.5 w-2/3 rounded bg-line" />
        </span>
      </span>
    );
  }
  return (
    <span className="mx-auto flex h-10 w-full max-w-[88px] flex-col gap-1 rounded-md border border-line bg-bg p-1.5">
      <span className="block h-4 w-full rounded bg-primary-200" />
      <span className="block h-1.5 w-2/3 rounded bg-line" />
    </span>
  );
}

/* ============================== live preview ============================== */

function LivePreview({
  tab,
  cardStyle,
  thumbnailUrl,
  heroUrl,
  title,
  subtitle,
  ctaText,
  descriptionBody,
  bottomTitle,
  price,
  discountPrice,
  customFields,
  type,
  isLinkOut,
}: {
  tab: "thumbnail" | "product" | "options";
  cardStyle: CardStyle;
  thumbnailUrl: string | null;
  heroUrl: string | null;
  title: string;
  subtitle: string;
  ctaText: string;
  descriptionBody: string;
  bottomTitle: string;
  price: number;
  discountPrice: number | null;
  customFields: CustomField[];
  type: ProductType;
  isLinkOut: boolean;
}) {
  const tb = useTranslations("builder");
  const showTitle = title || tb("previewTitleGhost");
  const effective = discountPrice ?? price;

  return (
    <div className="overflow-hidden rounded-[28px] border-4 border-ink/80 bg-bg shadow-xl">
      <div className="bg-ink/80 py-1.5 text-center text-[10px] font-medium text-white/70">
        {tb("livePreview")}
      </div>
      <div className="max-h-[560px] overflow-y-auto p-4">
        {tab !== "product" ? (
          /* --- storefront card preview --- */
          <div className="mx-auto max-w-[300px]">
            {cardStyle === "button" && (
              <div className="rounded-card border border-line bg-surface px-4 py-3.5 text-center shadow-card">
                <p className="font-semibold text-ink">{showTitle}</p>
                {subtitle && <p className="mt-0.5 text-xs text-ink-faint">{subtitle}</p>}
              </div>
            )}
            {cardStyle === "callout" && (
              <div className="flex items-center gap-3 rounded-card border border-line bg-surface p-3 shadow-card">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-control bg-primary-50 text-center text-2xl leading-[56px]">
                  {thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumbnailUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    TYPE_META[type].icon
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink">{showTitle}</p>
                  {subtitle && (
                    <p className="truncate text-xs text-ink-faint">{subtitle}</p>
                  )}
                </div>
                <span className="shrink-0 rounded-full bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white">
                  {ctaText}
                </span>
              </div>
            )}
            {cardStyle === "preview" && (
              <div className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
                {thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumbnailUrl}
                    alt=""
                    className="aspect-square max-h-52 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-20 w-full items-center justify-center border-b border-line bg-primary-50 text-3xl">
                    {TYPE_META[type].icon}
                  </div>
                )}
                <div className="p-3.5">
                  <p className="font-semibold text-ink">{showTitle}</p>
                  {subtitle && <p className="mt-0.5 text-xs text-ink-faint">{subtitle}</p>}
                  <span className="mt-2.5 block rounded-control bg-primary-600 py-2 text-center text-sm font-semibold text-white">
                    {ctaText}
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* --- product page preview --- */
          <div className="mx-auto max-w-[300px]">
            <div className="flex aspect-video w-full items-center justify-center overflow-hidden rounded-card bg-primary-50 text-4xl">
              {heroUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={heroUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                TYPE_META[type].icon
              )}
            </div>
            <h3 className="mt-3 font-heading text-lg font-bold text-ink">{showTitle}</h3>
            {descriptionBody && (
              <p className="mt-1.5 whitespace-pre-wrap text-xs leading-relaxed text-ink-soft">
                {descriptionBody.slice(0, 400)}
              </p>
            )}
            {!isLinkOut && type !== "lead_magnet" && (
              <p className="mt-2.5">
                <span className="text-lg font-bold text-ink">
                  {effective.toLocaleString()} ETB
                </span>
                {discountPrice != null && (
                  <span className="ml-2 text-sm text-ink-faint line-through">
                    {price.toLocaleString()} ETB
                  </span>
                )}
              </p>
            )}
            {bottomTitle && (
              <p className="mt-2 text-sm font-semibold text-ink">{bottomTitle}</p>
            )}
            {customFields.filter((f) => f.label.trim()).length > 0 && (
              <div className="mt-2.5 space-y-1.5">
                {customFields
                  .filter((f) => f.label.trim())
                  .map((f, i) => (
                    <div key={i} className="rounded-control border border-line bg-surface px-2.5 py-2 text-xs text-ink-faint">
                      {f.label}
                    </div>
                  ))}
              </div>
            )}
            <span className="mt-3 block rounded-control bg-primary-600 py-2.5 text-center text-sm font-semibold text-white">
              {ctaText}
            </span>
            <p className="mt-2 text-center text-[10px] text-ink-faint">
              {tb("previewTelegramNote")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================== collect info ============================== */

function CollectInfoEditor({
  fields,
  onChange,
}: {
  fields: CustomField[];
  onChange: (f: CustomField[]) => void;
}) {
  const tb = useTranslations("builder");
  const input =
    "rounded-control border border-line px-3 py-2 text-sm outline-none focus:border-primary-500";
  return (
    <div>
      <p className="text-sm font-medium text-ink-soft">{tb("collectInfo")}</p>
      <p className="mt-1 text-xs text-ink-faint">{tb("collectInfoNote")}</p>
      <div className="mt-2 space-y-2">
        {fields.map((f, i) => (
          <div key={i} className="flex gap-2">
            <input
              placeholder={tb("fieldLabel")}
              value={f.label}
              maxLength={80}
              onChange={(e) =>
                onChange(fields.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))
              }
              className={`${input} min-w-0 flex-1`}
            />
            <select
              value={f.field_type}
              onChange={(e) =>
                onChange(
                  fields.map((x, j) =>
                    j === i
                      ? { ...x, field_type: e.target.value as CustomField["field_type"] }
                      : x
                  )
                )
              }
              className={`${input} w-28`}
            >
              <option value="text">{tb("fieldText")}</option>
              <option value="textarea">{tb("fieldTextarea")}</option>
              <option value="phone">{tb("fieldPhone")}</option>
              <option value="email">{tb("fieldEmail")}</option>
            </select>
            <button
              onClick={() => onChange(fields.filter((_, j) => j !== i))}
              className="px-2 text-ink-faint hover:text-danger"
            >
              ✕
            </button>
          </div>
        ))}
        {fields.length < 10 && (
          <button
            onClick={() => onChange([...fields, { label: "", field_type: "text" }])}
            className="text-sm font-semibold text-primary-700"
          >
            + {tb("addField")}
          </button>
        )}
      </div>
    </div>
  );
}

/* ============================== options tab ============================== */

function OptionsTab({
  config,
  set,
  bumpOptions,
}: {
  config: Record<string, unknown>;
  set: (k: string, v: unknown) => void;
  bumpOptions: BumpOption[];
}) {
  const tb = useTranslations("builder");
  const [open, setOpen] = useState<string | null>("reviews");
  const reviews = (config.reviews as Review[]) ?? [];
  const input =
    "w-full rounded-control border border-line px-3 py-2 text-sm outline-none focus:border-primary-500";

  const sectionProps = (id: string) => ({
    isOpen: open === id,
    onToggle: () => setOpen(open === id ? null : id),
  });

  return (
    <div className="space-y-2.5">
      <CollapsibleSection {...sectionProps("reviews")} title={`⭐ ${tb("optReviews")}`}>
        <p className="text-xs text-ink-faint">{tb("optReviewsNote")}</p>
        <div className="mt-2 space-y-2">
          {reviews.map((r, i) => (
            <div key={i} className="rounded-control bg-bg p-2.5">
              <div className="flex gap-2">
                <input
                  placeholder={tb("reviewName")}
                  value={r.name}
                  maxLength={60}
                  onChange={(e) =>
                    set("reviews", reviews.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))
                  }
                  className={input}
                />
                <select
                  value={r.stars}
                  onChange={(e) =>
                    set("reviews", reviews.map((x, j) => (j === i ? { ...x, stars: Number(e.target.value) } : x)))
                  }
                  className="w-20 rounded-control border border-line px-2 py-2 text-sm"
                >
                  {[5, 4, 3].map((s) => (
                    <option key={s} value={s}>
                      {"★".repeat(s)}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => set("reviews", reviews.filter((_, j) => j !== i))}
                  className="px-1.5 text-ink-faint hover:text-danger"
                >
                  ✕
                </button>
              </div>
              <textarea
                placeholder={tb("reviewText")}
                rows={2}
                maxLength={300}
                value={r.text}
                onChange={(e) =>
                  set("reviews", reviews.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))
                }
                className={`${input} mt-1.5`}
              />
            </div>
          ))}
          {reviews.length < 6 && (
            <button
              onClick={() => set("reviews", [...reviews, { name: "", stars: 5, text: "" }])}
              className="text-sm font-semibold text-primary-700"
            >
              + {tb("addReview")}
            </button>
          )}
        </div>
      </CollapsibleSection>

      <CollapsibleSection {...sectionProps("bump")} title={`🛒 ${tb("optBump")}`}>
        <p className="text-xs text-ink-faint">{tb("optBumpNote")}</p>
        <select
          value={(config.order_bump_product_id as string) ?? ""}
          onChange={(e) => set("order_bump_product_id", e.target.value || null)}
          className={`${input} mt-2`}
        >
          <option value="">{tb("noBump")}</option>
          {bumpOptions.map((b) => (
            <option key={b.id} value={b.id}>
              {b.title}
            </option>
          ))}
        </select>
      </CollapsibleSection>

      <CollapsibleSection {...sectionProps("affiliate")} title={`🤝 ${tb("optAffiliate")}`}>
        <label className="flex items-center gap-2.5 text-sm font-medium text-ink">
          <input
            type="checkbox"
            checked={(config.affiliate_enabled as boolean) ?? false}
            onChange={(e) => set("affiliate_enabled", e.target.checked)}
            className="h-4 w-4"
          />
          {tb("affiliateEnable")}
        </label>
        {Boolean(config.affiliate_enabled) && (
          <label className="mt-2 block text-sm font-medium text-ink-soft">
            {tb("affiliatePercent")}
            <input
              type="number"
              min={1}
              max={90}
              value={(config.affiliate_percent as number) ?? 20}
              onChange={(e) => set("affiliate_percent", Number(e.target.value))}
              className={`${input} mt-1.5 w-28`}
            />
          </label>
        )}
      </CollapsibleSection>

      <CollapsibleSection {...sectionProps("message")} title={`💬 ${tb("optMessage")}`}>
        <p className="text-xs text-ink-faint">{tb("optMessageNote")}</p>
        <textarea
          rows={4}
          maxLength={1500}
          value={(config.tg_confirmation_template as string) ?? ""}
          placeholder={tb("messagePlaceholder")}
          onChange={(e) => set("tg_confirmation_template", e.target.value)}
          className={`${input} mt-2`}
        />
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {["{{customer_name}}", "{{product_title}}", "{{creator_name}}"].map((tag) => (
            <button
              key={tag}
              onClick={() =>
                set(
                  "tg_confirmation_template",
                  `${(config.tg_confirmation_template as string) ?? ""}${tag}`
                )
              }
              className="rounded-full bg-primary-50 px-2.5 py-1 font-mono text-[11px] text-primary-700 hover:bg-primary-100"
            >
              {tag}
            </button>
          ))}
        </div>
      </CollapsibleSection>
    </div>
  );
}

function CollapsibleSection({
  title,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-control border border-line">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-3.5 py-3 text-left text-sm font-semibold text-ink"
      >
        {title}
        <span className="text-ink-faint">{isOpen ? "\u25be" : "\u25b8"}</span>
      </button>
      {isOpen && <div className="border-t border-line p-3.5">{children}</div>}
    </div>
  );
}

/* ============================== type-specific step ============================== */

function TypeStep({
  type,
  config,
  set,
  locale,
  attrs,
  setAttrs,
  combos,
  variantData,
  setVariantData,
}: {
  type: ProductType;
  config: Record<string, unknown>;
  set: (k: string, v: unknown) => void;
  locale: string;
  attrs: Attr[];
  setAttrs: (a: Attr[]) => void;
  combos: Record<string, string>[];
  variantData: Record<string, Partial<Variant>>;
  setVariantData: React.Dispatch<React.SetStateAction<Record<string, Partial<Variant>>>>;
}) {
  const tb = useTranslations("builder");
  const input =
    "mt-1.5 w-full rounded-control border border-line bg-surface px-3.5 py-3 text-ink outline-none focus:border-primary-500";
  const label = "block text-sm font-medium text-ink-soft";

  const dayLabel = useMemo(() => {
    const base = new Date(Date.UTC(2024, 0, 1)); // a Monday
    const fmt = new Intl.DateTimeFormat(locale, { weekday: "short" });
    return DAYS.map((_, i) => fmt.format(new Date(base.getTime() + i * 86400000)));
  }, [locale]);

  switch (type) {
    case "digital_product":
      return (
        <FileField
          file={config.file as { name?: string } | undefined}
          onUploaded={(f) => set("file", f)}
        />
      );

    case "lead_magnet":
      return (
        <>
          <FileField
            file={config.file as { name?: string } | undefined}
            onUploaded={(f) => set("file", f)}
          />
          <div>
            <p className={label}>{tb("captureMethod")}</p>
            <div className="mt-2 flex gap-2">
              {(["telegram", "email"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => set("capture_method", m)}
                  className={`flex-1 rounded-control border-2 px-3 py-2.5 text-sm font-semibold transition ${
                    ((config.capture_method as string) ?? "telegram") === m
                      ? "border-primary-600 bg-primary-50 text-primary-700"
                      : "border-line text-ink-soft"
                  }`}
                >
                  {m === "telegram" ? `✈️ ${tb("captureTelegram")}` : `✉️ ${tb("captureEmail")}`}
                </button>
              ))}
            </div>
          </div>
        </>
      );

    case "course":
      return (
        <CourseEditor
          modules={(config.modules as Module[]) ?? []}
          onChange={(m) => set("modules", m)}
        />
      );

    case "coaching_call":
      return (
        <>
          <label className={label}>
            {tb("duration")}
            <input
              type="number"
              min={15}
              max={240}
              step={15}
              value={(config.duration_minutes as number) ?? 60}
              onChange={(e) => set("duration_minutes", Number(e.target.value))}
              className={input}
            />
          </label>
          <div>
            <p className={label}>{tb("availability")}</p>
            <div className="mt-2 space-y-1.5">
              {DAYS.map((d, i) => {
                const av =
                  (config.availability as Record<
                    string,
                    { enabled?: boolean; from?: string; to?: string }
                  >) ?? {};
                const day = av[d] ?? {};
                return (
                  <div key={d} className="flex items-center gap-2 text-sm">
                    <label className="flex w-16 items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={day.enabled ?? false}
                        onChange={(e) =>
                          set("availability", {
                            ...av,
                            [d]: {
                              ...day,
                              enabled: e.target.checked,
                              from: day.from ?? "09:00",
                              to: day.to ?? "17:00",
                            },
                          })
                        }
                      />
                      <span className="font-medium text-ink">{dayLabel[i]}</span>
                    </label>
                    {day.enabled && (
                      <>
                        <input
                          type="time"
                          value={day.from ?? "09:00"}
                          onChange={(e) =>
                            set("availability", { ...av, [d]: { ...day, from: e.target.value } })
                          }
                          className="rounded-control border border-line px-2 py-1.5"
                        />
                        <span className="text-ink-faint">–</span>
                        <input
                          type="time"
                          value={day.to ?? "17:00"}
                          onChange={(e) =>
                            set("availability", { ...av, [d]: { ...day, to: e.target.value } })
                          }
                          className="rounded-control border border-line px-2 py-1.5"
                        />
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      );

    case "webinar":
      return (
        <>
          <div className="flex gap-3">
            <label className={`${label} flex-1`}>
              {tb("dateTime")}
              <input
                type="datetime-local"
                value={(config.starts_at as string) ?? ""}
                onChange={(e) => set("starts_at", e.target.value)}
                className={input}
              />
            </label>
            <label className={`${label} w-36`}>
              {tb("duration")}
              <input
                type="number"
                min={15}
                max={480}
                step={15}
                value={(config.duration_minutes as number) ?? 60}
                onChange={(e) => set("duration_minutes", Number(e.target.value))}
                className={input}
              />
            </label>
          </div>
          <p className="rounded-control bg-primary-50 px-3 py-2 text-xs text-primary-800">
            {tb("zoomNote")}
          </p>
        </>
      );

    case "affiliate_link":
      return (
        <>
          <label className={label}>
            {tb("destinationUrl")}
            <input
              type="url"
              required
              placeholder="https://…"
              value={(config.url as string) ?? ""}
              onChange={(e) => set("url", e.target.value)}
              className={input}
            />
          </label>
          <p className="rounded-control bg-primary-50 px-3 py-2 text-xs text-primary-800">
            {tb("affiliateLinkNote")}
          </p>
        </>
      );

    case "url_media":
      return (
        <label className={label}>
          {tb("destinationUrl")}
          <input
            type="url"
            required
            placeholder="https://…"
            value={(config.url as string) ?? ""}
            onChange={(e) => set("url", e.target.value)}
            className={input}
          />
        </label>
      );

    case "custom_product":
      return (
        <>
          <label className={label}>
            {tb("turnaround")}
            <input
              type="number"
              min={1}
              max={90}
              value={(config.turnaround_days as number) ?? 3}
              onChange={(e) => set("turnaround_days", Number(e.target.value))}
              className={input}
            />
          </label>
          <label className={label}>
            {tb("promptLabel")}
            <input
              maxLength={200}
              value={(config.prompt as string) ?? ""}
              onChange={(e) => set("prompt", e.target.value)}
              className={input}
            />
          </label>
        </>
      );

    case "physical":
      return (
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
      );
  }
}

/* ============================== shared sub-editors ============================== */

function RectImageUpload({
  value,
  onUploaded,
  aspect,
  hint,
}: {
  value: string | null;
  onUploaded: (url: string | null) => void;
  aspect: "square" | "wide";
  hint: string;
}) {
  const t = useTranslations("dash");
  const tb = useTranslations("builder");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function upload(f: File) {
    setBusy(true);
    setErr(null);
    const form = new FormData();
    form.append("file", f);
    try {
      const res = await fetch("/api/creator/upload", { method: "POST", body: form });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.url) onUploaded(body.url);
      else setErr(t("errGeneric"));
    } catch {
      setErr(t("errGeneric"));
    }
    setBusy(false);
  }

  return (
    <div className="mt-1.5">
      <label
        className={`flex cursor-pointer items-center justify-center overflow-hidden rounded-control border-2 border-dashed border-line bg-bg text-ink-faint transition hover:border-primary-400 ${
          aspect === "square" ? "aspect-square max-w-[180px]" : "aspect-video max-w-[320px]"
        }`}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="p-3 text-center text-xs">
            {busy ? "…" : `📷 ${tb("selectImage")} (${hint})`}
          </span>
        )}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f);
            e.target.value = "";
          }}
        />
      </label>
      {value && (
        <button
          onClick={() => onUploaded(null)}
          className="mt-1 text-xs font-medium text-ink-faint hover:text-danger"
        >
          ✕ {tb("removeImage")}
        </button>
      )}
      {err && <p className="mt-1 text-xs text-danger">{err}</p>}
    </div>
  );
}

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
            type="file"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
              e.target.value = "";
            }}
          />
        </label>
        {file?.name && (
          <span className="text-sm text-success">
            {t("builder.fileAttached")}{" "}
            <span className="text-ink-faint">({file.name})</span>
          </span>
        )}
      </div>
      {err && <p className="mt-1 text-xs text-danger">{err}</p>}
    </div>
  );
}

function CourseEditor({
  modules,
  onChange,
}: {
  modules: Module[];
  onChange: (m: Module[]) => void;
}) {
  const t = useTranslations("builder");
  const input =
    "w-full rounded-control border border-line px-3 py-2 text-sm outline-none focus:border-primary-500";
  return (
    <div>
      <p className="text-sm font-medium text-ink-soft">{t("modules")}</p>

      {/* How to upload your lesson video to YouTube */}
      <details className="mt-2 rounded-control border border-accent-200 bg-accent-50 px-3.5 py-2.5">
        <summary className="cursor-pointer text-sm font-semibold text-accent-900">
          {t("videoHelpTitle")}
        </summary>
        <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-accent-900/90">
          <li>{t("vh1")}</li>
          <li>{t("vh2")}</li>
          <li>{t("vh3")}</li>
          <li>{t("vh4")}</li>
          <li>{t("vh5")}</li>
        </ol>
        <p className="mt-2 rounded-lg bg-surface px-3 py-2 text-xs font-medium text-danger">
          {t("vhNote")}
        </p>
      </details>

      <div className="mt-2 space-y-3">
        {modules.map((m, mi) => (
          <div key={mi} className="rounded-control border border-line p-3">
            <div className="flex gap-2">
              <input
                placeholder={t("moduleTitle")}
                value={m.title}
                maxLength={120}
                onChange={(e) =>
                  onChange(modules.map((x, j) => (j === mi ? { ...x, title: e.target.value } : x)))
                }
                className={`${input} font-semibold`}
              />
              <button
                onClick={() => onChange(modules.filter((_, j) => j !== mi))}
                className="px-2 text-ink-faint hover:text-danger"
              >
                ✕
              </button>
            </div>
            <div className="mt-2 space-y-2 pl-3">
              {m.lessons.map((l, li) => (
                <div key={li} className="rounded-control bg-bg p-2.5">
                  <div className="flex gap-2">
                    <input
                      placeholder={t("lessonTitle")}
                      value={l.title}
                      maxLength={120}
                      onChange={(e) => {
                        const lessons = m.lessons.map((x, j) =>
                          j === li ? { ...x, title: e.target.value } : x
                        );
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
                    >
                      ✕
                    </button>
                  </div>
                  <input
                    placeholder={t("videoUrl")}
                    value={l.video_url ?? ""}
                    onChange={(e) => {
                      const lessons = m.lessons.map((x, j) =>
                        j === li ? { ...x, video_url: e.target.value } : x
                      );
                      onChange(modules.map((x, j) => (j === mi ? { ...x, lessons } : x)));
                    }}
                    className={`${input} mt-1.5`}
                  />
                  <textarea
                    placeholder={t("lessonText")}
                    rows={2}
                    value={l.text ?? ""}
                    onChange={(e) => {
                      const lessons = m.lessons.map((x, j) =>
                        j === li ? { ...x, text: e.target.value } : x
                      );
                      onChange(modules.map((x, j) => (j === mi ? { ...x, lessons } : x)));
                    }}
                    className={`${input} mt-1.5`}
                  />
                </div>
              ))}
              <button
                onClick={() =>
                  onChange(
                    modules.map((x, j) =>
                      j === mi ? { ...x, lessons: [...x.lessons, { title: "" }] } : x
                    )
                  )
                }
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
  attrs,
  setAttrs,
  combos,
  variantData,
  setVariantData,
  shipping,
  setShipping,
  cod,
  setCod,
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
  const input =
    "rounded-control border border-line px-2.5 py-2 text-sm outline-none focus:border-primary-500";

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
                placeholder={t("attrName")}
                value={a.name}
                maxLength={40}
                onChange={(e) =>
                  setAttrs(attrs.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))
                }
                className={`${input} w-32`}
              />
              <input
                placeholder={t("attrValues")}
                value={a.valuesText ?? a.values.join(", ")}
                onChange={(e) =>
                  // Keep the raw text as typed (commas included); parse a
                  // clean values list alongside it for the variant matrix.
                  setAttrs(
                    attrs.map((x, j) =>
                      j === i
                        ? {
                            ...x,
                            valuesText: e.target.value,
                            values: e.target.value
                              .split(",")
                              .map((v) => v.trim())
                              .filter(Boolean),
                          }
                        : x
                    )
                  )
                }
                className={`${input} min-w-0 flex-1`}
              />
              <button
                onClick={() => setAttrs(attrs.filter((_, j) => j !== i))}
                className="px-2 text-ink-faint hover:text-danger"
              >
                ✕
              </button>
            </div>
          ))}
          {attrs.length < 5 && (
            <button
              onClick={() => setAttrs([...attrs, { name: "", values: [] }])}
              className="text-sm font-semibold text-primary-700"
            >
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
                        <input
                          type="number"
                          min={0}
                          value={d.stock_count ?? 0}
                          onChange={(e) => setV(key, { stock_count: Number(e.target.value) })}
                          className={`${input} w-20`}
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={d.price_override ?? ""}
                          placeholder="—"
                          onChange={(e) =>
                            setV(key, {
                              price_override:
                                e.target.value === "" ? null : Number(e.target.value),
                            })
                          }
                          className={`${input} w-24`}
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          value={d.sku ?? ""}
                          maxLength={60}
                          onChange={(e) => setV(key, { sku: e.target.value })}
                          className={`${input} w-28`}
                        />
                      </td>
                      <td className="py-2">
                        <input
                          type="number"
                          min={0}
                          value={d.weight_grams ?? ""}
                          placeholder="—"
                          onChange={(e) =>
                            setV(key, {
                              weight_grams:
                                e.target.value === "" ? null : Number(e.target.value),
                            })
                          }
                          className={`${input} w-24`}
                        />
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
            type="number"
            min={0}
            step="0.01"
            value={shipping}
            onChange={(e) => setShipping(Number(e.target.value) || 0)}
            className="mt-1.5 w-36 rounded-control border border-line px-3.5 py-3 text-ink outline-none focus:border-primary-500"
          />
        </label>
        <label className="mb-3 flex items-center gap-2.5 text-sm font-medium text-ink">
          <input
            type="checkbox"
            checked={cod}
            onChange={(e) => setCod(e.target.checked)}
            className="h-4 w-4"
          />
          {t("cod")}
        </label>
      </div>
    </div>
  );
}

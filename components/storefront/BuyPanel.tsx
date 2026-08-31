"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { authClient } from "@/lib/auth/client";
import { TelegramLoginButton } from "@/components/auth/TelegramLoginButton";
import type { VariantPublic } from "@/lib/db/storefront";

export type PublicCustomField = { label: string; field_type: string };

interface Props {
  product: {
    id: string;
    type: string;
    title: string;
    price: number;
    currency: string;
    is_recurring?: boolean;
    billing_interval?: string | null;
    config: Record<string, unknown>;
  };
  variants: VariantPublic[];
  attributeOrder: string[];
  customFields?: PublicCustomField[];
  botUsername?: string;
  themeButton: { background: string; color: string };
}

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

export function BuyPanel({
  product,
  variants,
  attributeOrder,
  customFields = [],
  botUsername = "MuyaOfficialBot",
  themeButton,
}: Props) {
  const t = useTranslations("shop");
  const locale = useLocale();
  const [selection, setSelection] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const [slot, setSlot] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const config = product.config ?? {};
  const isPhysical = product.type === "physical";
  const isCoaching = product.type === "coaching_call";
  const isLeadMagnet = product.type === "lead_magnet";
  const isFree = (Number(product.price) === 0 && !isPhysical) || isLeadMagnet;

  // ----- physical: attribute options + matched variant -----
  const options = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const name of attributeOrder) map[name] = [];
    for (const v of variants) {
      for (const [k, val] of Object.entries(v.attribute_values ?? {})) {
        if (!map[k]) map[k] = [];
        if (!map[k].includes(val)) map[k].push(val);
      }
    }
    return map;
  }, [variants, attributeOrder]);

  const attrNames = Object.keys(options);
  const matched = useMemo(() => {
    if (!isPhysical) return null;
    if (attrNames.some((n) => !selection[n])) return null;
    return (
      variants.find((v) =>
        attrNames.every((n) => (v.attribute_values ?? {})[n] === selection[n])
      ) ?? null
    );
  }, [isPhysical, variants, attrNames, selection]);

  const unitPrice =
    matched?.price_override != null
      ? Number(matched.price_override)
      : Number(product.price);
  const stock = matched?.stock_count;

  // ----- coaching: generate slots for the next 14 days -----
  const slots = useMemo(() => {
    if (!isCoaching) return [];
    const availability =
      (config.availability as Record<
        string,
        { enabled?: boolean; from?: string; to?: string }
      >) ?? {};
    const duration = Number(config.duration_minutes ?? 60);
    const out: { iso: string; label: string }[] = [];
    const now = new Date();
    for (let d = 1; d <= 14 && out.length < 40; d++) {
      const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d);
      const key = DAY_KEYS[day.getDay()];
      const av = availability[key];
      if (!av?.enabled || !av.from || !av.to) continue;
      const [fh, fm] = av.from.split(":").map(Number);
      const [th_, tm] = av.to.split(":").map(Number);
      const start = new Date(day);
      start.setHours(fh, fm, 0, 0);
      const end = new Date(day);
      end.setHours(th_, tm, 0, 0);
      for (
        let s = new Date(start);
        s.getTime() + duration * 60000 <= end.getTime();
        s = new Date(s.getTime() + duration * 60000)
      ) {
        out.push({
          iso: s.toISOString(),
          label: new Intl.DateTimeFormat(locale, {
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }).format(s),
        });
        if (out.length >= 40) break;
      }
    }
    return out;
  }, [isCoaching, config, locale]);

  const ctaLabel =
    product.type === "webinar"
      ? t("register")
      : isCoaching
        ? t("book")
        : isFree
          ? t("getFree")
          : t("buy");

  const canOpen =
    (!isPhysical || (matched && (stock ?? 0) >= quantity)) &&
    (!isCoaching || slot !== null);

  return (
    <div>
      {/* Physical variant selectors */}
      {isPhysical && (
        <div className="space-y-3">
          {attrNames.map((name) => (
            <div key={name}>
              <p className="text-sm font-semibold opacity-80">{name}</p>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {options[name].map((val) => (
                  <button
                    key={val}
                    onClick={() => setSelection((s) => ({ ...s, [name]: val }))}
                    className={`rounded-full border px-3.5 py-1.5 text-sm font-medium ${
                      selection[name] === val
                        ? "border-transparent text-white"
                        : "border-current opacity-60"
                    }`}
                    style={selection[name] === val ? themeButton : {}}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {matched && (
            <p className="text-sm font-medium">
              {(stock ?? 0) === 0
                ? `❌ ${t("outOfStock")}`
                : (stock ?? 0) <= 5
                  ? `⚠️ ${t("left", { n: stock ?? 0 })}`
                  : null}
            </p>
          )}
          <div className="flex items-center gap-3">
            <p className="text-sm font-semibold opacity-80">{t("qty")}</p>
            <div className="flex items-center gap-2 rounded-full border border-current px-2 py-1 opacity-90">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="px-2 text-lg"
              >
                −
              </button>
              <span className="w-6 text-center font-semibold">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => Math.min(stock ?? 50, q + 1))}
                className="px-2 text-lg"
              >
                +
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Coaching slot picker */}
      {isCoaching && (
        <div>
          <p className="text-sm font-semibold opacity-80">{t("chooseSlot")}</p>
          {slots.length === 0 ? (
            <p className="mt-2 text-sm opacity-70">{t("noSlots")}</p>
          ) : (
            <div className="mt-2 grid max-h-56 grid-cols-2 gap-2 overflow-y-auto pr-1 md:grid-cols-3">
              {slots.map((s) => (
                <button
                  key={s.iso}
                  onClick={() => setSlot(s.iso)}
                  className={`rounded-xl border px-3 py-2 text-xs font-medium ${
                    slot === s.iso
                      ? "border-transparent text-white"
                      : "border-current opacity-60"
                  }`}
                  style={slot === s.iso ? themeButton : {}}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CTA */}
      <div className="mt-6">
        <button
          disabled={!canOpen}
          onClick={() => setSheetOpen(true)}
          className="w-full rounded-2xl py-4 text-base font-bold shadow-card disabled:opacity-50"
          style={themeButton}
        >
          {ctaLabel} ·{" "}
          {isFree
            ? t("free")
            : `${(unitPrice * quantity + (isPhysical ? Number(config.shipping_fee ?? 0) * quantity : 0)).toLocaleString()} ${product.currency}`}
        </button>
      </div>

      {sheetOpen && (
        <CheckoutSheet
          product={product}
          variantId={matched?.id ?? null}
          quantity={quantity}
          slot={slot}
          unitPrice={unitPrice}
          customFields={customFields}
          botUsername={botUsername}
          onClose={() => setSheetOpen(false)}
          themeButton={themeButton}
        />
      )}
    </div>
  );
}

/* ================= Checkout bottom sheet ================= */

function CheckoutSheet({
  product,
  variantId,
  quantity,
  slot,
  unitPrice,
  customFields,
  botUsername,
  onClose,
  themeButton,
}: {
  product: Props["product"];
  variantId: string | null;
  quantity: number;
  slot: string | null;
  unitPrice: number;
  customFields: PublicCustomField[];
  botUsername: string;
  onClose: () => void;
  themeButton: { background: string; color: string };
}) {
  const t = useTranslations("shop");
  const locale = useLocale();
  const config = product.config ?? {};
  const isPhysical = product.type === "physical";
  const isCustom = product.type === "custom_product";
  const isLeadMagnet = product.type === "lead_magnet";
  const emailCapture =
    isLeadMagnet && (config.capture_method as string) === "email";

  const { data: session, isPending } = authClient.useSession();
  const telegramReady = Boolean(
    (session?.user as { telegramId?: string | null } | undefined)?.telegramId
  );

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [answer, setAnswer] = useState("");
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [ship, setShip] = useState({
    name: "",
    phone: "",
    address: "",
    city: "",
    notes: "",
    cod: false,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leadDownload, setLeadDownload] = useState<string | null>(null);

  const shippingFee = isPhysical ? Number(config.shipping_fee ?? 0) * quantity : 0;
  const itemTotal = unitPrice * quantity;
  const total = itemTotal + shippingFee;
  const isFree = total === 0 || isLeadMagnet;

  const requiredFieldsOk = customFields.every(
    (f) => (fieldValues[f.label] ?? "").trim().length > 0
  );

  const canSubmit = emailCapture
    ? email.includes("@")
    : telegramReady &&
      (!isPhysical || (ship.name && ship.phone && ship.address && ship.city)) &&
      (!isCustom || answer.trim().length > 0) &&
      requiredFieldsOk;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (emailCapture) {
        const res = await fetch("/api/lead-capture", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: product.id,
            name: name || undefined,
            email,
          }),
        });
        const body = await res.json().catch(() => ({}));
        if (res.ok) {
          setLeadDownload(body.downloadUrl ?? null);
          setBusy(false);
        } else {
          setError(t("errGeneric"));
          setBusy(false);
        }
        return;
      }

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [
            {
              productId: product.id,
              variantId,
              quantity,
              slot: slot ?? undefined,
              customAnswer: isCustom ? answer : undefined,
              customFields:
                Object.keys(fieldValues).length > 0 ? fieldValues : undefined,
            },
          ],
          locale,
          shipping: isPhysical
            ? {
                name: ship.name,
                phone: ship.phone,
                address: ship.address,
                city: ship.city,
                notes: ship.notes || undefined,
                cod: ship.cod,
              }
            : undefined,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.orderId) {
        window.location.assign(
          locale === "en"
            ? `/order/${body.orderId}`
            : `/${locale}/order/${body.orderId}`
        );
      } else {
        setError(
          body.error === "out_of_stock"
            ? t("outOfStock")
            : body.error === "telegram_required"
              ? t("telegramRequired")
              : t("errGeneric")
        );
        setBusy(false);
      }
    } catch {
      setError(t("errGeneric"));
      setBusy(false);
    }
  }

  const input =
    "w-full rounded-xl border border-black/15 bg-white px-3.5 py-3 text-sm text-neutral-900 outline-none focus:border-black/40";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-neutral-200" />
        <h2 className="text-lg font-bold text-neutral-900">{t("checkout")}</h2>

        {/* Lead magnet delivered instantly */}
        {leadDownload !== null ? (
          <div className="mt-4 text-center">
            <p className="text-3xl">🎁</p>
            <p className="mt-2 text-sm text-neutral-700">{t("leadReady")}</p>
            <a
              href={leadDownload}
              className="mt-4 block rounded-2xl py-3.5 font-bold"
              style={themeButton}
            >
              📥 {t("download")}
            </a>
          </div>
        ) : (
          <>
            {/* Summary */}
            <div className="mt-3 rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-700">
              <p className="font-semibold text-neutral-900">{product.title}</p>
              <div className="mt-2 space-y-1">
                <Row
                  label={`${t("item")} × ${quantity}`}
                  value={`${itemTotal.toLocaleString()} ${product.currency}`}
                />
                {shippingFee > 0 && (
                  <Row
                    label={t("shipping")}
                    value={`${shippingFee.toLocaleString()} ${product.currency}`}
                  />
                )}
                <div className="border-t border-neutral-200 pt-1">
                  <Row
                    bold
                    label={t("total")}
                    value={
                      isFree
                        ? t("free")
                        : `${total.toLocaleString()} ${product.currency}`
                    }
                  />
                </div>
              </div>
            </div>

            <form onSubmit={submit} className="mt-4 space-y-3">
              {error && (
                <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              )}

              {emailCapture ? (
                <>
                  <input
                    placeholder={t("yourName")}
                    value={name}
                    maxLength={80}
                    onChange={(e) => setName(e.target.value)}
                    className={input}
                  />
                  <input
                    type="email"
                    required
                    placeholder={t("yourEmail")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={input}
                  />
                </>
              ) : (
                /* Telegram identity step */
                <div className="rounded-2xl bg-neutral-50 p-3.5">
                  {isPending ? (
                    <p className="text-center text-sm text-neutral-500">…</p>
                  ) : telegramReady ? (
                    <p className="text-center text-sm font-medium text-emerald-700">
                      ✈️ {t("telegramConnected")}
                    </p>
                  ) : (
                    <div>
                      <p className="mb-2 text-center text-sm text-neutral-600">
                        {t("telegramToOrder")}
                      </p>
                      <TelegramLoginButton
                        botUsername={botUsername}
                        intent="customer"
                        redirectTo={
                          typeof window !== "undefined"
                            ? window.location.pathname
                            : undefined
                        }
                      />
                    </div>
                  )}
                </div>
              )}

              {!emailCapture && isCustom && (
                <textarea
                  required
                  rows={3}
                  maxLength={1000}
                  placeholder={(config.prompt as string) || t("yourAnswer")}
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  className={input}
                />
              )}

              {/* Creator's custom checkout fields */}
              {!emailCapture &&
                customFields.map((f) =>
                  f.field_type === "textarea" ? (
                    <textarea
                      key={f.label}
                      required
                      rows={2}
                      maxLength={1000}
                      placeholder={f.label}
                      value={fieldValues[f.label] ?? ""}
                      onChange={(e) =>
                        setFieldValues((v) => ({ ...v, [f.label]: e.target.value }))
                      }
                      className={input}
                    />
                  ) : (
                    <input
                      key={f.label}
                      required
                      type={
                        f.field_type === "email"
                          ? "email"
                          : f.field_type === "phone"
                            ? "tel"
                            : "text"
                      }
                      maxLength={200}
                      placeholder={f.label}
                      value={fieldValues[f.label] ?? ""}
                      onChange={(e) =>
                        setFieldValues((v) => ({ ...v, [f.label]: e.target.value }))
                      }
                      className={input}
                    />
                  )
                )}

              {!emailCapture && isPhysical && (
                <>
                  <input
                    required
                    placeholder={t("shipName")}
                    value={ship.name}
                    maxLength={80}
                    onChange={(e) => setShip({ ...ship, name: e.target.value })}
                    className={input}
                  />
                  <input
                    required
                    placeholder={t("shipPhone")}
                    value={ship.phone}
                    maxLength={30}
                    onChange={(e) => setShip({ ...ship, phone: e.target.value })}
                    className={input}
                  />
                  <input
                    required
                    placeholder={t("shipAddress")}
                    value={ship.address}
                    maxLength={300}
                    onChange={(e) => setShip({ ...ship, address: e.target.value })}
                    className={input}
                  />
                  <input
                    required
                    placeholder={t("shipCity")}
                    value={ship.city}
                    maxLength={80}
                    onChange={(e) => setShip({ ...ship, city: e.target.value })}
                    className={input}
                  />
                  <input
                    placeholder={t("shipNotes")}
                    value={ship.notes}
                    maxLength={300}
                    onChange={(e) => setShip({ ...ship, notes: e.target.value })}
                    className={input}
                  />
                  {Boolean(config.cod_enabled) && (
                    <label className="flex items-center gap-2.5 text-sm font-medium text-neutral-800">
                      <input
                        type="checkbox"
                        checked={ship.cod}
                        onChange={(e) => setShip({ ...ship, cod: e.target.checked })}
                        className="h-4 w-4"
                      />
                      {t("cod")}
                    </label>
                  )}
                </>
              )}

              <button
                disabled={!canSubmit || busy}
                className="w-full rounded-2xl py-4 text-base font-bold disabled:opacity-50"
                style={themeButton}
              >
                {busy ? "…" : t("placeOrder")}
              </button>
              <p className="text-center text-xs text-neutral-500">
                {emailCapture ? t("leadNote") : t("noPayNoteTg")}
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className={`flex justify-between ${bold ? "font-bold text-neutral-900" : ""}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

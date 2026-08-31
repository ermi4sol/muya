"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { authClient } from "@/lib/auth/client";
import { TelegramLoginButton } from "@/components/auth/TelegramLoginButton";
import { readCart, clearCart, type CartItem } from "@/lib/cart";

/** Cart checkout (UI page 17): summary + Telegram identity + shipping + COD. */
export function CartCheckout({
  slug,
  currency,
  botUsername,
  themeButton,
  themeCard,
}: {
  slug: string;
  currency: string;
  botUsername: string;
  themeButton: React.CSSProperties;
  themeCard: React.CSSProperties;
}) {
  const t = useTranslations("shop");
  const locale = useLocale();
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);
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

  const { data: session, isPending } = authClient.useSession();
  const telegramReady = Boolean(
    (session?.user as { telegramId?: string | null } | undefined)?.telegramId
  );

  useEffect(() => {
    setItems(readCart(slug));
    setReady(true);
  }, [slug]);

  if (!ready) return null;
  if (items.length === 0) {
    return <p className="mt-8 text-center text-sm opacity-70">{t("cartEmpty")}</p>;
  }

  const subtotal = items.reduce((a, i) => a + i.unitPrice * i.qty, 0);
  const shipping = items.reduce((a, i) => a + i.shippingFee * i.qty, 0);
  const total = subtotal + shipping;
  const codAvailable = items.every((i) => i.codEnabled);

  const canSubmit =
    telegramReady && ship.name && ship.phone && ship.address && ship.city && !busy;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({
            productId: i.productId,
            variantId: i.variantId,
            quantity: i.qty,
          })),
          locale,
          shipping: {
            name: ship.name,
            phone: ship.phone,
            address: ship.address,
            city: ship.city,
            notes: ship.notes || undefined,
            cod: ship.cod,
          },
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.orderId) {
        clearCart(slug);
        const base = locale === "en" ? "" : `/${locale}`;
        window.location.assign(
          `${base}/order/${body.orderId}${body.count > 1 ? `?group=${body.count}` : ""}`
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
    "w-full rounded-xl border border-current/20 bg-white/90 px-3.5 py-3 text-sm text-neutral-900 outline-none focus:border-current/50";

  return (
    <div className="mt-4 gap-6 md:grid md:grid-cols-2">
      {/* order summary */}
      <div className="rounded-2xl p-4 shadow-card" style={themeCard}>
        <p className="font-bold">{t("summary")}</p>
        <div className="mt-2 space-y-1.5 text-sm">
          {items.map((i) => (
            <div key={`${i.productId}:${i.variantId}`} className="flex justify-between gap-2">
              <span className="min-w-0 truncate opacity-80">
                {i.title}
                {Object.keys(i.attributes).length > 0
                  ? ` (${Object.values(i.attributes).join("/")})`
                  : ""}{" "}
                × {i.qty}
              </span>
              <span className="shrink-0 font-semibold">
                {(i.unitPrice * i.qty).toLocaleString()} {currency}
              </span>
            </div>
          ))}
          {shipping > 0 && (
            <div className="flex justify-between border-t border-current/15 pt-1.5">
              <span className="opacity-70">{t("shipping")}</span>
              <span className="font-semibold">
                {shipping.toLocaleString()} {currency}
              </span>
            </div>
          )}
          <div className="flex justify-between border-t border-current/15 pt-1.5 font-bold">
            <span>{t("total")}</span>
            <span>
              {total.toLocaleString()} {currency}
            </span>
          </div>
        </div>
      </div>

      {/* identity + shipping */}
      <form onSubmit={submit} className="mt-5 space-y-3 md:mt-0">
        {error && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <div className="rounded-2xl p-3.5 shadow-card" style={themeCard}>
          {isPending ? (
            <p className="text-center text-sm opacity-60">…</p>
          ) : telegramReady ? (
            <p className="text-center text-sm font-medium">
              ✈️ {t("telegramConnected")}
            </p>
          ) : (
            <div>
              <p className="mb-2 text-center text-sm opacity-80">
                {t("telegramToOrder")}
              </p>
              <TelegramLoginButton
                botUsername={botUsername}
                intent="customer"
                redirectTo={
                  typeof window !== "undefined" ? window.location.pathname : undefined
                }
              />
            </div>
          )}
        </div>

        <input required placeholder={t("shipName")} value={ship.name} maxLength={80}
          onChange={(e) => setShip({ ...ship, name: e.target.value })} className={input} />
        <input required placeholder={t("shipPhone")} value={ship.phone} maxLength={30}
          onChange={(e) => setShip({ ...ship, phone: e.target.value })} className={input} />
        <input required placeholder={t("shipAddress")} value={ship.address} maxLength={300}
          onChange={(e) => setShip({ ...ship, address: e.target.value })} className={input} />
        <input required placeholder={t("shipCity")} value={ship.city} maxLength={80}
          onChange={(e) => setShip({ ...ship, city: e.target.value })} className={input} />
        <input placeholder={t("shipNotes")} value={ship.notes} maxLength={300}
          onChange={(e) => setShip({ ...ship, notes: e.target.value })} className={input} />

        {codAvailable && (
          <label className="flex items-center gap-2.5 text-sm font-medium">
            <input
              type="checkbox"
              checked={ship.cod}
              onChange={(e) => setShip({ ...ship, cod: e.target.checked })}
              className="h-4 w-4"
            />
            {t("cod")}
          </label>
        )}

        <button
          disabled={!canSubmit}
          className="w-full rounded-2xl py-4 text-base font-bold shadow-card disabled:opacity-50"
          style={themeButton}
        >
          {busy ? "…" : t("placeOrder")}
        </button>
        <p className="text-center text-xs opacity-60">{t("noPayNoteTg")}</p>
      </form>
    </div>
  );
}

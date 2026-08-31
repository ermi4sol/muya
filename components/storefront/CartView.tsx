"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  readCart,
  updateQty,
  removeFromCart,
  onCartChange,
  type CartItem,
} from "@/lib/cart";

export function CartView({
  slug,
  currency,
  themeButton,
  themeCard,
}: {
  slug: string;
  currency: string;
  themeButton: React.CSSProperties;
  themeCard: React.CSSProperties;
}) {
  const t = useTranslations("shop");
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setItems(readCart(slug));
    setReady(true);
    return onCartChange(slug, () => setItems(readCart(slug)));
  }, [slug]);

  if (!ready) return null;

  if (items.length === 0) {
    return (
      <div className="mt-10 text-center">
        <p className="text-4xl">🛒</p>
        <p className="mt-3 text-sm opacity-70">{t("cartEmpty")}</p>
        <Link
          href={`/${slug}/shop`}
          className="mt-5 inline-block rounded-xl px-5 py-3 text-sm font-bold shadow-card"
          style={themeButton}
        >
          {t("browse")}
        </Link>
      </div>
    );
  }

  const subtotal = items.reduce((a, i) => a + i.unitPrice * i.qty, 0);
  const shipping = items.reduce((a, i) => a + i.shippingFee * i.qty, 0);

  return (
    <div className="mt-4 gap-6 md:grid md:grid-cols-[1fr_260px]">
      <div className="space-y-3">
        {items.map((i) => (
          <div
            key={`${i.productId}:${i.variantId}`}
            className="flex items-center gap-3 rounded-2xl p-3 shadow-card"
            style={themeCard}
          >
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl text-2xl">
              {i.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={i.image} alt="" className="h-full w-full object-cover" />
              ) : (
                "🛍️"
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{i.title}</p>
              {Object.keys(i.attributes).length > 0 && (
                <p className="truncate text-xs opacity-70">
                  {Object.values(i.attributes).join(" / ")}
                </p>
              )}
              <p className="mt-0.5 text-sm font-bold">
                {(i.unitPrice * i.qty).toLocaleString()} {currency}
              </p>
            </div>
            <div className="flex items-center overflow-hidden rounded-lg border border-current/25">
              <button
                onClick={() => updateQty(slug, i.productId, i.variantId, i.qty - 1)}
                className="px-2.5 py-1 font-bold opacity-70"
              >
                −
              </button>
              <span className="min-w-6 text-center text-sm font-semibold">
                {i.qty}
              </span>
              <button
                onClick={() => updateQty(slug, i.productId, i.variantId, i.qty + 1)}
                className="px-2.5 py-1 font-bold opacity-70"
              >
                +
              </button>
            </div>
            <button
              onClick={() => removeFromCart(slug, i.productId, i.variantId)}
              className="px-1.5 opacity-50 hover:opacity-100"
              aria-label={t("remove")}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className="mt-5 md:mt-0">
        <div className="rounded-2xl p-4 shadow-card" style={themeCard}>
          <div className="flex justify-between text-sm">
            <span className="opacity-70">{t("subtotal")}</span>
            <span className="font-semibold">
              {subtotal.toLocaleString()} {currency}
            </span>
          </div>
          {shipping > 0 && (
            <div className="mt-1.5 flex justify-between text-sm">
              <span className="opacity-70">{t("shipping")}</span>
              <span className="font-semibold">
                {shipping.toLocaleString()} {currency}
              </span>
            </div>
          )}
          <div className="mt-2 flex justify-between border-t border-current/15 pt-2">
            <span className="font-bold">{t("total")}</span>
            <span className="font-bold">
              {(subtotal + shipping).toLocaleString()} {currency}
            </span>
          </div>
          <Link
            href={`/${slug}/checkout`}
            className="mt-4 block rounded-xl py-3 text-center font-bold shadow-card"
            style={themeButton}
          >
            {t("checkout")}
          </Link>
        </div>
      </div>
    </div>
  );
}

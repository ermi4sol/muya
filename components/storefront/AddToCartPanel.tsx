"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { addToCart } from "@/lib/cart";
import type { VariantPublic } from "@/lib/db/storefront";

export function AddToCartPanel({
  slug,
  product,
  variants,
  attributeOrder,
  themeButton,
}: {
  slug: string;
  product: {
    id: string;
    title: string;
    image: string | null;
    price: number;
    discount_price: number | null;
    currency: string;
    shippingFee: number;
    codEnabled: boolean;
  };
  variants: VariantPublic[];
  attributeOrder: string[];
  themeButton: React.CSSProperties;
}) {
  const t = useTranslations("shop");
  const router = useRouter();
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const attributeValues = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const name of attributeOrder) {
      const values = new Set<string>();
      for (const v of variants) {
        const val = v.attribute_values[name];
        if (val) values.add(val);
      }
      map[name] = [...values];
    }
    return map;
  }, [variants, attributeOrder]);

  const hasVariants = variants.length > 0 && attributeOrder.length > 0;
  const complete =
    !hasVariants || attributeOrder.every((name) => selected[name]);

  const variant = useMemo(() => {
    if (!hasVariants) return null;
    if (!complete) return null;
    return (
      variants.find((v) =>
        attributeOrder.every((name) => v.attribute_values[name] === selected[name])
      ) ?? null
    );
  }, [variants, attributeOrder, selected, complete, hasVariants]);

  const basePrice = product.discount_price ?? product.price;
  const unitPrice = variant?.price_override != null
    ? Number(variant.price_override)
    : basePrice;
  const stock = hasVariants ? (variant?.stock_count ?? null) : null;
  const soldOut = hasVariants && complete && (stock ?? 0) <= 0;
  const maxQty = stock ?? 99;

  function add() {
    if (hasVariants && !variant) return;
    addToCart(slug, {
      productId: product.id,
      variantId: variant?.id ?? null,
      title: product.title,
      image: product.image,
      attributes: variant ? { ...selected } : {},
      unitPrice,
      qty: Math.min(qty, maxQty),
      maxQty,
      shippingFee: product.shippingFee,
      codEnabled: product.codEnabled,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2500);
  }

  return (
    <div className="space-y-4">
      {attributeOrder.map((name) => (
        <div key={name}>
          <p className="text-sm font-semibold">{name}</p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {(attributeValues[name] ?? []).map((val) => {
              const active = selected[name] === val;
              return (
                <button
                  key={val}
                  onClick={() =>
                    setSelected((s) => ({ ...s, [name]: active ? "" : val }))
                  }
                  className={`rounded-full border-2 px-3.5 py-1.5 text-sm font-semibold transition ${
                    active ? "" : "opacity-70"
                  }`}
                  style={
                    active
                      ? { ...themeButton, borderColor: "transparent" }
                      : { borderColor: "currentColor" }
                  }
                >
                  {val}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div className="flex items-center justify-between">
        <p className="text-xl font-bold">
          {unitPrice.toLocaleString()} {product.currency}
          {product.discount_price != null && variant?.price_override == null && (
            <span className="ml-2 text-sm font-normal opacity-60 line-through">
              {product.price.toLocaleString()} {product.currency}
            </span>
          )}
        </p>
        {complete && hasVariants && (
          <p className="text-sm">
            {soldOut ? (
              <span className="rounded-full bg-red-500/15 px-2.5 py-1 font-semibold text-red-600">
                {t("soldOut")}
              </span>
            ) : (
              <span className="opacity-70">{t("inStock", { n: stock ?? 0 })}</span>
            )}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center overflow-hidden rounded-xl border-2 border-current/30">
          <button
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="px-3.5 py-2 text-lg font-bold opacity-70"
          >
            −
          </button>
          <span className="min-w-8 text-center font-semibold">{qty}</span>
          <button
            onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
            className="px-3.5 py-2 text-lg font-bold opacity-70"
          >
            +
          </button>
        </div>
        <button
          onClick={add}
          disabled={!complete || soldOut}
          className="flex-1 rounded-xl py-3.5 font-bold shadow-card transition disabled:opacity-50"
          style={themeButton}
        >
          {added ? `✓ ${t("addedToCart")}` : t("addToCart")}
        </button>
      </div>

      {added && (
        <button
          onClick={() => router.push(`/${slug}/cart`)}
          className="w-full rounded-xl border-2 border-current/30 py-3 text-sm font-bold"
        >
          🛒 {t("viewCart")}
        </button>
      )}
    </div>
  );
}

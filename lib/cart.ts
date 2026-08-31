"use client";

/**
 * Client-side cart for a creator's Shop (physical products).
 * Stored in localStorage per store slug; checkout turns it into grouped
 * orders sharing one checkout_group_id (server-side, R4).
 */

export type CartItem = {
  productId: string;
  variantId: string | null;
  title: string;
  image: string | null;
  attributes: Record<string, string>;
  unitPrice: number;
  qty: number;
  maxQty: number; // stock cap at time of adding
  shippingFee: number;
  codEnabled: boolean;
};

const EVENT = "muya-cart-changed";

function key(slug: string) {
  return `muya_cart_${slug}`;
}

export function readCart(slug: string): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key(slug));
    const parsed = raw ? (JSON.parse(raw) as CartItem[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCart(slug: string, items: CartItem[]) {
  try {
    window.localStorage.setItem(key(slug), JSON.stringify(items));
  } catch {
    // storage unavailable — cart stays in-memory only for this page
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { slug } }));
}

export function cartCount(slug: string): number {
  return readCart(slug).reduce((a, i) => a + i.qty, 0);
}

export function addToCart(slug: string, item: CartItem) {
  const items = readCart(slug);
  const idx = items.findIndex(
    (i) => i.productId === item.productId && i.variantId === item.variantId
  );
  if (idx >= 0) {
    items[idx].qty = Math.min(items[idx].qty + item.qty, item.maxQty);
    items[idx].maxQty = item.maxQty;
    items[idx].unitPrice = item.unitPrice;
  } else {
    items.push(item);
  }
  writeCart(slug, items);
}

export function updateQty(slug: string, productId: string, variantId: string | null, qty: number) {
  const items = readCart(slug)
    .map((i) =>
      i.productId === productId && i.variantId === variantId
        ? { ...i, qty: Math.max(1, Math.min(qty, i.maxQty)) }
        : i
    );
  writeCart(slug, items);
}

export function removeFromCart(slug: string, productId: string, variantId: string | null) {
  writeCart(
    slug,
    readCart(slug).filter(
      (i) => !(i.productId === productId && i.variantId === variantId)
    )
  );
}

export function clearCart(slug: string) {
  writeCart(slug, []);
}

export function onCartChange(slug: string, cb: () => void): () => void {
  const handler = (e: Event) => {
    const detail = (e as CustomEvent).detail as { slug?: string } | undefined;
    if (!detail?.slug || detail.slug === slug) cb();
  };
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}

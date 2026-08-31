"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { cartCount, onCartChange } from "@/lib/cart";

/** Persistent cart icon with live item count (Shop hub + physical pages). */
export function CartBadge({
  slug,
  style,
}: {
  slug: string;
  style?: React.CSSProperties;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    setCount(cartCount(slug));
    return onCartChange(slug, () => setCount(cartCount(slug)));
  }, [slug]);

  return (
    <Link
      href={`/${slug}/cart`}
      className="relative inline-flex h-11 w-11 items-center justify-center rounded-full text-xl shadow-card"
      style={style}
      aria-label="Cart"
    >
      🛒
      {count > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}

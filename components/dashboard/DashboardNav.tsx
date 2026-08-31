"use client";

import { usePathname } from "next/navigation";
import { Link } from "@/i18n/navigation";

export type NavItem = { href: string; label: string; icon: string };

/** Active-state aware dashboard navigation (PC sidebar / mobile list). */
export function DashboardNav({
  items,
  orientation,
}: {
  items: NavItem[];
  orientation: "sidebar" | "list";
}) {
  const pathname = usePathname();
  // strip locale prefix for matching
  const path = pathname.replace(/^\/(am|om|ti|so)(?=\/|$)/, "") || "/";

  function isActive(href: string) {
    if (href === "/dashboard") return path === "/dashboard";
    return path === href || path.startsWith(`${href}/`);
  }

  if (orientation === "list") {
    return (
      <div className="grid grid-cols-2 gap-2.5">
        {items.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={`flex items-center gap-2.5 rounded-card border p-3.5 text-sm font-semibold shadow-card ${
              isActive(n.href)
                ? "border-primary-500 bg-primary-50 text-primary-700"
                : "border-line bg-surface text-ink"
            }`}
          >
            <span className="text-xl">{n.icon}</span>
            {n.label}
          </Link>
        ))}
      </div>
    );
  }

  return (
    <nav className="space-y-0.5">
      {items.map((n) => (
        <Link
          key={n.href}
          href={n.href}
          className={`flex items-center gap-2.5 rounded-control px-3 py-2.5 text-sm font-medium transition ${
            isActive(n.href)
              ? "bg-primary-600 font-semibold text-white"
              : "text-ink-soft hover:bg-primary-50 hover:text-primary-700"
          }`}
        >
          <span className="text-base leading-none">{n.icon}</span>
          {n.label}
        </Link>
      ))}
    </nav>
  );
}

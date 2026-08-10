import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getUserSession } from "@/lib/auth/session";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { Link } from "@/i18n/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getUserSession();
  if (!session || session.role !== "creator") {
    redirect("/signin");
  }
  const t = await getTranslations("dash");

  const nav = [
    { href: "/dashboard", label: t("navHome"), icon: "🏠" },
    { href: "/dashboard/store", label: t("navStore"), icon: "🏪" },
    { href: "/dashboard/orders", label: t("navOrders"), icon: "📦" },
    { href: "/dashboard/settings", label: t("navSettings"), icon: "⚙️" },
  ];

  return (
    <div className="min-h-dvh bg-bg pb-20 lg:pb-0">
      <header className="sticky top-0 z-20 border-b border-line/60 bg-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link
            href="/dashboard"
            className="font-heading text-xl font-bold text-primary-700"
          >
            MUYA
          </Link>
          {/* Desktop nav */}
          <nav className="hidden gap-1 lg:flex">
            {nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="rounded-control px-3 py-1.5 text-sm font-medium text-ink-soft hover:bg-primary-50 hover:text-primary-700"
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <form action="/api/auth/logout" method="post">
              <button className="rounded-control px-2.5 py-1.5 text-sm font-medium text-ink-faint hover:bg-primary-50 hover:text-primary-700">
                {t("signOut")}
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface lg:hidden">
        <div className="mx-auto flex max-w-md">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium text-ink-soft"
            >
              <span className="text-lg leading-none">{n.icon}</span>
              {n.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

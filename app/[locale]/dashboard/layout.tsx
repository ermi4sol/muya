import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getUserSession } from "@/lib/auth/session";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { Link } from "@/i18n/navigation";
import { DashboardNav } from "@/components/dashboard/DashboardNav";

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
    { href: "/dashboard/shop", label: t("navShop"), icon: "🛍️" },
    { href: "/dashboard/orders", label: t("navOrders"), icon: "📦" },
    { href: "/dashboard/income", label: t("navIncome"), icon: "💰" },
    { href: "/dashboard/analytics", label: t("navAnalytics"), icon: "📊" },
    { href: "/dashboard/audience", label: t("navAudience"), icon: "👥" },
    { href: "/dashboard/appointments", label: t("navAppointments"), icon: "🗓️" },
    { href: "/dashboard/funnels", label: t("navFunnels"), icon: "🪜" },
    { href: "/dashboard/referrals", label: t("navReferrals"), icon: "🤝" },
    { href: "/dashboard/flows", label: t("navFlows"), icon: "✈️" },
    { href: "/dashboard/settings", label: t("navSettings"), icon: "⚙️" },
  ];

  return (
    <div className="min-h-dvh bg-bg pb-20 lg:pb-0">
      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-line/60 bg-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-3">
          <Link
            href="/dashboard"
            className="font-heading text-xl font-bold text-primary-700"
          >
            MUYA
          </Link>
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

      <div className="mx-auto flex max-w-[1400px]">
        {/* PC sidebar — the full v2 tab set */}
        <aside className="sticky top-[57px] hidden h-[calc(100dvh-57px)] w-56 shrink-0 overflow-y-auto border-r border-line/60 px-3 py-5 lg:block">
          <DashboardNav items={nav} orientation="sidebar" />
        </aside>

        <main className="min-w-0 flex-1 px-4 py-6">{children}</main>
      </div>

      {/* Mobile bottom nav (5 key tabs + More) */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface lg:hidden">
        <div className="mx-auto flex max-w-md">
          {[nav[0], nav[1], nav[2], nav[4]].map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium text-ink-soft"
            >
              <span className="text-lg leading-none">{n.icon}</span>
              {n.label}
            </Link>
          ))}
          <Link
            href="/dashboard/menu"
            className="flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium text-ink-soft"
          >
            <span className="text-lg leading-none">☰</span>
            {t("navMore")}
          </Link>
        </div>
      </nav>
    </div>
  );
}

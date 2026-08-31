import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { getUserSession } from "@/lib/auth/session";
import { DashboardNav } from "@/components/dashboard/DashboardNav";

/** Mobile "More" menu — every dashboard tab as a card grid. */
export default async function DashboardMenuPage() {
  const session = await getUserSession();
  if (!session || session.role !== "creator") redirect("/signin");
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
    <div className="mx-auto max-w-2xl">
      <h1 className="font-heading text-2xl font-bold text-ink">{t("navMore")}</h1>
      <div className="mt-4">
        <DashboardNav items={nav} orientation="list" />
      </div>
    </div>
  );
}

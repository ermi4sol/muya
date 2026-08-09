import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { getUserSession } from "@/lib/auth/session";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";

export default async function DashboardPage() {
  const session = await getUserSession();
  if (!session || session.role !== "creator") {
    redirect("/signin");
  }
  const t = await getTranslations("dashboard");

  return (
    <div className="min-h-dvh bg-bg">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <span className="font-heading text-2xl font-bold text-primary-700">
          MUYA
        </span>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <form action="/api/auth/logout" method="post">
            <button className="rounded-control px-3 py-1.5 text-sm font-medium text-primary-700 hover:bg-primary-50">
              {t("signOut")}
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-10">
        <div className="rounded-card border border-line bg-surface p-6 shadow-card">
          <h1 className="text-2xl font-bold text-ink">
            {t("welcome")} 👋
          </h1>
          <p className="mt-1 text-ink-soft">{session.email}</p>
          <p className="mt-4 rounded-control bg-primary-50 px-4 py-3 text-sm text-primary-800">
            {t("building")}
          </p>
        </div>
      </main>
    </div>
  );
}

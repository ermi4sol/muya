import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { getUserSession } from "@/lib/auth/session";

export default async function AccountPage() {
  const session = await getUserSession();
  if (!session) {
    redirect("/signin");
  }
  const t = await getTranslations("account");

  return (
    <div className="min-h-dvh bg-bg">
      <header className="mx-auto max-w-3xl px-4 py-4">
        <span className="font-heading text-2xl font-bold text-primary-700">
          MUYA
        </span>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-bold text-ink">{t("title")}</h1>
        <div className="mt-6 rounded-card border border-line bg-surface p-6 text-ink-soft shadow-card">
          {t("empty")}
        </div>
      </main>
    </div>
  );
}

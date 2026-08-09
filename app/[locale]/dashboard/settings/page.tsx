import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getUserSession } from "@/lib/auth/session";
import { getCreator } from "@/lib/db/creator";
import { SettingsForm } from "@/components/dashboard/SettingsForm";

export default async function SettingsPage() {
  const session = await getUserSession();
  if (!session || session.role !== "creator") redirect("/signin");
  const creator = await getCreator(session.sub);
  if (!creator) redirect("/signin");
  const t = await getTranslations("dash");

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="font-heading text-2xl font-bold text-ink">
        {t("setTitle")}
      </h1>

      <SettingsForm currentLocale={creator.preferred_locale} />

      <div className="rounded-card border border-line bg-surface p-5 shadow-card">
        <p className="text-sm font-medium text-ink-soft">{t("plan")}</p>
        <p className="mt-1.5 rounded-control bg-accent-100 px-3 py-2.5 text-sm font-semibold text-accent-900">
          {t("planFree")}
        </p>
      </div>

      <div className="rounded-card border border-line bg-surface p-5 shadow-card">
        <p className="text-sm font-medium text-ink-soft">{t("integrations")}</p>
        <div className="mt-2 space-y-2">
          {["Google Calendar", "Zoom"].map((name) => (
            <div
              key={name}
              className="flex items-center justify-between rounded-control border border-line px-3.5 py-3"
            >
              <span className="text-sm font-medium text-ink">{name}</span>
              <span className="text-xs text-ink-faint">{t("soon")}</span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-ink-faint">{t("intgSoon")}</p>
      </div>
    </div>
  );
}

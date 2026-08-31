import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getUserSession } from "@/lib/auth/session";
import { getCreator } from "@/lib/db/creator";
import { supabaseAdmin } from "@/lib/db/client";
import { Link } from "@/i18n/navigation";
import { SettingsForm } from "@/components/dashboard/SettingsForm";
import { IntegrationCards } from "@/components/dashboard/IntegrationCards";
import { PayoutDetailsForm } from "@/components/dashboard/PayoutDetailsForm";
import { NotificationPrefs } from "@/components/dashboard/NotificationPrefs";

export const dynamic = "force-dynamic";

const TABS = ["profile", "integrations", "billing", "payout", "notifications"] as const;
type Tab = (typeof TABS)[number];

/** Settings v2 (UI page 35): tabs — Profile, Integrations, Billing, Payout, Telegram Notifications. */
export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await getUserSession();
  if (!session || session.role !== "creator") redirect("/signin");
  const creator = await getCreator(session.sub);
  if (!creator) redirect("/signin");
  const t = await getTranslations("dash");
  const { tab: rawTab } = await searchParams;
  const tab: Tab = TABS.includes(rawTab as Tab) ? (rawTab as Tab) : "profile";

  const { data: googleIntg } =
    tab === "integrations"
      ? await supabaseAdmin()
          .from("creator_integrations")
          .select("id, external_account_email")
          .eq("creator_id", creator.id)
          .eq("provider", "google_calendar")
          .maybeSingle()
      : { data: null };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="font-heading text-2xl font-bold text-ink">{t("setTitle")}</h1>

      {/* tab row (PC) / scrollable (mobile) */}
      <div className="flex gap-1 overflow-x-auto rounded-card border border-line bg-surface p-1 shadow-card">
        {TABS.map((k) => (
          <Link
            key={k}
            href={k === "profile" ? "/dashboard/settings" : `/dashboard/settings?tab=${k}`}
            className={`shrink-0 rounded-control px-3.5 py-2 text-sm font-semibold ${
              tab === k
                ? "bg-primary-600 text-white"
                : "text-ink-soft hover:bg-primary-50"
            }`}
          >
            {t(`setTab_${k}`)}
          </Link>
        ))}
      </div>

      {tab === "profile" && (
        <>
          <div className="rounded-card border border-line bg-surface p-5 shadow-card">
            <p className="text-sm font-medium text-ink-soft">{t("telegramAccount")}</p>
            <p className="mt-1.5 rounded-control bg-primary-50 px-3 py-2.5 text-sm font-semibold text-primary-800">
              ✈️{" "}
              {creator.telegram_username
                ? `@${creator.telegram_username}`
                : `Telegram ID ${creator.telegram_user_id}`}
            </p>
            <p className="mt-1.5 text-xs text-ink-faint">{t("telegramAccountNote")}</p>
          </div>
          <SettingsForm currentLocale={creator.preferred_locale} />
          <div className="rounded-card border border-line bg-surface p-5 shadow-card">
            <p className="text-sm font-medium text-ink-soft">{t("storeProfileHint")}</p>
            <Link
              href="/dashboard/store"
              className="mt-2 inline-block rounded-control border border-primary-600 px-4 py-2.5 text-sm font-semibold text-primary-700 hover:bg-primary-50"
            >
              🏪 {t("navStore")}
            </Link>
          </div>
        </>
      )}

      {tab === "integrations" && (
        <IntegrationCards
          googleConnected={Boolean(googleIntg)}
          googleEmail={googleIntg?.external_account_email ?? null}
        />
      )}

      {tab === "billing" && (
        <div className="rounded-card border border-line bg-surface p-5 shadow-card">
          <p className="text-sm font-medium text-ink-soft">{t("plan")}</p>
          <p className="mt-1.5 rounded-control bg-accent-100 px-3 py-2.5 text-sm font-semibold text-accent-900">
            {t("planFree")}
          </p>
        </div>
      )}

      {tab === "payout" && (
        <div className="rounded-card border border-line bg-surface p-5 shadow-card">
          <p className="mb-3 text-sm font-medium text-ink-soft">{t("payoutDefaults")}</p>
          <PayoutDetailsForm initial={creator.payout_details ?? {}} />
        </div>
      )}

      {tab === "notifications" && (
        <div className="rounded-card border border-line bg-surface p-5 shadow-card">
          <p className="mb-3 text-sm font-medium text-ink-soft">
            ✈️ {t("setTab_notifications")}
          </p>
          <NotificationPrefs initial={creator.notification_prefs ?? {}} />
        </div>
      )}
    </div>
  );
}

import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { use } from "react";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";

export default function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(params);
  setRequestLocale(locale);
  return <Landing />;
}

function Landing() {
  const t = useTranslations();
  const steps = [1, 2, 3, 4] as const;

  return (
    <div className="min-h-dvh bg-bg">
      {/* Header */}
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <span className="font-heading text-2xl font-bold tracking-tight text-primary-700">
          {t("common.appName")}
        </span>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <button className="rounded-control px-3 py-1.5 text-sm font-medium text-primary-700 hover:bg-primary-50">
            {t("nav.signIn")}
          </button>
          <button className="rounded-control bg-accent-400 px-3 py-1.5 text-sm font-semibold text-ink shadow-card hover:bg-accent-300">
            {t("nav.signUp")}
          </button>
        </div>
      </header>

      {/* Hero */}
      <main className="mx-auto max-w-5xl px-4">
        <section className="py-16 text-center sm:py-24">
          <h1 className="mx-auto max-w-2xl text-4xl font-bold leading-tight text-ink sm:text-5xl">
            {t("landing.heroTitle")}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-ink-soft sm:text-lg">
            {t("landing.heroSubtitle")}
          </p>
          <button className="mt-8 rounded-card bg-primary-600 px-6 py-3.5 text-base font-semibold text-white shadow-card transition hover:bg-primary-700">
            {t("landing.heroCta")}
          </button>
        </section>

        {/* How it works */}
        <section className="pb-20">
          <h2 className="text-center text-2xl font-bold text-ink">
            {t("landing.howItWorksTitle")}
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((n) => (
              <div
                key={n}
                className="rounded-card border border-line bg-surface p-5 shadow-card"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-50 font-heading text-sm font-bold text-primary-700">
                  {n}
                </div>
                <h3 className="mt-3 font-semibold text-ink">
                  {t(`landing.step${n}Title`)}
                </h3>
                <p className="mt-1 text-sm text-ink-soft">
                  {t(`landing.step${n}Body`)}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-line py-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 text-sm text-ink-faint">
          <span>
            © {new Date().getFullYear()} {t("common.appName")} —{" "}
            {t("landing.footerRights")}
          </span>
          <LanguageSwitcher />
        </div>
      </footer>
    </div>
  );
}

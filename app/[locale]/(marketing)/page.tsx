import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { use } from "react";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { Link } from "@/i18n/navigation";

export default function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(params);
  setRequestLocale(locale);
  return <Landing />;
}

const PRODUCT_ICONS = ["📥", "🎁", "🗓️", "🎓", "🎥", "🤝", "🔗", "🛍️", "✨"];

function Landing() {
  const t = useTranslations();
  const steps = [1, 2, 3, 4] as const;
  const products = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

  return (
    <div className="min-h-dvh bg-bg">
      {/* ===== Header ===== */}
      <header className="sticky top-0 z-20 border-b border-line/60 bg-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <span className="font-heading text-2xl font-bold tracking-tight text-primary-700">
            {t("common.appName")}
          </span>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Link
              href="/signin"
              className="hidden rounded-control px-3 py-1.5 text-sm font-medium text-primary-700 hover:bg-primary-50 sm:block"
            >
              {t("nav.signIn")}
            </Link>
            <Link
              href="/signup"
              className="rounded-control bg-accent-400 px-3 py-1.5 text-sm font-semibold text-ink shadow-card hover:bg-accent-300"
            >
              {t("nav.signUp")}
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* ===== Hero ===== */}
        <section className="mx-auto grid max-w-5xl items-center gap-10 px-4 py-14 sm:py-20 lg:grid-cols-2">
          <div className="text-center lg:text-left">
            <h1 className="mx-auto max-w-xl text-4xl font-bold leading-tight text-ink sm:text-5xl lg:mx-0">
              {t("landing.heroTitle")}
            </h1>
            <p className="mx-auto mt-4 max-w-lg text-base text-ink-soft sm:text-lg lg:mx-0">
              {t("landing.heroSubtitle")}
            </p>
            <Link
              href="/signup"
              className="mt-8 inline-block rounded-card bg-primary-600 px-7 py-4 text-base font-semibold text-white shadow-card transition hover:bg-primary-700"
            >
              {t("landing.heroCta")}
            </Link>
          </div>

          {/* Phone mockup of a sample storefront (pure CSS, no images) */}
          <div className="mx-auto w-64 select-none">
            <div className="rounded-[2.2rem] border-8 border-ink/90 bg-bg p-3 shadow-card">
              <div className="mx-auto mb-3 h-1.5 w-16 rounded-full bg-ink/20" />
              <div className="flex flex-col items-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-100 text-2xl">
                  👩🏾‍🍳
                </div>
                <p className="mt-1.5 font-heading text-sm font-bold text-ink">
                  Chef Sara
                </p>
                <p className="text-[10px] text-ink-faint">@chefsara · Addis Ababa</p>
              </div>
              <div className="mt-3 space-y-2">
                {[
                  ["🍲", "Injera Masterclass", "350 ETB"],
                  ["📥", "Recipe eBook", "120 ETB"],
                  ["🗓️", "1:1 Cooking Call", "500 ETB"],
                  ["🎁", "Free Spice Guide", "Free"],
                ].map(([icon, title, price]) => (
                  <div
                    key={title}
                    className="flex items-center gap-2 rounded-xl border border-line bg-surface p-2 shadow-card"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50 text-sm">
                      {icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-semibold text-ink">
                        {title}
                      </p>
                      <p className="text-[10px] text-ink-faint">{price}</p>
                    </div>
                    <span className="rounded-md bg-accent-400 px-2 py-1 text-[9px] font-bold text-ink">
                      →
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ===== How it works ===== */}
        <section className="border-y border-line/60 bg-surface/60">
          <div className="mx-auto max-w-5xl px-4 py-14">
            <h2 className="text-center text-2xl font-bold text-ink sm:text-3xl">
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
          </div>
        </section>

        {/* ===== Nine product types ===== */}
        <section className="mx-auto max-w-5xl px-4 py-14">
          <h2 className="text-center text-2xl font-bold text-ink sm:text-3xl">
            {t("landing2.productsTitle")}
          </h2>
          <p className="mt-2 text-center text-ink-soft">
            {t("landing2.productsSub")}
          </p>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {products.map((n) => (
              <div
                key={n}
                className="flex flex-col items-center rounded-card border border-line bg-surface p-4 shadow-card"
              >
                <span className="text-2xl">{PRODUCT_ICONS[n - 1]}</span>
                <span className="mt-2 text-sm font-semibold text-ink">
                  {t(`landing2.p${n}`)}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ===== Pricing ===== */}
        <section className="border-t border-line/60 bg-surface/60">
          <div className="mx-auto max-w-5xl px-4 py-14">
            <h2 className="text-center text-2xl font-bold text-ink sm:text-3xl">
              {t("landing2.pricingTitle")}
            </h2>
            <p className="mx-auto mt-4 max-w-xl rounded-card bg-accent-100 px-4 py-3 text-center text-sm font-medium text-accent-900">
              {t("landing2.freeBanner")}
            </p>
            <div className="mt-8 grid gap-4 lg:grid-cols-3">
              {/* Free */}
              <TierCard
                name={t("landing2.tierFree")}
                price={t("landing2.price0")}
                features={[
                  t("landing2.f_store"),
                  t("landing2.f_analytics"),
                  t("landing2.f_community"),
                  t("landing2.f_payout"),
                ]}
                cta={t("landing2.getStarted")}
              />
              {/* Growth */}
              <TierCard
                name={t("landing2.tierGrowth")}
                price={t("landing2.comingSoon")}
                highlight
                badge={t("landing2.mostPopular")}
                features={[
                  t("landing2.f_email"),
                  t("landing2.f_discount"),
                  t("landing2.f_affiliate"),
                ]}
                cta={t("landing2.getStarted")}
              />
              {/* Business */}
              <TierCard
                name={t("landing2.tierBusiness")}
                price={t("landing2.comingSoon")}
                features={[
                  t("landing2.f_brand"),
                  t("landing2.f_autodm"),
                  t("landing2.f_priority"),
                  t("landing2.f_staff"),
                ]}
                cta={t("landing2.getStarted")}
              />
            </div>
          </div>
        </section>
      </main>

      {/* ===== Footer ===== */}
      <footer className="border-t border-line py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-4 text-sm text-ink-faint sm:flex-row">
          <span className="font-heading text-lg font-bold text-primary-700">
            {t("common.appName")}
          </span>
          <div className="flex items-center gap-4">
            <Link href="/terms" className="hover:text-ink-soft">
              {t("landing2.terms")}
            </Link>
            <Link href="/support" className="hover:text-ink-soft">
              {t("landing2.support")}
            </Link>
            <LanguageSwitcher />
          </div>
          <span>
            © {new Date().getFullYear()} {t("common.appName")} —{" "}
            {t("landing.footerRights")}
          </span>
        </div>
      </footer>
    </div>
  );
}

function TierCard({
  name,
  price,
  features,
  cta,
  highlight,
  badge,
}: {
  name: string;
  price: string;
  features: string[];
  cta: string;
  highlight?: boolean;
  badge?: string;
}) {
  return (
    <div
      className={`relative rounded-card border bg-surface p-6 shadow-card ${
        highlight ? "border-2 border-primary-500" : "border-line"
      }`}
    >
      {badge && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary-600 px-3 py-0.5 text-xs font-semibold text-white">
          {badge}
        </span>
      )}
      <h3 className="font-heading text-lg font-bold text-ink">{name}</h3>
      <p className="mt-1 text-2xl font-bold text-primary-700">{price}</p>
      <ul className="mt-4 space-y-2">
        {features.map((f) => (
          <li key={f} className="flex gap-2 text-sm text-ink-soft">
            <span className="text-success">✓</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <Link
        href="/signup"
        className={`mt-6 block rounded-control py-2.5 text-center text-sm font-semibold ${
          highlight
            ? "bg-primary-600 text-white hover:bg-primary-700"
            : "border border-primary-600 text-primary-700 hover:bg-primary-50"
        }`}
      >
        {cta}
      </Link>
    </div>
  );
}

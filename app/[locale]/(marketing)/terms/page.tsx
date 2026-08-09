import { Link } from "@/i18n/navigation";

export default function TermsPage() {
  return (
    <div className="min-h-dvh bg-bg">
      <header className="mx-auto max-w-3xl px-4 py-4">
        <Link
          href="/"
          className="font-heading text-2xl font-bold text-primary-700"
        >
          MUYA
        </Link>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-bold text-ink">Terms of Service</h1>
        <div className="prose mt-4 max-w-none text-sm leading-6 text-ink-soft">
          <p>
            MUYA is a marketplace platform that lets creators sell products and
            services through their storefront link. By using MUYA as a creator
            or a customer you agree to use the platform lawfully and honestly.
          </p>
          <p className="mt-3">
            Creators are responsible for the products they list and deliver.
            MUYA charges a 7% commission on each sale and processes creator
            payouts on request. Orders are confirmed by the MUYA team before
            fulfillment.
          </p>
          <p className="mt-3">
            A complete Terms of Service document will be published before
            public launch. For questions, contact support.
          </p>
        </div>
      </main>
    </div>
  );
}

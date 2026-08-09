import { Link } from "@/i18n/navigation";

export default function SupportPage() {
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
        <h1 className="text-2xl font-bold text-ink">Support</h1>
        <p className="mt-4 text-sm leading-6 text-ink-soft">
          Need help with your store, an order, or your account? Email us and
          we&apos;ll get back to you as soon as we can.
        </p>
        <a
          href="mailto:ermiyas4solomon@gmail.com"
          className="mt-6 inline-block rounded-control bg-primary-600 px-5 py-3 text-sm font-semibold text-white shadow-card hover:bg-primary-700"
        >
          Email MUYA support
        </a>
      </main>
    </div>
  );
}

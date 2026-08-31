import { notFound } from "next/navigation";
import { getStorefront } from "@/lib/db/storefront";
import { themeOf } from "@/lib/themes";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { CartView } from "@/components/storefront/CartView";

export const revalidate = 60;

/** Cart page (UI page 16). */
export default async function CartPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const store = await getStorefront(slug);
  if (!store) notFound();
  const t = await getTranslations("shop");
  const th = themeOf(store.creator.theme?.preset);

  return (
    <div className="min-h-dvh" style={{ background: th.bg, color: th.ink }}>
      <div className="mx-auto max-w-3xl px-4 py-6">
        <Link
          href={`/${slug}/shop`}
          className="text-sm font-semibold opacity-70 hover:opacity-100"
        >
          ← {t("shopCardTitle")}
        </Link>
        <h1 className="mt-3 font-heading text-2xl font-bold">🛒 {t("cart")}</h1>
        <CartView
          slug={slug}
          currency={store.creator.currency}
          themeButton={{ background: th.button, color: th.buttonText }}
          themeCard={{ background: th.card }}
        />
        <p className="mt-10 text-center text-xs opacity-50">{t("poweredBy")}</p>
      </div>
    </div>
  );
}

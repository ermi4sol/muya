import { notFound } from "next/navigation";
import { getStorefront } from "@/lib/db/storefront";
import { themeOf } from "@/lib/themes";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { CartCheckout } from "@/components/storefront/CartCheckout";
import { env } from "@/lib/env";

export const revalidate = 60;

export default async function CheckoutPage({
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
          href={`/${slug}/cart`}
          className="text-sm font-semibold opacity-70 hover:opacity-100"
        >
          ← {t("cart")}
        </Link>
        <h1 className="mt-3 font-heading text-2xl font-bold">{t("checkout")}</h1>
        <CartCheckout
          slug={slug}
          currency={store.creator.currency}
          botUsername={env.telegramBotUsername()}
          themeButton={{ background: th.button, color: th.buttonText }}
          themeCard={{ background: th.card }}
        />
        <p className="mt-10 text-center text-xs opacity-50">{t("poweredBy")}</p>
      </div>
    </div>
  );
}

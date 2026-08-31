import { notFound } from "next/navigation";
import { getStorefront } from "@/lib/db/storefront";
import { themeOf } from "@/lib/themes";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { CartBadge } from "@/components/storefront/CartBadge";

export const revalidate = 60;

/** Shop hub — the creator's physical products in a grid (UI page 14). */
export default async function ShopHubPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const store = await getStorefront(slug);
  if (!store) notFound();
  const t = await getTranslations("shop");
  const { creator, products } = store;
  const th = themeOf(creator.theme?.preset);
  const physicals = products.filter((p) => p.type === "physical");

  return (
    <div className="min-h-dvh" style={{ background: th.bg, color: th.ink }}>
      <div className="mx-auto max-w-4xl px-4 py-6">
        <div className="flex items-center justify-between">
          <Link
            href={`/${slug}`}
            className="text-sm font-semibold opacity-70 hover:opacity-100"
          >
            ← {creator.display_name ?? slug}
          </Link>
          <CartBadge slug={slug} style={{ background: th.card, color: th.ink }} />
        </div>

        <h1 className="mt-4 font-heading text-2xl font-bold">
          🛍️ {t("shopCardTitle")}
        </h1>

        {physicals.length === 0 ? (
          <p className="mt-8 text-center text-sm opacity-70">{t("shopEmpty")}</p>
        ) : (
          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {physicals.map((p) => {
              const image = p.thumbnail_url ?? p.hero_image_url;
              return (
                <Link key={p.id} href={`/${slug}/shop/${p.id}`} className="block">
                  <div
                    className="overflow-hidden rounded-2xl shadow-card transition hover:scale-[1.02]"
                    style={{ background: th.card }}
                  >
                    <div className="flex aspect-square w-full items-center justify-center text-4xl">
                      {image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={image} alt="" className="h-full w-full object-cover" />
                      ) : (
                        "🛍️"
                      )}
                    </div>
                    <div className="p-3">
                      <p className="truncate text-sm font-semibold">{p.title}</p>
                      <p className="mt-0.5 text-xs opacity-70">
                        {t("from")}{" "}
                        {Number(p.discount_price ?? p.price).toLocaleString()}{" "}
                        {p.currency}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <p className="mt-10 text-center text-xs opacity-50">{t("poweredBy")}</p>
      </div>
    </div>
  );
}

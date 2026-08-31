import { notFound } from "next/navigation";
import { getPublicProduct } from "@/lib/db/storefront";
import { themeOf } from "@/lib/themes";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { CartBadge } from "@/components/storefront/CartBadge";
import { AddToCartPanel } from "@/components/storefront/AddToCartPanel";

export const revalidate = 60;

/** Physical product detail — gallery, attribute pills, stock, add to cart (UI page 15). */
export default async function PhysicalDetailPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const data = await getPublicProduct(slug, id);
  if (!data || data.product.type !== "physical") notFound();
  const t = await getTranslations("shop");
  const { creator, product, variants, attributeOrder } = data;
  const th = themeOf(creator.theme?.preset);
  const config = (product.config ?? {}) as Record<string, unknown>;

  const gallery = [product.hero_image_url, product.thumbnail_url].filter(
    Boolean
  ) as string[];

  return (
    <div className="min-h-dvh" style={{ background: th.bg, color: th.ink }}>
      <div className="mx-auto max-w-4xl px-4 py-6">
        <div className="flex items-center justify-between">
          <Link
            href={`/${slug}/shop`}
            className="text-sm font-semibold opacity-70 hover:opacity-100"
          >
            ← {t("shopCardTitle")}
          </Link>
          <CartBadge slug={slug} style={{ background: th.card, color: th.ink }} />
        </div>

        <div className="mt-4 gap-8 md:grid md:grid-cols-2">
          {/* gallery */}
          <div>
            {gallery.length > 0 ? (
              <div className="space-y-3">
                {gallery.map((src, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={src}
                    alt=""
                    className={`w-full rounded-2xl object-cover shadow-card ${
                      i === 0 ? "aspect-square" : "aspect-video"
                    }`}
                  />
                ))}
              </div>
            ) : (
              <div
                className="flex aspect-square w-full items-center justify-center rounded-2xl text-6xl shadow-card"
                style={{ background: th.card }}
              >
                🛍️
              </div>
            )}
          </div>

          {/* details */}
          <div className="mt-5 md:mt-0">
            <h1 className="font-heading text-2xl font-bold">{product.title}</h1>
            {product.subtitle && (
              <p className="mt-1 text-sm opacity-70">{product.subtitle}</p>
            )}
            {product.description_body && (
              <p className="mt-3 whitespace-pre-line text-[15px] leading-6 opacity-85">
                {product.description_body}
              </p>
            )}

            <div className="mt-5">
              <AddToCartPanel
                slug={slug}
                product={{
                  id: product.id,
                  title: product.title,
                  image: product.thumbnail_url ?? product.hero_image_url,
                  price: Number(product.price),
                  discount_price:
                    product.discount_price != null
                      ? Number(product.discount_price)
                      : null,
                  currency: product.currency,
                  shippingFee: Number(config.shipping_fee ?? 0),
                  codEnabled: Boolean(config.cod_enabled),
                }}
                variants={variants}
                attributeOrder={attributeOrder}
                themeButton={{ background: th.button, color: th.buttonText }}
              />
            </div>
          </div>
        </div>

        <p className="mt-10 text-center text-xs opacity-50">{t("poweredBy")}</p>
      </div>
    </div>
  );
}

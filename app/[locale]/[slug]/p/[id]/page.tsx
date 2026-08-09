import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getPublicProduct } from "@/lib/db/storefront";
import { themeOf } from "@/lib/themes";
import { Link } from "@/i18n/navigation";
import { BuyPanel } from "@/components/storefront/BuyPanel";

export const revalidate = 60;

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string; id: string; locale: string }>;
}) {
  const { slug, id, locale } = await params;
  const data = await getPublicProduct(slug, id);
  if (!data) notFound();
  const t = await getTranslations("shop");
  const { creator, product, variants, attributeOrder } = data;
  const th = themeOf(creator.theme?.preset);
  const config = (product.config ?? {}) as Record<string, unknown>;

  const included =
    product.type === "membership" ? ((config.included as string[]) ?? []) : [];
  const startsAt =
    product.type === "webinar" && config.starts_at
      ? new Date(config.starts_at as string)
      : null;

  return (
    <div className="min-h-dvh" style={{ background: th.bg, color: th.ink }}>
      <div className="mx-auto max-w-md px-4 py-6 pb-28">
        <Link
          href={`/${slug}`}
          className="text-sm font-semibold opacity-70 hover:opacity-100"
        >
          ← {creator.display_name ?? slug}
        </Link>

        {Boolean(config.image_url) && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={config.image_url as string}
            alt=""
            className="mt-4 aspect-video w-full rounded-2xl object-cover shadow-card"
          />
        )}

        <h1 className="mt-4 font-heading text-2xl font-bold">{product.title}</h1>

        {startsAt && (
          <p
            className="mt-2 inline-block rounded-full px-3 py-1 text-sm font-semibold"
            style={{ background: th.card, color: th.accent }}
          >
            🔴 {t("webinarAt")}{" "}
            {new Intl.DateTimeFormat(locale, {
              weekday: "long", month: "long", day: "numeric",
              hour: "2-digit", minute: "2-digit",
            }).format(startsAt)}
            {config.duration_minutes
              ? ` · ${t("duration", { n: config.duration_minutes as number })}`
              : ""}
          </p>
        )}

        {product.type === "custom_product" && Boolean(config.turnaround_days) && (
          <p className="mt-2 text-sm opacity-70">
            ⏱️ {t("turnaround", { n: config.turnaround_days as number })}
          </p>
        )}

        {product.description && (
          <p className="mt-3 whitespace-pre-line text-[15px] leading-6 opacity-85">
            {product.description}
          </p>
        )}

        {included.length > 0 && (
          <div className="mt-4 rounded-2xl p-4" style={{ background: th.card }}>
            <p className="text-sm font-bold">{t("included")}</p>
            <ul className="mt-2 space-y-1.5">
              {included.map((it) => (
                <li key={it} className="flex gap-2 text-sm opacity-85">
                  <span style={{ color: th.accent }}>✓</span>
                  {it}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6">
          <BuyPanel
            product={{
              id: product.id,
              type: product.type,
              title: product.title,
              price: Number(product.price),
              currency: product.currency,
              is_recurring: product.type === "membership",
              config,
            }}
            variants={variants}
            attributeOrder={attributeOrder}
            themeButton={{ background: th.button, color: th.buttonText }}
          />
        </div>

        <p className="mt-10 text-center text-xs opacity-50">{t("poweredBy")}</p>
      </div>
    </div>
  );
}

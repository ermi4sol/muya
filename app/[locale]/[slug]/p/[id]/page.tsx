import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getPublicProduct } from "@/lib/db/storefront";
import { themeOf } from "@/lib/themes";
import { Link } from "@/i18n/navigation";
import { BuyPanel } from "@/components/storefront/BuyPanel";
import { env } from "@/lib/env";

export const revalidate = 60;

/** Product page v2 — price is revealed HERE, not in the storefront list (UI pages 11–13). */
export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string; id: string; locale: string }>;
}) {
  const { slug, id, locale } = await params;
  const data = await getPublicProduct(slug, id);
  if (!data) notFound();
  const t = await getTranslations("shop");
  const { creator, product, variants, attributeOrder, customFields } = data;

  // Physical products live under the Shop hub
  if (product.type === "physical") redirect(`/${slug}/shop/${id}`);

  const th = themeOf(creator.theme?.preset);
  const config = (product.config ?? {}) as Record<string, unknown>;

  const startsAt =
    product.type === "webinar" && config.starts_at
      ? new Date(config.starts_at as string)
      : null;
  const reviews =
    ((config.reviews as { name: string; stars: number; text: string }[]) ?? []).filter(
      (r) => r.text?.trim()
    );

  const price = Number(product.price);
  const discount =
    product.discount_price != null ? Number(product.discount_price) : null;
  const hero = product.hero_image_url ?? product.thumbnail_url;

  return (
    <div className="min-h-dvh" style={{ background: th.bg, color: th.ink }}>
      {/* centered max-width column, PC included (UI page 11) */}
      <div className="mx-auto max-w-[680px] px-4 py-6 pb-28">
        <Link
          href={`/${slug}`}
          className="text-sm font-semibold opacity-70 hover:opacity-100"
        >
          ← {creator.display_name ?? slug}
        </Link>

        {hero && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={hero}
            alt=""
            className="mt-4 aspect-video w-full rounded-2xl object-cover shadow-card"
          />
        )}

        <h1 className="mt-4 font-heading text-2xl font-bold">{product.title}</h1>
        {product.subtitle && (
          <p className="mt-1 text-sm opacity-70">{product.subtitle}</p>
        )}

        {startsAt && (
          <p
            className="mt-2 inline-block rounded-full px-3 py-1 text-sm font-semibold"
            style={{ background: th.card, color: th.accent }}
          >
            🔴 {t("webinarAt")}{" "}
            {new Intl.DateTimeFormat(locale, {
              weekday: "long",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
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

        {/* price reveal (list never shows it) */}
        {product.type !== "lead_magnet" && (
          <p className="mt-3">
            <span className="text-2xl font-bold">
              {(discount ?? price).toLocaleString()} {product.currency}
            </span>
            {discount != null && (
              <span className="ml-2 text-base opacity-60 line-through">
                {price.toLocaleString()} {product.currency}
              </span>
            )}
          </p>
        )}

        {product.description_body && (
          <p className="mt-3 whitespace-pre-line text-[15px] leading-6 opacity-85">
            {product.description_body}
          </p>
        )}

        {product.bottom_title && (
          <p className="mt-4 font-heading text-lg font-bold">
            {product.bottom_title}
          </p>
        )}

        {reviews.length > 0 && (
          <div className="mt-4 space-y-2.5">
            {reviews.map((r, i) => (
              <div key={i} className="rounded-2xl p-4" style={{ background: th.card }}>
                <p className="text-sm font-semibold">
                  {r.name || "★"}{" "}
                  <span style={{ color: th.accent }}>
                    {"★".repeat(Math.max(1, Math.min(5, r.stars || 5)))}
                  </span>
                </p>
                <p className="mt-1 text-sm opacity-85">{r.text}</p>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6">
          <BuyPanel
            product={{
              id: product.id,
              type: product.type,
              title: product.title,
              price: discount ?? price,
              currency: product.currency,
              is_recurring: false,
              config,
            }}
            variants={variants}
            attributeOrder={attributeOrder}
            customFields={customFields}
            botUsername={env.telegramBotUsername()}
            themeButton={{ background: th.button, color: th.buttonText }}
          />
        </div>

        <p className="mt-4 text-center text-xs opacity-60">
          ✈️ {t("deliveredViaTelegram")}
        </p>

        <p className="mt-10 text-center text-xs opacity-50">{t("poweredBy")}</p>
      </div>
    </div>
  );
}

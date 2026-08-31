import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getStorefront } from "@/lib/db/storefront";
import { themeOf } from "@/lib/themes";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { VisitBeacon } from "@/components/storefront/VisitBeacon";
import { RefBeacon } from "@/components/storefront/RefBeacon";
import { TYPE_META, LINK_OUT_TYPES } from "@/lib/product-types";
import type { ProductType } from "@/lib/product-types";
import type { ProductRow } from "@/lib/db/creator";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const store = await getStorefront(slug);
  if (!store) return {};
  return {
    title: `${store.creator.display_name ?? slug} — MUYA`,
    description: store.creator.bio ?? undefined,
  };
}

export default async function StorefrontPage({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug } = await params;
  const store = await getStorefront(slug);
  if (!store) notFound();
  const t = await getTranslations();
  const { creator, products } = store;
  const th = themeOf(creator.theme?.preset);
  const socials = Object.entries(creator.social_links ?? {}).filter(([, v]) => v);

  // Physical products collapse into a single Shop card at the position of the
  // first physical product in the creator's ordering (UI page 10).
  const physicals = products.filter((p) => p.type === "physical");
  const list: (ProductRow | "shop")[] = [];
  for (const p of products) {
    if (p.type === "physical") {
      if (!list.includes("shop")) list.push("shop");
    } else {
      list.push(p);
    }
  }

  return (
    <div className="min-h-dvh" style={{ background: th.bg }}>
      <VisitBeacon slug={slug} />
      <RefBeacon />
      {/* single centered column, even on PC */}
      <div className="mx-auto max-w-md px-4 py-8">
        <div className="flex justify-end">
          <LanguageSwitcher />
        </div>
        <div className="mt-2 flex flex-col items-center text-center">
          <div
            className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full text-4xl"
            style={{ background: th.card, border: `2px solid ${th.accent}` }}
          >
            {creator.profile_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={creator.profile_image_url}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              "🏪"
            )}
          </div>
          <h1
            className="mt-3 font-heading text-2xl font-bold"
            style={{ color: th.ink }}
          >
            {creator.display_name ?? creator.store_slug}
          </h1>
          {creator.bio && (
            <p className="mt-1.5 text-sm opacity-80" style={{ color: th.ink }}>
              {creator.bio}
            </p>
          )}
          {socials.length > 0 && (
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {socials.map(([k, v]) => (
                <a
                  key={k}
                  href={v.startsWith("http") ? v : `https://${v}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full px-3 py-1 text-xs font-semibold capitalize"
                  style={{ background: th.card, color: th.accent }}
                >
                  {k}
                </a>
              ))}
            </div>
          )}
        </div>

        <div className="mt-8 space-y-3">
          {list.map((entry) =>
            entry === "shop" ? (
              <Link key="shop" href={`/${slug}/shop`} className="block">
                <div
                  className="flex items-center gap-3 rounded-2xl p-4 shadow-card transition hover:scale-[1.01]"
                  style={{ background: th.card }}
                >
                  <span className="text-2xl">🛍️</span>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="truncate font-semibold" style={{ color: th.ink }}>
                      {t("shop.shopCardTitle")}
                    </p>
                    <p className="truncate text-sm opacity-70" style={{ color: th.ink }}>
                      {t("shop.shopCardSub", { n: physicals.length })}
                    </p>
                  </div>
                  <span
                    className="shrink-0 rounded-xl px-4 py-2 text-sm font-bold"
                    style={{ background: th.button, color: th.buttonText }}
                  >
                    {t("shop.browse")}
                  </span>
                </div>
              </Link>
            ) : (
              <StoreCard key={entry.id} p={entry} slug={slug} th={th} />
            )
          )}
        </div>

        <p
          className="mt-10 text-center text-xs opacity-50"
          style={{ color: th.ink }}
        >
          {t("shop.poweredBy")}
        </p>
      </div>
    </div>
  );
}

function StoreCard({
  p,
  slug,
  th,
}: {
  p: ProductRow;
  slug: string;
  th: ReturnType<typeof themeOf>;
}) {
  const config = (p.config ?? {}) as Record<string, unknown>;
  const isLinkOut = LINK_OUT_TYPES.includes(p.type as ProductType);
  const cta = p.cta_button_text || "→";
  const icon = TYPE_META[p.type as ProductType]?.icon ?? "📦";

  let card: React.ReactNode;
  if (p.card_style === "button") {
    card = (
      <div
        className="rounded-2xl p-4 text-center shadow-card transition hover:scale-[1.01]"
        style={{ background: th.button }}
      >
        <p className="font-bold" style={{ color: th.buttonText }}>
          {p.title}
        </p>
        {p.subtitle && (
          <p className="mt-0.5 text-xs opacity-80" style={{ color: th.buttonText }}>
            {p.subtitle}
          </p>
        )}
      </div>
    );
  } else if (p.card_style === "preview") {
    card = (
      <div
        className="overflow-hidden rounded-2xl shadow-card transition hover:scale-[1.01]"
        style={{ background: th.card }}
      >
        <div className="flex aspect-square max-h-72 w-full items-center justify-center text-6xl">
          {p.thumbnail_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.thumbnail_url} alt="" className="h-full w-full object-cover" />
          ) : (
            icon
          )}
        </div>
        <div className="p-4">
          <p className="font-semibold" style={{ color: th.ink }}>
            {p.title}
          </p>
          {p.subtitle && (
            <p className="mt-0.5 text-sm opacity-70" style={{ color: th.ink }}>
              {p.subtitle}
            </p>
          )}
          <span
            className="mt-3 block rounded-xl py-2.5 text-center text-sm font-bold"
            style={{ background: th.button, color: th.buttonText }}
          >
            {cta}
          </span>
        </div>
      </div>
    );
  } else {
    // callout (default)
    card = (
      <div
        className="flex items-center gap-3 rounded-2xl p-4 shadow-card transition hover:scale-[1.01]"
        style={{ background: th.card }}
      >
        {p.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.thumbnail_url}
            alt=""
            className="h-12 w-12 rounded-xl object-cover"
          />
        ) : (
          <span className="text-2xl">{icon}</span>
        )}
        <div className="min-w-0 flex-1 text-left">
          <p className="truncate font-semibold" style={{ color: th.ink }}>
            {p.title}
          </p>
          {p.subtitle && (
            <p className="truncate text-sm opacity-70" style={{ color: th.ink }}>
              {p.subtitle}
            </p>
          )}
        </div>
        <span
          className="shrink-0 rounded-xl px-4 py-2 text-sm font-bold"
          style={{ background: th.button, color: th.buttonText }}
        >
          {cta}
        </span>
      </div>
    );
  }

  if (isLinkOut) {
    return (
      <a
        href={(config.url as string) ?? "#"}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        {card}
      </a>
    );
  }
  return (
    <Link href={`/${slug}/p/${p.id}`} className="block">
      {card}
    </Link>
  );
}

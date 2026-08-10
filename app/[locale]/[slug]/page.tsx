import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getStorefront } from "@/lib/db/storefront";
import { themeOf } from "@/lib/themes";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { VisitBeacon } from "@/components/storefront/VisitBeacon";

export const revalidate = 60;

const TYPE_ICONS: Record<string, string> = {
  digital_download: "📥", course: "🎓", coaching_call: "🗓️", webinar: "🎥",
  membership: "⭐", lead_magnet: "🎁", custom_product: "✨", external_link: "🔗",
  community: "💬", physical: "🛍️",
};

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
  const t = await getTranslations("shop");
  const { creator, products } = store;
  const th = themeOf(creator.theme?.preset);
  const socials = Object.entries(creator.social_links ?? {}).filter(([, v]) => v);

  return (
    <div className="min-h-dvh" style={{ background: th.bg }}>
      <VisitBeacon slug={slug} />
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
              <img src={creator.profile_image_url} alt="" className="h-full w-full object-cover" />
            ) : (
              "🏪"
            )}
          </div>
          <h1 className="mt-3 font-heading text-2xl font-bold" style={{ color: th.ink }}>
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
          {products.map((p) => {
            const config = (p.config ?? {}) as Record<string, unknown>;
            const isExternal = p.type === "external_link";
            const priceLabel =
              Number(p.price) === 0
                ? t("free")
                : `${Number(p.price).toLocaleString()} ${p.currency}`;
            const card = (
              <div
                className="flex items-center gap-3 rounded-2xl p-4 shadow-card transition hover:scale-[1.01]"
                style={{ background: th.card }}
              >
                {config.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={config.image_url as string}
                    alt=""
                    className="h-12 w-12 rounded-xl object-cover"
                  />
                ) : (
                  <span className="text-2xl">{TYPE_ICONS[p.type] ?? "📦"}</span>
                )}
                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate font-semibold" style={{ color: th.ink }}>
                    {p.title}
                  </p>
                  <p className="text-sm opacity-70" style={{ color: th.ink }}>
                    {isExternal ? t("open") : priceLabel}
                    {p.type === "membership" ? t("perMonth") : ""}
                  </p>
                </div>
                <span
                  className="rounded-xl px-4 py-2 text-sm font-bold"
                  style={{ background: th.button, color: th.buttonText }}
                >
                  →
                </span>
              </div>
            );
            return isExternal ? (
              <a
                key={p.id}
                href={(config.url as string) ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                {card}
              </a>
            ) : (
              <Link key={p.id} href={`/${slug}/p/${p.id}`} className="block">
                {card}
              </Link>
            );
          })}
        </div>

        <p className="mt-10 text-center text-xs opacity-50" style={{ color: th.ink }}>
          {t("poweredBy")}
        </p>
      </div>
    </div>
  );
}

import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getUserSession } from "@/lib/auth/session";
import { getCreator, getCreatorProducts } from "@/lib/db/creator";
import { themeOf } from "@/lib/themes";
import { Link } from "@/i18n/navigation";

const TYPE_ICONS: Record<string, string> = {
  digital_download: "📥", course: "🎓", coaching_call: "🗓️", webinar: "🎥",
  membership: "⭐", lead_magnet: "🎁", custom_product: "✨", external_link: "🔗",
  community: "💬", physical: "🛍️",
};

export default async function PreviewPage() {
  const session = await getUserSession();
  if (!session || session.role !== "creator") redirect("/signin");
  const creator = await getCreator(session.sub);
  if (!creator) redirect("/signin");
  const t = await getTranslations("dash");
  const products = (await getCreatorProducts(creator.id)).filter(
    (p) => p.status === "active"
  );
  const th = themeOf(creator.theme?.preset);
  const socials = Object.entries(creator.social_links ?? {}).filter(
    ([, v]) => v
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" style={{ background: th.bg }}>
      {/* Preview bar */}
      <div className="sticky top-0 z-10 flex items-center justify-between bg-ink px-4 py-2.5 text-white">
        <span className="text-sm font-medium">
          muya.app/{creator.store_slug}
        </span>
        <Link
          href="/dashboard/store"
          className="rounded-control bg-white/15 px-3 py-1.5 text-sm font-semibold hover:bg-white/25"
        >
          ← {t("previewBack")}
        </Link>
      </div>

      {/* Storefront preview */}
      <div className="mx-auto max-w-md px-4 py-8">
        <div className="flex flex-col items-center text-center">
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
            <div className="mt-3 flex gap-3">
              {socials.map(([k]) => (
                <span
                  key={k}
                  className="rounded-full px-3 py-1 text-xs font-semibold capitalize"
                  style={{ background: th.card, color: th.accent }}
                >
                  {k}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="mt-8 space-y-3">
          {products.length === 0 && (
            <p
              className="rounded-2xl p-6 text-center text-sm opacity-70"
              style={{ background: th.card, color: th.ink }}
            >
              {t("productsEmpty")}
            </p>
          )}
          {products.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 rounded-2xl p-4 shadow-card"
              style={{ background: th.card }}
            >
              <span className="text-2xl">{TYPE_ICONS[p.type] ?? "📦"}</span>
              <div className="min-w-0 flex-1 text-left">
                <p className="truncate font-semibold" style={{ color: th.ink }}>
                  {p.title}
                </p>
                <p className="text-sm opacity-70" style={{ color: th.ink }}>
                  {Number(p.price) === 0
                    ? "Free"
                    : `${Number(p.price).toLocaleString()} ${p.currency}`}
                </p>
              </div>
              <span
                className="rounded-xl px-4 py-2 text-sm font-bold"
                style={{ background: th.button, color: th.buttonText }}
              >
                →
              </span>
            </div>
          ))}
        </div>

        <p
          className="mt-10 text-center text-xs opacity-50"
          style={{ color: th.ink }}
        >
          Powered by MUYA
        </p>
      </div>
    </div>
  );
}

import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getUserSession } from "@/lib/auth/session";
import { getCreator, getCreatorProducts } from "@/lib/db/creator";
import { MyStoreEditor } from "@/components/dashboard/MyStoreEditor";

/** My Store (UI page 21): editor left + persistent live mobile preview on PC. */
export default async function StorePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await getUserSession();
  if (!session || session.role !== "creator") redirect("/signin");
  const creator = await getCreator(session.sub);
  if (!creator) redirect("/signin");
  if (!creator.display_name) redirect("/dashboard/onboarding");
  const t = await getTranslations("dash");
  const [products, { tab }] = await Promise.all([
    getCreatorProducts(creator.id),
    searchParams,
  ]);

  return (
    <div className="gap-8 xl:grid xl:grid-cols-[1fr_360px]">
      <div className="min-w-0">
        <MyStoreEditor creator={creator} products={products} initialTab={tab} />
      </div>

      {/* Persistent live preview (PC only — mobile keeps the Preview button) */}
      <div className="hidden xl:block">
        <div className="sticky top-[81px]">
          <p className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-ink-faint">
            {t("livePreview")}
          </p>
          <div className="mx-auto w-[340px] overflow-hidden rounded-[36px] border-[6px] border-ink/85 bg-bg shadow-xl">
            <div className="bg-ink/85 py-2 text-center">
              <span className="inline-block h-1.5 w-16 rounded-full bg-white/30" />
            </div>
            <iframe
              src={`/${creator.store_slug}`}
              title="Store preview"
              className="h-[600px] w-full bg-white"
            />
          </div>
          <p className="mt-2 text-center text-xs text-ink-faint">
            mymuya.netlify.app/{creator.store_slug}
          </p>
        </div>
      </div>
    </div>
  );
}

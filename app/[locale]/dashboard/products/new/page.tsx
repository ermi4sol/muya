import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getUserSession } from "@/lib/auth/session";
import { Link } from "@/i18n/navigation";
import { TYPE_META } from "@/lib/product-types";

export default async function NewProductPage() {
  const session = await getUserSession();
  if (!session || session.role !== "creator") redirect("/signin");
  const t = await getTranslations();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-heading text-2xl font-bold text-ink">
        {t("builder.chooseType")}
      </h1>
      <p className="mt-1 text-sm text-ink-soft">{t("builder.chooseTypeSub")}</p>
      <div className="mt-5 grid grid-cols-2 gap-3">
        {Object.entries(TYPE_META).map(([type, meta]) => (
          <Link
            key={type}
            href={`/dashboard/products/new/${type}`}
            className="rounded-card border border-line bg-surface p-4 shadow-card transition hover:border-primary-500"
          >
            <span className="text-2xl">{meta.icon}</span>
            <p className="mt-2 font-semibold text-ink">{t(meta.nameKey)}</p>
            <p className="mt-0.5 text-xs text-ink-faint">{t(meta.descKey)}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

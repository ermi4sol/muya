import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { verifyAccess } from "@/lib/fulfillment";
import { Link } from "@/i18n/navigation";

export default async function AccessPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  if (!/^[0-9a-f-]{36}$/.test(orderId)) notFound();
  const order = await verifyAccess(orderId);
  if (!order) notFound();
  const t = await getTranslations("shop");

  const type = order.products.type;
  const config = order.products.config ?? {};
  const file = (config.file ?? null) as { name?: string } | null;
  const included =
    type === "membership" ? ((config.included as string[]) ?? []) : [];

  return (
    <div className="flex min-h-dvh flex-col items-center bg-bg px-4 py-12">
      <div className="w-full max-w-md rounded-card border border-line bg-surface p-6 text-center shadow-card">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-50 text-3xl">
          ✅
        </div>
        <h1 className="mt-3 font-heading text-2xl font-bold text-ink">
          {order.products.title}
        </h1>

        {(type === "digital_download" || type === "lead_magnet") && (
          <>
            {file?.name && (
              <p className="mt-2 text-sm text-ink-soft">📄 {file.name}</p>
            )}
            <a
              href={`/api/download/${order.id}`}
              className="mt-5 inline-block rounded-control bg-primary-600 px-6 py-3.5 font-semibold text-white shadow-card hover:bg-primary-700"
            >
              ⬇️ {t("download")}
            </a>
            <p className="mt-2 text-xs text-ink-faint">{t("downloadNote")}</p>
          </>
        )}

        {type === "course" && (
          <Link
            href={`/learn/${order.id}`}
            className="mt-5 inline-block rounded-control bg-primary-600 px-6 py-3.5 font-semibold text-white shadow-card hover:bg-primary-700"
          >
            🎓 {t("openCourse")}
          </Link>
        )}

        {type === "membership" && (
          <div className="mt-4 rounded-control bg-bg p-4 text-left">
            <p className="text-sm font-bold text-ink">{t("included")}</p>
            <ul className="mt-2 space-y-1.5">
              {included.map((it) => (
                <li key={it} className="flex gap-2 text-sm text-ink-soft">
                  <span className="text-success">✓</span>
                  {it}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-ink-faint">{t("memberNote")}</p>
          </div>
        )}

        {type === "community" && (
          <p className="mt-4 rounded-control bg-primary-50 px-4 py-3 text-sm text-primary-800">
            {t("communityNote")}
          </p>
        )}

        {!["digital_download", "lead_magnet", "course", "membership", "community"].includes(type) && (
          <p className="mt-4 text-sm text-ink-soft">{t("accessGeneric")}</p>
        )}
      </div>
    </div>
  );
}

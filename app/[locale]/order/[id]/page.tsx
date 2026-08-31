import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { supabaseAdmin } from "@/lib/db/client";
import { OrderStatusLive } from "@/components/storefront/OrderStatusLive";

export default async function OrderStatusPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();

  const { data: order } = await supabaseAdmin()
    .from("orders")
    .select(
      "id, quantity, item_amount, shipping_fee, total_charged, currency, payment_status, rejection_reason, metadata, products(title, type), creators(display_name, store_slug)"
    )
    .eq("id", id)
    .maybeSingle();
  if (!order) notFound();

  const t = await getTranslations("shop");
  const product = order.products as unknown as {
    title: string;
    type: string;
  } | null;
  const accessPath =
    order.payment_status === "paid" && product
      ? product.type === "course"
        ? `/learn/${order.id}`
        : ["digital_product", "lead_magnet"].includes(product.type)
          ? `/access/${order.id}`
          : null
      : null;
  const creator = order.creators as unknown as {
    display_name: string | null;
    store_slug: string;
  } | null;
  const meta = (order.metadata ?? {}) as Record<string, unknown>;

  return (
    <div className="flex min-h-dvh flex-col items-center bg-bg px-4 py-12">
      <div className="w-full max-w-md rounded-card border border-line bg-surface p-6 text-center shadow-card">
        <OrderStatusLive
          orderId={order.id}
          initialStatus={order.payment_status}
          initialReason={order.rejection_reason}
        />
        {accessPath && (
          <a
            href={accessPath}
            className="mt-4 inline-block rounded-control bg-primary-600 px-6 py-3.5 font-semibold text-white shadow-card hover:bg-primary-700"
          >
            {product?.type === "course" ? `🎓 ${t("openCourse")}` : `🔓 ${t("openAccess")}`}
          </a>
        )}
        <div className="mt-5 rounded-control bg-bg p-4 text-left text-sm text-ink-soft">
          <p className="font-semibold text-ink">{product?.title ?? "—"}</p>
          {Boolean(meta.variant) && (
            <p className="mt-0.5">{String(meta.variant)} × {order.quantity}</p>
          )}
          {Boolean(meta.slot) && (
            <p className="mt-0.5">
              🗓️ {new Date(String(meta.slot)).toLocaleString()}
            </p>
          )}
          <p className="mt-2 flex justify-between border-t border-line pt-2 font-bold text-ink">
            <span>{t("total")}</span>
            <span>
              {Number(order.total_charged) === 0
                ? t("free")
                : `${Number(order.total_charged).toLocaleString()} ${order.currency}`}
            </span>
          </p>
        </div>
        <p className="mt-3 text-xs text-ink-faint">
          {t("statusRef")}: {order.id.slice(0, 8).toUpperCase()}
        </p>
        <p className="mt-1 text-xs text-ink-faint">✈️ {t("statusTelegram")}</p>
        {creator && (
          <a
            href={`/${creator.store_slug}`}
            className="mt-5 inline-block rounded-control border border-primary-600 px-4 py-2.5 text-sm font-semibold text-primary-700 hover:bg-primary-50"
          >
            {t("backToStore")}
          </a>
        )}
      </div>
    </div>
  );
}

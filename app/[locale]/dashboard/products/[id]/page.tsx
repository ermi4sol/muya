import { notFound, redirect } from "next/navigation";
import { getUserSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/db/client";
import { getProductFull } from "@/lib/db/products";
import {
  ProductBuilder,
  type BuilderInitial,
} from "@/components/dashboard/ProductBuilder";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getUserSession();
  if (!session || session.role !== "creator") redirect("/signin");
  const { id } = await params;

  const full = await getProductFull(id);
  if (!full || full.product.creator_id !== session.sub) notFound();

  const { data: others } = await supabaseAdmin()
    .from("products")
    .select("id, title")
    .eq("creator_id", session.sub)
    .eq("status", "active")
    .order("sort_order");

  const initial: BuilderInitial = {
    id: full.product.id,
    type: full.product.type,
    title: full.product.title ?? "",
    subtitle: full.product.subtitle ?? "",
    card_style: full.product.card_style ?? "callout",
    thumbnail_url: full.product.thumbnail_url,
    hero_image_url: full.product.hero_image_url,
    description_body: full.product.description_body ?? "",
    bottom_title: full.product.bottom_title ?? "",
    cta_button_text: full.product.cta_button_text ?? "",
    price: Number(full.product.price),
    discount_price:
      full.product.discount_price != null
        ? Number(full.product.discount_price)
        : null,
    status: full.product.status,
    config: full.product.config ?? {},
    custom_fields: full.customFields.map((f) => ({
      label: f.label,
      field_type: f.field_type as "text" | "textarea" | "phone" | "email",
    })),
    attributes: full.attributes,
    variants: full.variants as BuilderInitial["variants"],
  };

  return (
    <ProductBuilder
      initial={initial}
      bumpOptions={(others ?? []).map((p) => ({ id: p.id, title: p.title ?? "" }))}
    />
  );
}

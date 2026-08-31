import { z } from "zod";
import { supabaseAdmin } from "@/lib/db/client";
import { PRODUCT_TYPES, CARD_STYLES } from "@/lib/product-types";

export { PRODUCT_TYPES };

export const AttributeSchema = z.object({
  name: z.string().min(1).max(40),
  values: z.array(z.string().min(1).max(40)).min(1).max(20),
});

export const VariantSchema = z.object({
  attribute_values: z.record(z.string(), z.string()),
  sku: z.string().max(60).optional(),
  price_override: z.number().nonnegative().nullable().optional(),
  stock_count: z.number().int().min(0).default(0),
  weight_grams: z.number().int().min(0).nullable().optional(),
});

export const CustomFieldSchema = z.object({
  label: z.string().min(1).max(80),
  field_type: z.enum(["text", "textarea", "phone", "email"]).default("text"),
});

export const ProductBaseSchema = z.object({
    type: z.enum(PRODUCT_TYPES),
    title: z.string().min(1).max(120),
    subtitle: z.string().max(160).optional().default(""),
    card_style: z.enum(CARD_STYLES).default("callout"),
    thumbnail_url: z.string().max(1000).nullable().optional(),
    hero_image_url: z.string().max(1000).nullable().optional(),
    description_body: z.string().max(8000).optional().default(""),
    bottom_title: z.string().max(160).optional().default(""),
    cta_button_text: z.string().max(40).optional().default("Buy Now"),
    price: z.number().nonnegative().max(10000000).default(0),
    discount_price: z.number().nonnegative().max(10000000).nullable().optional(),
    is_recurring: z.boolean().optional().default(false),
    billing_interval: z.enum(["weekly", "monthly", "yearly"]).nullable().optional(),
    status: z.enum(["active", "draft"]).default("active"),
    config: z.record(z.string(), z.unknown()).optional().default({}),
    custom_fields: z.array(CustomFieldSchema).max(10).optional(),
    attributes: z.array(AttributeSchema).max(5).optional(),
    variants: z.array(VariantSchema).max(200).optional(),
});

export const ProductBodySchema = ProductBaseSchema.refine(
  (b) => b.discount_price == null || b.discount_price < b.price,
  { message: "Discount price must be lower than the regular price" }
);

export type ProductBody = z.infer<typeof ProductBodySchema>;

/** Columns written to the products table from a validated body. */
export function productColumns(
  b: Partial<Omit<ProductBody, "status">> & { status?: string }
) {
  const cols: Record<string, unknown> = {};
  if (b.title !== undefined) cols.title = b.title;
  if (b.subtitle !== undefined) cols.subtitle = b.subtitle;
  if (b.card_style !== undefined) cols.card_style = b.card_style;
  if (b.thumbnail_url !== undefined) cols.thumbnail_url = b.thumbnail_url;
  if (b.hero_image_url !== undefined) cols.hero_image_url = b.hero_image_url;
  if (b.description_body !== undefined) cols.description_body = b.description_body;
  if (b.bottom_title !== undefined) cols.bottom_title = b.bottom_title;
  if (b.cta_button_text !== undefined) cols.cta_button_text = b.cta_button_text;
  if (b.price !== undefined) cols.price = b.price;
  if (b.discount_price !== undefined) cols.discount_price = b.discount_price;
  if (b.is_recurring !== undefined) cols.is_recurring = b.is_recurring;
  if (b.billing_interval !== undefined) cols.billing_interval = b.billing_interval;
  if (b.status !== undefined) cols.status = b.status;
  if (b.config !== undefined) cols.config = b.config;
  return cols;
}

export async function replaceCustomFields(
  productId: string,
  fields: z.infer<typeof CustomFieldSchema>[]
) {
  const db = supabaseAdmin();
  await db.from("product_custom_fields").delete().eq("product_id", productId);
  if (fields.length) {
    await db.from("product_custom_fields").insert(
      fields.map((f, i) => ({
        product_id: productId,
        label: f.label,
        field_type: f.field_type,
        sort_order: i,
      }))
    );
  }
}

export async function insertPhysical(
  productId: string,
  attributes: z.infer<typeof AttributeSchema>[],
  variants: z.infer<typeof VariantSchema>[]
) {
  const db = supabaseAdmin();
  for (const [i, attr] of attributes.entries()) {
    const { data: attrRow } = await db
      .from("product_attributes")
      .insert({ product_id: productId, name: attr.name, sort_order: i })
      .select("id")
      .single();
    if (attrRow) {
      await db.from("product_attribute_values").insert(
        attr.values.map((v) => ({ attribute_id: attrRow.id, value: v }))
      );
    }
  }
  if (variants.length) {
    await db.from("product_variants").insert(
      variants.map((v) => ({
        product_id: productId,
        attribute_values: v.attribute_values,
        sku: v.sku ?? null,
        price_override: v.price_override ?? null,
        stock_count: v.stock_count,
        weight_grams: v.weight_grams ?? null,
      }))
    );
  }
}

export async function deletePhysical(productId: string) {
  const db = supabaseAdmin();
  // attribute values cascade from attributes
  await db.from("product_attributes").delete().eq("product_id", productId);
  await db.from("product_variants").delete().eq("product_id", productId);
}

export async function getProductFull(id: string) {
  const db = supabaseAdmin();
  const { data: product } = await db
    .from("products")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!product) return null;

  const { data: customFields } = await db
    .from("product_custom_fields")
    .select("id, label, field_type, sort_order")
    .eq("product_id", id)
    .order("sort_order");

  let attributes: { name: string; values: string[] }[] = [];
  let variants: Record<string, unknown>[] = [];
  if (product.type === "physical") {
    const { data: attrs } = await db
      .from("product_attributes")
      .select("id, name, sort_order, product_attribute_values(value)")
      .eq("product_id", id)
      .order("sort_order");
    attributes = (attrs ?? []).map((a) => ({
      name: a.name,
      values: (
        (a.product_attribute_values as { value: string }[] | null) ?? []
      ).map((v) => v.value),
    }));
    const { data: vars } = await db
      .from("product_variants")
      .select("id, attribute_values, sku, price_override, stock_count, weight_grams")
      .eq("product_id", id);
    variants = vars ?? [];
  }
  return { product, customFields: customFields ?? [], attributes, variants };
}

/** @deprecated v1 name kept for any straggler imports; same as getProductFull. */
export const getProductWithPhysical = getProductFull;

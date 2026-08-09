import { z } from "zod";
import { supabaseAdmin } from "@/lib/db/client";

export const PRODUCT_TYPES = [
  "digital_download", "course", "coaching_call", "webinar", "membership",
  "lead_magnet", "custom_product", "external_link", "community", "physical",
] as const;

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

export const ProductBodySchema = z.object({
  type: z.enum(PRODUCT_TYPES),
  title: z.string().min(1).max(120),
  description: z.string().max(2000).optional().default(""),
  price: z.number().nonnegative().max(10000000).default(0),
  is_recurring: z.boolean().optional().default(false),
  billing_interval: z.enum(["weekly", "monthly", "yearly"]).nullable().optional(),
  status: z.enum(["active", "draft"]).default("active"),
  config: z.record(z.string(), z.unknown()).optional().default({}),
  attributes: z.array(AttributeSchema).max(5).optional(),
  variants: z.array(VariantSchema).max(200).optional(),
});

export type ProductBody = z.infer<typeof ProductBodySchema>;

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

export async function getProductWithPhysical(id: string) {
  const db = supabaseAdmin();
  const { data: product } = await db
    .from("products")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!product) return null;

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
  return { product, attributes, variants };
}

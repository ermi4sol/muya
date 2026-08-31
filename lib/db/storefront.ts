import { supabaseAdmin } from "@/lib/db/client";
import type { CreatorFull, ProductRow } from "@/lib/db/creator";

export interface VariantPublic {
  id: string;
  attribute_values: Record<string, string>;
  price_override: number | null;
  stock_count: number;
}

export async function getStorefront(slug: string): Promise<{
  creator: CreatorFull;
  products: ProductRow[];
} | null> {
  const db = supabaseAdmin();
  const { data: creator } = await db
    .from("creators")
    .select(
      "id, telegram_user_id, telegram_username, store_slug, display_name, bio, profile_image_url, social_links, theme, currency, preferred_locale, status"
    )
    .eq("store_slug", slug)
    .eq("status", "active")
    .maybeSingle();
  if (!creator) return null;

  const { data: products } = await db
    .from("products")
    .select(
      "id, type, title, subtitle, card_style, thumbnail_url, hero_image_url, description_body, bottom_title, cta_button_text, price, discount_price, currency, status, sort_order, config"
    )
    .eq("creator_id", creator.id)
    .eq("status", "active")
    .order("sort_order", { ascending: true });

  return {
    creator: creator as CreatorFull,
    products: (products ?? []) as ProductRow[],
  };
}

export async function getPublicProduct(slug: string, productId: string) {
  const store = await getStorefront(slug);
  if (!store) return null;
  const product = store.products.find((p) => p.id === productId);
  if (!product) return null;

  const { data: customFieldRows } = await supabaseAdmin()
    .from("product_custom_fields")
    .select("label, field_type, sort_order")
    .eq("product_id", productId)
    .order("sort_order");
  const customFields = (customFieldRows ?? []) as {
    label: string;
    field_type: string;
  }[];

  let variants: VariantPublic[] = [];
  let attributeOrder: string[] = [];
  if (product.type === "physical") {
    const db = supabaseAdmin();
    const [{ data: vars }, { data: attrs }] = await Promise.all([
      db
        .from("product_variants")
        .select("id, attribute_values, price_override, stock_count")
        .eq("product_id", productId),
      db
        .from("product_attributes")
        .select("name, sort_order")
        .eq("product_id", productId)
        .order("sort_order"),
    ]);
    variants = (vars ?? []) as VariantPublic[];
    attributeOrder = (attrs ?? []).map((a) => a.name);
  }
  return { creator: store.creator, product, variants, attributeOrder, customFields };
}

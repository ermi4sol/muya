import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/db/client";
import {
  productColumns,
  insertPhysical,
  deletePhysical,
  getProductFull,
  replaceCustomFields,
  AttributeSchema,
  VariantSchema,
  CustomFieldSchema,
} from "@/lib/db/products";
import { PRODUCT_TYPES, CARD_STYLES } from "@/lib/product-types";

async function ownedProduct(id: string, creatorId: string) {
  const { data } = await supabaseAdmin()
    .from("products")
    .select("id, creator_id, type")
    .eq("id", id)
    .maybeSingle();
  return data && data.creator_id === creatorId ? data : null;
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getUserSession();
  if (!session || session.role !== "creator") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const owned = await ownedProduct(id, session.sub);
  if (!owned) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const full = await getProductFull(id);
  return NextResponse.json(full);
}

/**
 * PATCH schema with NO defaults anywhere. This matters: zod applies .default()
 * values even through .partial(), so a defaults-carrying schema turns a tiny
 * {sort_order} reorder request into a full reset (config {}, price 0, …) —
 * which silently wiped product data. Every field here is plainly optional.
 */
const PatchSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  subtitle: z.string().max(160).optional(),
  card_style: z.enum(CARD_STYLES).optional(),
  thumbnail_url: z.string().max(1000).nullable().optional(),
  hero_image_url: z.string().max(1000).nullable().optional(),
  description_body: z.string().max(8000).optional(),
  bottom_title: z.string().max(160).optional(),
  cta_button_text: z.string().max(40).optional(),
  price: z.number().nonnegative().max(10000000).optional(),
  discount_price: z.number().nonnegative().max(10000000).nullable().optional(),
  is_recurring: z.boolean().optional(),
  billing_interval: z.enum(["weekly", "monthly", "yearly"]).nullable().optional(),
  status: z.enum(["active", "draft", "archived"]).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  custom_fields: z.array(CustomFieldSchema).max(10).optional(),
  attributes: z.array(AttributeSchema).max(5).optional(),
  variants: z.array(VariantSchema).max(200).optional(),
  sort_order: z.number().int().min(0).max(10000).optional(),
  // type is accepted but never applied (products can't change type)
  type: z.enum(PRODUCT_TYPES).optional(),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getUserSession();
  if (!session || session.role !== "creator") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const owned = await ownedProduct(id, session.sub);
  if (!owned) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const raw = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const parsed = PatchSchema.safeParse(raw);
  if (!raw || !parsed.success) {
    return NextResponse.json(
      { error: "invalid_request", detail: parsed.success ? "bad json" : parsed.error.issues[0]?.message },
      { status: 400 }
    );
  }

  // Belt and braces: only ever touch keys the client actually sent.
  const sentKeys = new Set(Object.keys(raw));
  const data = Object.fromEntries(
    Object.entries(parsed.data).filter(([k]) => sentKeys.has(k))
  ) as z.infer<typeof PatchSchema>;

  if (
    data.discount_price != null &&
    data.price != null &&
    data.discount_price >= data.price
  ) {
    return NextResponse.json(
      { error: "invalid_request", detail: "Discount price must be lower than the regular price" },
      { status: 400 }
    );
  }
  const { attributes, variants, custom_fields, sort_order, type: _ignored, ...bodyFields } =
    data;

  const cols = productColumns(bodyFields);
  if (sort_order !== undefined) cols.sort_order = sort_order;

  if (Object.keys(cols).length > 0) {
    const { error } = await supabaseAdmin()
      .from("products")
      .update(cols)
      .eq("id", id);
    if (error) {
      return NextResponse.json({ error: "update_failed" }, { status: 500 });
    }
  }

  if (custom_fields) {
    await replaceCustomFields(id, custom_fields);
  }

  // Physical products: replace attributes/variants wholesale (simple + safe)
  if (owned.type === "physical" && attributes) {
    await deletePhysical(id);
    await insertPhysical(id, attributes, variants ?? []);
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getUserSession();
  if (!session || session.role !== "creator") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const owned = await ownedProduct(id, session.sub);
  if (!owned) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Soft delete — orders/entitlements keep referring to it
  const { error } = await supabaseAdmin()
    .from("products")
    .update({ status: "archived" })
    .eq("id", id);
  if (error) {
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

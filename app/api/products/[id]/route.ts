import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/db/client";
import {
  ProductBaseSchema,
  productColumns,
  insertPhysical,
  deletePhysical,
  getProductFull,
  replaceCustomFields,
} from "@/lib/db/products";

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

const PatchSchema = ProductBaseSchema.partial().extend({
  sort_order: z.number().int().min(0).max(10000).optional(),
  status: z.enum(["active", "draft", "archived"]).optional(),
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

  const parsed = PatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_request", detail: parsed.error.issues[0]?.message },
      { status: 400 }
    );
  }
  if (
    parsed.data.discount_price != null &&
    parsed.data.price != null &&
    parsed.data.discount_price >= parsed.data.price
  ) {
    return NextResponse.json(
      { error: "invalid_request", detail: "Discount price must be lower than the regular price" },
      { status: 400 }
    );
  }
  const { attributes, variants, custom_fields, sort_order, ...bodyFields } =
    parsed.data;

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

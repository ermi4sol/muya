import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/db/client";
import {
  ProductBodySchema,
  insertPhysical,
  deletePhysical,
  getProductWithPhysical,
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
  const full = await getProductWithPhysical(id);
  return NextResponse.json(full);
}

const PatchSchema = ProductBodySchema.partial().extend({
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
  const { attributes, variants, type: _ignoredType, ...fields } = parsed.data;

  if (Object.keys(fields).length > 0) {
    const { error } = await supabaseAdmin()
      .from("products")
      .update(fields)
      .eq("id", id);
    if (error) {
      return NextResponse.json({ error: "update_failed" }, { status: 500 });
    }
  }

  // Physical products: replace attributes/variants wholesale (MVP-simple)
  if (owned.type === "physical" && attributes) {
    await deletePhysical(id);
    await insertPhysical(id, attributes, variants ?? []);
  }

  // Keep community name/description in sync
  if (owned.type === "community" && (fields.title || fields.description)) {
    await supabaseAdmin()
      .from("communities")
      .update({
        ...(fields.title ? { name: fields.title } : {}),
        ...(fields.description !== undefined
          ? { description: fields.description }
          : {}),
      })
      .eq("product_id", id);
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

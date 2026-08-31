import { NextResponse } from "next/server";
import { getUserSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/db/client";
import {
  ProductBodySchema,
  insertPhysical,
  replaceCustomFields,
} from "@/lib/db/products";

export async function POST(req: Request) {
  const session = await getUserSession();
  if (!session || session.role !== "creator") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const parsed = ProductBodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_request", detail: parsed.error.issues[0]?.message },
      { status: 400 }
    );
  }
  const b = parsed.data;
  const db = supabaseAdmin();

  const { data: maxRow } = await db
    .from("products")
    .select("sort_order")
    .eq("creator_id", session.sub)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: product, error } = await db
    .from("products")
    .insert({
      creator_id: session.sub,
      type: b.type,
      title: b.title,
      subtitle: b.subtitle,
      card_style: b.card_style,
      thumbnail_url: b.thumbnail_url ?? null,
      hero_image_url: b.hero_image_url ?? null,
      description_body: b.description_body,
      bottom_title: b.bottom_title,
      cta_button_text: b.cta_button_text,
      price: b.price,
      discount_price: b.discount_price ?? null,
      is_recurring: b.is_recurring,
      billing_interval: b.is_recurring ? (b.billing_interval ?? "monthly") : null,
      status: b.status,
      config: b.config,
      sort_order: (maxRow?.sort_order ?? -1) + 1,
    })
    .select("id")
    .single();
  if (error || !product) {
    return NextResponse.json({ error: "create_failed" }, { status: 500 });
  }

  if (b.custom_fields?.length) {
    await replaceCustomFields(product.id, b.custom_fields);
  }
  if (b.type === "physical" && b.attributes?.length) {
    await insertPhysical(product.id, b.attributes, b.variants ?? []);
  }

  return NextResponse.json({ id: product.id });
}

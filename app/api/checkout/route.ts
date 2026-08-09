import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/db/client";
import { findOrCreateCustomer } from "@/lib/db/identity";
import { rateLimit, clientIp } from "@/lib/auth/rate-limit";
import {
  sendOrderReceivedEmail,
  sendAdminNewOrderAlert,
} from "@/lib/email/orders";

const Body = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().nullable().optional(),
  quantity: z.number().int().min(1).max(50).default(1),
  email: z.string().email(),
  name: z.string().max(80).optional(),
  locale: z.string().max(5).optional(),
  shipping: z
    .object({
      name: z.string().min(1).max(80),
      phone: z.string().min(5).max(30),
      address: z.string().min(3).max(300),
      city: z.string().min(1).max(80),
      notes: z.string().max(300).optional(),
      cod: z.boolean().optional(),
    })
    .optional(),
  customAnswer: z.string().max(1000).optional(),
  slot: z.string().max(40).optional(), // ISO datetime for coaching bookings
});

export async function POST(req: Request) {
  try {
    return await handle(req);
  } catch (e) {
    console.error("checkout failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

async function handle(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const b = parsed.data;

  const ipOk = await rateLimit(`checkout:ip:${clientIp(req)}`, 20, 60 * 60);
  if (!ipOk) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const db = supabaseAdmin();
  const { data: product } = await db
    .from("products")
    .select(
      "id, creator_id, type, title, price, currency, status, is_recurring, config, creators(display_name, store_slug, email, status)"
    )
    .eq("id", b.productId)
    .maybeSingle();

  const creator = product?.creators as unknown as {
    display_name: string | null;
    store_slug: string;
    email: string;
    status: string;
  } | null;

  if (!product || product.status !== "active" || creator?.status !== "active") {
    return NextResponse.json({ error: "not_available" }, { status: 404 });
  }
  if (product.type === "external_link") {
    return NextResponse.json({ error: "not_purchasable" }, { status: 400 });
  }

  // Physical: resolve variant + stock + shipping
  let unitPrice = Number(product.price);
  let shippingFee = 0;
  let variantSummary: string | null = null;
  const config = (product.config ?? {}) as Record<string, unknown>;

  if (product.type === "physical") {
    if (!b.variantId || !b.shipping) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }
    const { data: variant } = await db
      .from("product_variants")
      .select("id, product_id, attribute_values, price_override, stock_count")
      .eq("id", b.variantId)
      .maybeSingle();
    if (!variant || variant.product_id !== product.id) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }
    if (variant.stock_count < b.quantity) {
      return NextResponse.json({ error: "out_of_stock" }, { status: 409 });
    }
    if (variant.price_override != null) unitPrice = Number(variant.price_override);
    shippingFee = Number(config.shipping_fee ?? 0);
    variantSummary = Object.values(
      (variant.attribute_values ?? {}) as Record<string, string>
    ).join(" / ");
  } else {
    b.quantity = 1;
  }

  const itemAmount = unitPrice * b.quantity;
  const total = itemAmount + shippingFee;
  const isFree = total === 0;

  const customer = await findOrCreateCustomer(b.email);
  if (b.name) {
    await db.from("customers").update({ name: b.name }).eq("id", customer.id).is("name", null);
  }

  const { data: order, error } = await db
    .from("orders")
    .insert({
      creator_id: product.creator_id,
      customer_id: customer.id,
      product_id: product.id,
      variant_id: b.variantId ?? null,
      quantity: b.quantity,
      item_amount: itemAmount,
      shipping_fee: shippingFee,
      total_charged: total,
      currency: product.currency,
      payment_status: isFree ? "paid" : "pending",
      ...(isFree ? { approved_at: new Date().toISOString() } : {}),
      metadata: {
        locale: b.locale ?? "en",
        ...(variantSummary ? { variant: variantSummary } : {}),
        ...(b.customAnswer ? { custom_answer: b.customAnswer } : {}),
        ...(b.slot ? { slot: b.slot } : {}),
        ...(b.shipping?.cod ? { cod: true } : {}),
      },
    })
    .select("id")
    .single();
  if (error || !order) {
    return NextResponse.json({ error: "order_failed" }, { status: 500 });
  }

  if (product.type === "physical" && b.shipping) {
    await db.from("physical_orders").insert({
      order_id: order.id,
      shipping_name: b.shipping.name,
      shipping_phone: b.shipping.phone,
      shipping_address: b.shipping.address,
      shipping_city: b.shipping.city,
      shipping_notes: b.shipping.notes ?? null,
      payment_method: b.shipping.cod ? "cash_on_delivery" : "order_request",
    });
  }

  // Free products: grant access instantly (full fulfillment engine = Phase 8)
  if (isFree) {
    await db.from("entitlements").insert({
      customer_id: customer.id,
      product_id: product.id,
      order_id: order.id,
    });
  }

  const totalLabel = `${total.toLocaleString()} ${product.currency}`;
  // Fire both emails; a failure never blocks the order
  await Promise.allSettled([
    sendOrderReceivedEmail({
      to: b.email,
      orderId: order.id,
      productTitle: product.title,
      total: totalLabel,
      locale: b.locale,
    }),
    isFree
      ? Promise.resolve()
      : sendAdminNewOrderAlert({
          orderId: order.id,
          productTitle: product.title,
          productType: product.type,
          creatorName: creator?.display_name ?? creator?.store_slug ?? "—",
          customerEmail: b.email,
          total: totalLabel,
          details: variantSummary ? `Variant: ${variantSummary} × ${b.quantity}` : undefined,
        }),
  ]);

  return NextResponse.json({ orderId: order.id, free: isFree });
}

import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/db/client";
import { getUserSession } from "@/lib/auth/session";
import { rateLimit, clientIp } from "@/lib/auth/rate-limit";
import { sendAdminNewOrderAlert } from "@/lib/email/orders";
import { notifyOrderReceived } from "@/lib/telegram/notify";
import { approveOrder } from "@/lib/fulfillment";
import { LINK_OUT_TYPES } from "@/lib/product-types";
import type { ProductType } from "@/lib/product-types";

const ItemSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().nullable().optional(),
  quantity: z.number().int().min(1).max(50).default(1),
  customAnswer: z.string().max(1000).optional(),
  slot: z.string().max(40).optional(), // ISO datetime for coaching bookings
  customFields: z.record(z.string().max(80), z.string().max(1000)).optional(),
});

const Body = z.object({
  items: z.array(ItemSchema).min(1).max(20),
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
  locale: z.string().max(5).optional(),
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
  // v2: checkout requires a Telegram identity — delivery happens via the bot.
  const session = await getUserSession();
  const customerId = session?.customerId;
  if (!session || !customerId || !session.telegramId) {
    return NextResponse.json({ error: "telegram_required" }, { status: 401 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const b = parsed.data;

  const ipOk = await rateLimit(`checkout:ip:${clientIp(req)}`, 30, 60 * 60);
  if (!ipOk) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const db = supabaseAdmin();
  const groupId = randomUUID();
  const orderIds: string[] = [];
  const alerts: Promise<unknown>[] = [];

  for (const item of b.items) {
    const { data: product } = await db
      .from("products")
      .select(
        "id, creator_id, type, title, price, discount_price, currency, status, config, creators(telegram_user_id, display_name, store_slug, status)"
      )
      .eq("id", item.productId)
      .maybeSingle();

    const creator = product?.creators as unknown as {
      telegram_user_id: string;
      display_name: string | null;
      store_slug: string;
      status: string;
    } | null;

    if (!product || product.status !== "active" || creator?.status !== "active") {
      return NextResponse.json(
        { error: "not_available", productId: item.productId },
        { status: 404 }
      );
    }
    if (LINK_OUT_TYPES.includes(product.type as ProductType)) {
      return NextResponse.json({ error: "not_purchasable" }, { status: 400 });
    }

    const config = (product.config ?? {}) as Record<string, unknown>;
    let unitPrice = Number(product.discount_price ?? product.price);
    let shippingFee = 0;
    let variantSummary: string | null = null;
    let quantity = item.quantity;

    if (product.type === "physical") {
      if (!item.variantId || !b.shipping) {
        return NextResponse.json({ error: "invalid_request" }, { status: 400 });
      }
      const { data: variant } = await db
        .from("product_variants")
        .select("id, product_id, attribute_values, price_override, stock_count")
        .eq("id", item.variantId)
        .maybeSingle();
      if (!variant || variant.product_id !== product.id) {
        return NextResponse.json({ error: "invalid_request" }, { status: 400 });
      }
      if (variant.stock_count < quantity) {
        return NextResponse.json(
          { error: "out_of_stock", productId: product.id },
          { status: 409 }
        );
      }
      if (variant.price_override != null) {
        unitPrice = Number(variant.price_override);
      }
      shippingFee = Number(config.shipping_fee ?? 0) * quantity;
      variantSummary = Object.values(
        (variant.attribute_values ?? {}) as Record<string, string>
      ).join(" / ");
    } else {
      quantity = 1;
    }

    const itemAmount = unitPrice * quantity;
    const total = itemAmount + shippingFee;
    const isFree = total === 0;

    const { data: order, error } = await db
      .from("orders")
      .insert({
        checkout_group_id: groupId,
        creator_id: product.creator_id,
        customer_id: customerId,
        product_id: product.id,
        variant_id: item.variantId ?? null,
        quantity,
        item_amount: itemAmount,
        shipping_fee: shippingFee,
        total_charged: total,
        currency: product.currency,
        payment_status: "pending",
        metadata: {
          locale: b.locale ?? "en",
          ...(variantSummary ? { variant: variantSummary } : {}),
          ...(item.customAnswer ? { custom_answer: item.customAnswer } : {}),
          ...(item.slot ? { slot: item.slot } : {}),
          ...(item.customFields && Object.keys(item.customFields).length > 0
            ? { custom_fields: item.customFields }
            : {}),
          ...(b.shipping?.cod ? { cod: true } : {}),
        },
      })
      .select("id")
      .single();
    if (error || !order) {
      return NextResponse.json({ error: "order_failed" }, { status: 500 });
    }
    orderIds.push(order.id);

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

    // Lead capture (marketing contact) for lead magnets bought via Telegram
    if (product.type === "lead_magnet") {
      const { data: cust } = await db
        .from("customers")
        .select("telegram_username")
        .eq("id", customerId)
        .maybeSingle();
      await db.from("lead_captures").insert({
        creator_id: product.creator_id,
        product_id: product.id,
        customer_id: customerId,
        captured_telegram_username:
          cust?.telegram_username ?? session.telegramId,
      });
    }

    const totalLabel = `${total.toLocaleString()} ${product.currency}`;
    const creatorName = creator.display_name ?? creator.store_slug;

    if (isFree) {
      // Free products skip the admin queue: auto-approve + fulfill instantly
      await approveOrder(order.id, null);
    } else {
      alerts.push(
        notifyOrderReceived({
          telegramUserId: session.telegramId,
          productTitle: product.title,
          creatorName,
          orderId: order.id,
          totalLabel,
        }).catch((e) => console.error("order-received notify failed:", e)),
        sendAdminNewOrderAlert({
          orderId: order.id,
          productTitle: product.title,
          productType: product.type,
          creatorName,
          customerLabel: `Telegram ${session.telegramId}`,
          total: totalLabel,
          details: variantSummary
            ? `Variant: ${variantSummary} × ${quantity}`
            : undefined,
        }).catch((e) => console.error("admin alert failed:", e))
      );
    }
  }

  await Promise.allSettled(alerts);

  return NextResponse.json({
    orderIds,
    orderId: orderIds[0],
    groupId,
    count: orderIds.length,
  });
}

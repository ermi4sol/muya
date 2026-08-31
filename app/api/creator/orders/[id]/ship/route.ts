import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/db/client";
import { notifyShipmentUpdate } from "@/lib/telegram/notify";

const Body = z.object({
  status: z.enum(["shipped", "delivered"]),
  tracking: z.string().max(80).optional(),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getUserSession();
  if (!session || session.role !== "creator") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data: order } = await db
    .from("orders")
    .select(
      "id, creator_id, payment_status, metadata, products(title), customers(telegram_user_id), creators(display_name, store_slug)"
    )
    .eq("id", id)
    .maybeSingle();
  if (!order || order.creator_id !== session.sub) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (order.payment_status !== "paid") {
    return NextResponse.json({ error: "not_paid" }, { status: 409 });
  }

  const { error } = await db
    .from("physical_orders")
    .update({
      shipment_status: parsed.data.status,
      ...(parsed.data.tracking ? { tracking_number: parsed.data.tracking } : {}),
    })
    .eq("order_id", id);
  if (error) {
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  const product = order.products as unknown as { title: string } | null;
  const customer = order.customers as unknown as {
    telegram_user_id: string;
  } | null;
  const creator = order.creators as unknown as {
    display_name: string | null;
    store_slug: string;
  } | null;
  if (customer) {
    try {
      await notifyShipmentUpdate({
        telegramUserId: customer.telegram_user_id,
        productTitle: product?.title ?? "Your order",
        creatorName: creator?.display_name ?? creator?.store_slug ?? "the creator",
        status: parsed.data.status,
        trackingNumber: parsed.data.tracking ?? null,
      });
    } catch (e) {
      console.error("shipment notify failed:", e);
    }
  }
  return NextResponse.json({ ok: true });
}

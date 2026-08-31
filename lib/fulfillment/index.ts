import { supabaseAdmin } from "@/lib/db/client";
import { writeAuditLog } from "@/lib/db/identity";
import { createCalendarEvent } from "@/lib/integrations/google";
import { createZoomMeeting } from "@/lib/integrations/zoom";
import { getCommissionRate, splitAmount } from "@/lib/fulfillment/commission";
import { tgEscape } from "@/lib/telegram/api";
import {
  notifyOrderApproved,
  notifyOrderRejected,
  notifyCreatorSale,
  deliverFileViaTelegram,
} from "@/lib/telegram/notify";
import { enrollInFunnels } from "@/lib/telegram/growth";
import { env } from "@/lib/env";

interface OrderFull {
  id: string;
  creator_id: string;
  customer_id: string;
  product_id: string;
  variant_id: string | null;
  quantity: number;
  item_amount: number;
  shipping_fee: number;
  total_charged: number;
  currency: string;
  payment_status: string;
  metadata: Record<string, unknown>;
  products: {
    id: string;
    type: string;
    title: string;
    config: Record<string, unknown>;
  };
  customers: {
    id: string;
    telegram_user_id: string;
    telegram_username: string | null;
    name: string | null;
    preferred_locale: string | null;
  };
  creators: {
    id: string;
    telegram_user_id: string;
    telegram_username: string | null;
    display_name: string | null;
    store_slug: string;
    notification_prefs: Record<string, boolean> | null;
  };
}

async function loadOrder(orderId: string): Promise<OrderFull | null> {
  const { data } = await supabaseAdmin()
    .from("orders")
    .select(
      "id, creator_id, customer_id, product_id, variant_id, quantity, item_amount, shipping_fee, total_charged, currency, payment_status, metadata, products(id, type, title, config), customers(id, telegram_user_id, telegram_username, name, preferred_locale), creators(id, telegram_user_id, telegram_username, display_name, store_slug, notification_prefs)"
    )
    .eq("id", orderId)
    .maybeSingle();
  return data as unknown as OrderFull | null;
}

/**
 * APPROVE: flips a pending order to paid (idempotent — only the first call
 * wins), computes commission from platform settings (rate + per-type
 * exclusions), credits the creator ledger, then runs per-type fulfillment
 * through the Telegram bot. The Chapa webhook will call this same function
 * after launch.
 */
export async function approveOrder(
  orderId: string,
  adminId: string | null
): Promise<{ ok: boolean; error?: string }> {
  const db = supabaseAdmin();

  // Atomic claim: pending → paid
  const { data: claimed } = await db
    .from("orders")
    .update({
      payment_status: "paid",
      approved_by: adminId,
      approved_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .eq("payment_status", "pending")
    .select("id, total_charged");
  if (!claimed || claimed.length === 0) {
    return { ok: false, error: "not_pending" };
  }

  const order = await loadOrder(orderId);
  if (!order) return { ok: false, error: "load_failed" };

  // Commission: admin-set rate, per-type exclusions
  const total = Number(claimed[0].total_charged);
  const rate = await getCommissionRate(order.products.type);
  const { commission, net } = splitAmount(total, rate);
  await db
    .from("orders")
    .update({ commission_amount: commission, creator_net_amount: net })
    .eq("id", orderId);

  // Ledger credit (skip zero-value orders)
  if (net > 0) {
    const { data: last } = await db
      .from("creator_ledger_entries")
      .select("balance_after")
      .eq("creator_id", order.creator_id)
      .order("created_at", { ascending: false })
      .limit(1);
    const prev = Number(last?.[0]?.balance_after ?? 0);
    await db.from("creator_ledger_entries").insert({
      creator_id: order.creator_id,
      order_id: orderId,
      entry_type: "sale",
      amount: net,
      balance_after: Math.round((prev + net) * 100) / 100,
    });
  }

  if (adminId) {
    await writeAuditLog({
      admin_user_id: adminId,
      action: "approve_order",
      target_type: "order",
      target_id: orderId,
    });
  }

  try {
    await fulfillOrder({ ...order, payment_status: "paid" });
  } catch (e) {
    // Never lose a paid order: park it for the retry sweep
    console.error("fulfillment failed:", e instanceof Error ? e.message : e);
    await db.from("failed_jobs").insert({
      job_type: "fulfill_order",
      payload: { orderId },
      error: e instanceof Error ? e.message : String(e),
      attempts: 1,
      next_retry_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });
  }
  return { ok: true };
}

export async function rejectOrder(
  orderId: string,
  adminId: string,
  reason?: string
): Promise<{ ok: boolean; error?: string }> {
  const db = supabaseAdmin();
  const { data: claimed } = await db
    .from("orders")
    .update({
      payment_status: "rejected",
      approved_by: adminId,
      approved_at: new Date().toISOString(),
      rejection_reason: reason ?? null,
    })
    .eq("id", orderId)
    .eq("payment_status", "pending")
    .select("id");
  if (!claimed || claimed.length === 0) {
    return { ok: false, error: "not_pending" };
  }
  await writeAuditLog({
    admin_user_id: adminId,
    action: "reject_order",
    target_type: "order",
    target_id: orderId,
    notes: reason,
  });
  const order = await loadOrder(orderId);
  if (order) {
    try {
      await notifyOrderRejected({
        telegramUserId: order.customers.telegram_user_id,
        productTitle: order.products.title,
        creatorName: order.creators.display_name ?? order.creators.store_slug,
        orderId: order.id,
        reason,
      });
    } catch (e) {
      console.error("reject notify failed:", e);
    }
  }
  return { ok: true };
}

/**
 * FULFILL: idempotent per-type delivery, entirely through the Telegram bot.
 * Ensures the entitlement exists, performs type-specific work (files,
 * bookings, Zoom), then messages customer + creator. Every message names
 * the creator.
 */
export async function fulfillOrder(orderOrId: OrderFull | string): Promise<void> {
  const db = supabaseAdmin();
  const order =
    typeof orderOrId === "string" ? await loadOrder(orderOrId) : orderOrId;
  if (!order || order.payment_status !== "paid") return;

  const type = order.products.type;
  const config = order.products.config ?? {};
  const creatorName = order.creators.display_name ?? order.creators.store_slug;
  const customerName =
    order.customers.name ??
    (order.customers.telegram_username
      ? `@${order.customers.telegram_username}`
      : "there");

  // Entitlement (idempotent per order)
  const { data: existingEnt } = await db
    .from("entitlements")
    .select("id")
    .eq("order_id", order.id)
    .maybeSingle();
  let entitlementId = existingEnt?.id as string | undefined;
  if (!entitlementId) {
    const { data: ent } = await db
      .from("entitlements")
      .insert({
        customer_id: order.customer_id,
        product_id: order.product_id,
        order_id: order.id,
      })
      .select("id")
      .single();
    entitlementId = ent?.id;
  }

  let extraHtml = "";
  let creatorExtra = "";
  let buttons: { text: string; url: string }[][] | undefined;
  let sendFileAfter = false;

  switch (type) {
    case "digital_product":
    case "lead_magnet":
      buttons = [[{ text: "📥 Download", url: `${env.appUrl()}/access/${order.id}` }]];
      sendFileAfter = Boolean((config.file as { path?: string } | null)?.path);
      break;

    case "course":
      buttons = [[{ text: "🎓 Open the course", url: `${env.appUrl()}/learn/${order.id}` }]];
      break;

    case "coaching_call": {
      const slot = order.metadata?.slot as string | undefined;
      if (slot && entitlementId) {
        const duration = Number(config.duration_minutes ?? 60);
        const { data: existing } = await db
          .from("bookings")
          .select("id, meeting_link")
          .eq("entitlement_id", entitlementId)
          .maybeSingle();

        let meetLink: string | null = existing?.meeting_link ?? null;
        if (!existing) {
          let eventId: string | null = null;
          try {
            const event = await createCalendarEvent(order.creator_id, {
              summary: `${order.products.title} — MUYA booking`,
              description: `Booked by ${customerName} (Telegram) via MUYA.`,
              startIso: slot,
              durationMinutes: duration,
            });
            if (event) {
              eventId = event.eventId;
              meetLink = event.meetLink;
            }
          } catch (e) {
            console.error("calendar create failed:", e);
          }
          await db.from("bookings").insert({
            product_id: order.product_id,
            entitlement_id: entitlementId,
            scheduled_at: slot,
            duration_minutes: duration,
            calendar_event_id: eventId,
            meeting_link: meetLink,
          });
        }

        const when = new Date(slot).toLocaleString("en-GB", {
          dateStyle: "full",
          timeStyle: "short",
        });
        extraHtml =
          `🗓️ ${tgEscape(when)}` +
          (meetLink
            ? `\n🎥 Join link below.`
            : `\nYour coach will share the meeting link before the session.`);
        buttons = meetLink
          ? [[{ text: "🎥 Join the session", url: meetLink }]]
          : undefined;
        creatorExtra =
          `🗓️ New booking: <b>${tgEscape(when)}</b>` +
          (meetLink
            ? ` — added to your Google Calendar with a Meet link.`
            : ` — add it to your calendar. (Connect Google Calendar in Settings → Integrations for automatic events + Meet links.)`);
      }
      break;
    }

    case "webinar": {
      if (entitlementId) {
        // One Zoom meeting per webinar product, created on first registration
        let joinUrl = (config.zoom_join_url as string) ?? null;
        if (!joinUrl && config.starts_at) {
          try {
            const meeting = await createZoomMeeting({
              topic: order.products.title,
              startIso: new Date(config.starts_at as string).toISOString(),
              durationMinutes: Number(config.duration_minutes ?? 60),
            });
            if (meeting) {
              joinUrl = meeting.joinUrl;
              await db
                .from("products")
                .update({
                  config: {
                    ...config,
                    zoom_meeting_id: meeting.meetingId,
                    zoom_join_url: meeting.joinUrl,
                  },
                })
                .eq("id", order.product_id);
            }
          } catch (e) {
            console.error("zoom create failed:", e);
          }
        }

        const { data: existing } = await db
          .from("webinar_registrants")
          .select("id")
          .eq("entitlement_id", entitlementId)
          .maybeSingle();
        if (!existing) {
          await db.from("webinar_registrants").insert({
            product_id: order.product_id,
            entitlement_id: entitlementId,
            join_url: joinUrl,
          });
        }
        const startsAt = config.starts_at
          ? new Date(config.starts_at as string).toLocaleString("en-GB", {
              dateStyle: "full",
              timeStyle: "short",
            })
          : null;
        extraHtml = startsAt ? `🔴 Live on <b>${tgEscape(startsAt)}</b>` : "";
        buttons = joinUrl
          ? [[{ text: "🎥 Join the webinar", url: joinUrl }]]
          : undefined;
        if (!joinUrl) {
          extraHtml += `\nYour join link will arrive here before the event.`;
        }
      }
      break;
    }

    case "custom_product": {
      const answer = (order.metadata?.custom_answer as string) ?? "";
      const days = config.turnaround_days ?? "—";
      extraHtml = `⏱️ <b>${tgEscape(creatorName)}</b> is on it — delivery within <b>${tgEscape(String(days))} days</b>. Updates arrive here.`;
      creatorExtra =
        `✨ <b>New custom order to deliver</b> (within ${tgEscape(String(days))} days)` +
        (answer ? `\n\n"${tgEscape(answer)}"` : "") +
        `\n\nBuyer: ${tgEscape(customerName)}${order.customers.telegram_username ? ` (@${tgEscape(order.customers.telegram_username)})` : ""} — message them on Telegram to deliver.`;
      buttons = [[{ text: "📦 Order status", url: `${env.appUrl()}/order/${order.id}` }]];
      break;
    }

    case "physical": {
      // Decrement stock exactly once (guarded via metadata flag)
      if (order.variant_id && !order.metadata?.stock_decremented) {
        const { data: variant } = await db
          .from("product_variants")
          .select("stock_count")
          .eq("id", order.variant_id)
          .maybeSingle();
        if (variant) {
          await db
            .from("product_variants")
            .update({
              stock_count: Math.max(0, variant.stock_count - order.quantity),
            })
            .eq("id", order.variant_id);
          await db
            .from("orders")
            .update({ metadata: { ...order.metadata, stock_decremented: true } })
            .eq("id", order.id);
        }
      }
      const cod = Boolean(order.metadata?.cod);
      extraHtml =
        `📦 Your order will be shipped soon — tracking updates arrive right here.` +
        (cod ? `\n💵 You chose <b>cash on delivery</b> — have the amount ready.` : "");
      creatorExtra =
        `📦 <b>Ship this order:</b> ${tgEscape(String(order.metadata?.variant ?? ""))} × ${order.quantity}` +
        (cod ? ` · <b>CASH ON DELIVERY</b>` : "") +
        `\nOpen your dashboard → Orders to mark it shipped with a tracking number.`;
      buttons = [[{ text: "📦 Order status", url: `${env.appUrl()}/order/${order.id}` }]];
      break;
    }
  }

  // Buyer answers to the creator's custom checkout fields → include for the creator
  const fieldAnswers = order.metadata?.custom_fields as
    | Record<string, string>
    | undefined;
  if (fieldAnswers && Object.keys(fieldAnswers).length > 0) {
    creatorExtra +=
      `\n\n📋 <b>Buyer answers:</b>\n` +
      Object.entries(fieldAnswers)
        .map(([k, v]) => `• ${tgEscape(k)}: ${tgEscape(String(v))}`)
        .join("\n");
  }

  const rate = await getCommissionRate(type);
  const netLabel = `${splitAmount(Number(order.total_charged), rate).net.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${order.currency}`;

  const results = await Promise.allSettled([
    notifyOrderApproved({
      telegramUserId: order.customers.telegram_user_id,
      productTitle: order.products.title,
      creatorName,
      orderId: order.id,
      customerName,
      extraHtml,
      buttons,
      template: (config.tg_confirmation_template as string) ?? null,
    }),
    (Number(order.total_charged) > 0 || creatorExtra) &&
    order.creators.notification_prefs?.sales !== false
      ? notifyCreatorSale({
          creatorTelegramId: order.creators.telegram_user_id,
          productTitle: order.products.title,
          netLabel,
          customerLabel:
            customerName +
            (order.customers.telegram_username
              ? ` (@${order.customers.telegram_username})`
              : ""),
          extraHtml: creatorExtra || undefined,
        })
      : Promise.resolve(),
  ]);

  // The digital file itself, protected from forwarding
  if (sendFileAfter) {
    const file = config.file as { path?: string; name?: string } | null;
    if (file?.path) {
      await deliverFileViaTelegram({
        telegramUserId: order.customers.telegram_user_id,
        filePath: file.path,
        fileName: file.name,
        caption: `📥 ${tgEscape(order.products.title)} — from ${tgEscape(creatorName)}`,
      });
    }
  }

  // Funnel enrollment (best-effort; drips run from the cron sweep)
  try {
    await enrollInFunnels({
      creatorId: order.creator_id,
      productId: order.product_id,
      customerTelegramId: order.customers.telegram_user_id,
    });
  } catch (e) {
    console.error("funnel enrollment failed:", e);
  }

  // Surface customer-message failures to the retry sweep (creator ping is best-effort)
  if (results[0].status === "rejected") {
    throw new Error(
      `customer notify failed: ${String((results[0] as PromiseRejectedResult).reason)}`
    );
  }
}

/** Access check shared by the download/course/access pages. */
export async function verifyAccess(orderId: string) {
  const db = supabaseAdmin();
  const order = await loadOrder(orderId);
  if (!order || order.payment_status !== "paid") return null;
  const { data: ent } = await db
    .from("entitlements")
    .select("id, status")
    .eq("order_id", orderId)
    .maybeSingle();
  if (!ent || ent.status !== "active") return null;
  return order;
}

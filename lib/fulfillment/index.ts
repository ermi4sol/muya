import { supabaseAdmin } from "@/lib/db/client";
import { writeAuditLog } from "@/lib/db/identity";
import { createCalendarEvent } from "@/lib/integrations/google";
import { createZoomMeeting } from "@/lib/integrations/zoom";
import {
  sendOrderApprovedEmail,
  sendOrderRejectedEmail,
  sendCreatorSaleEmail,
} from "@/lib/email/fulfillment";

const COMMISSION_RATE = 0.07;

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
    id: string; type: string; title: string; config: Record<string, unknown>;
  };
  customers: { id: string; email: string; preferred_locale: string | null };
  creators: { id: string; email: string; display_name: string | null; store_slug: string };
}

async function loadOrder(orderId: string): Promise<OrderFull | null> {
  const { data } = await supabaseAdmin()
    .from("orders")
    .select(
      "id, creator_id, customer_id, product_id, variant_id, quantity, item_amount, shipping_fee, total_charged, currency, payment_status, metadata, products(id, type, title, config), customers(id, email, preferred_locale), creators(id, email, display_name, store_slug)"
    )
    .eq("id", orderId)
    .maybeSingle();
  return data as unknown as OrderFull | null;
}

/**
 * APPROVE: flips a pending order to paid (idempotent — only the first call
 * wins), computes the 7% commission, credits the creator ledger, then runs
 * per-type fulfillment. This same function will be called by the Chapa
 * webhook after launch.
 */
export async function approveOrder(
  orderId: string,
  adminId: string | null
): Promise<{ ok: boolean; error?: string }> {
  const db = supabaseAdmin();

  const commissionOf = (total: number) =>
    Math.round(total * COMMISSION_RATE * 100) / 100;

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

  const total = Number(claimed[0].total_charged);
  const commission = commissionOf(total);
  const net = Math.round((total - commission) * 100) / 100;
  await db
    .from("orders")
    .update({ commission_amount: commission, creator_net_amount: net })
    .eq("id", orderId);

  const order = await loadOrder(orderId);
  if (!order) return { ok: false, error: "load_failed" };

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

  await fulfillOrder(order);
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
    await sendOrderRejectedEmail({
      to: order.customers.email,
      productTitle: order.products.title,
      reason,
      locale: (order.metadata?.locale as string) ?? order.customers.preferred_locale ?? "en",
    });
  }
  return { ok: true };
}

/**
 * FULFILL: idempotent per-type delivery. Ensures the entitlement exists,
 * performs type-specific work, and emails customer + creator.
 */
export async function fulfillOrder(orderOrId: OrderFull | string): Promise<void> {
  const db = supabaseAdmin();
  const order =
    typeof orderOrId === "string" ? await loadOrder(orderOrId) : orderOrId;
  if (!order || order.payment_status !== "paid") return;

  const locale =
    (order.metadata?.locale as string) ?? order.customers.preferred_locale ?? "en";
  const type = order.products.type;
  const config = order.products.config ?? {};

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

  let accessPath: string | null = null;
  let customerExtra = "";
  let creatorExtra = "";

  switch (type) {
    case "digital_download":
    case "lead_magnet":
      accessPath = `/access/${order.id}`;
      break;

    case "course":
      accessPath = `/learn/${order.id}`;
      break;

    case "membership":
      accessPath = `/access/${order.id}`;
      break;

    case "community": {
      const { data: community } = await db
        .from("communities")
        .select("id")
        .eq("product_id", order.product_id)
        .maybeSingle();
      if (community) {
        await db
          .from("community_members")
          .upsert(
            { community_id: community.id, customer_id: order.customer_id },
            { onConflict: "community_id,customer_id", ignoreDuplicates: true }
          );
      }
      accessPath = `/access/${order.id}`;
      break;
    }

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
          // Try to create a Google Calendar event with a Meet link
          // (works when the creator has connected their calendar)
          let eventId: string | null = null;
          try {
            const event = await createCalendarEvent(order.creator_id, {
              summary: `${order.products.title} — MUYA booking`,
              description: `Booked by ${order.customers.email} via MUYA.`,
              startIso: slot,
              durationMinutes: duration,
              attendeeEmail: order.customers.email,
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

        const when = new Date(slot).toLocaleString(locale === "am" ? "am-ET" : "en-GB", {
          dateStyle: "full", timeStyle: "short",
        });
        customerExtra = meetLink
          ? `<p>🗓️ ${when}</p><p>🎥 Join here: <a href="${meetLink}">${meetLink}</a></p>`
          : `<p>🗓️ ${when}</p><p style="color:#8a9693;font-size:13px;">The meeting link will be shared by your coach before the session.</p>`;
        creatorExtra = meetLink
          ? `<p>🗓️ New booking: <strong>${when}</strong> — added to your Google Calendar with a Meet link (${meetLink}).</p>`
          : `<p>🗓️ New booking: <strong>${when}</strong> — add it to your calendar. (Automatic Google Calendar events + Meet links arrive when you connect your calendar in Settings → Integrations.)</p>`;
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
          ? new Date(config.starts_at as string).toLocaleString(undefined, {
              dateStyle: "full", timeStyle: "short",
            })
          : null;
        customerExtra = [
          startsAt ? `<p>🔴 Live on <strong>${startsAt}</strong>.</p>` : "",
          joinUrl
            ? `<p>🎥 Your join link: <a href="${joinUrl}">${joinUrl}</a></p>`
            : `<p style="color:#8a9693;font-size:13px;">Your join link will be emailed before the event.</p>`,
        ].join("");
      }
      break;
    }

    case "custom_product": {
      const answer = (order.metadata?.custom_answer as string) ?? "";
      const days = config.turnaround_days ?? "—";
      customerExtra = `<p>⏱️ Delivery within <strong>${days} days</strong>.</p>`;
      creatorExtra = `<p><strong>New custom order to deliver (within ${days} days):</strong></p><p style="background:#faf8f4;padding:10px;border-radius:8px;">"${answer}"</p><p>Reply to the buyer at ${order.customers.email}.</p>`;
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
            .update({ stock_count: Math.max(0, variant.stock_count - order.quantity) })
            .eq("id", order.variant_id);
          await db
            .from("orders")
            .update({ metadata: { ...order.metadata, stock_decremented: true } })
            .eq("id", order.id);
        }
      }
      const cod = Boolean(order.metadata?.cod);
      customerExtra = `<p>📦 Your order will be shipped soon — you'll get another email with tracking details.${cod ? " You chose <strong>cash on delivery</strong> — have the amount ready." : ""}</p>`;
      creatorExtra = `<p><strong>Ship this order:</strong> ${order.metadata?.variant ?? ""} × ${order.quantity}${cod ? " · CASH ON DELIVERY" : ""}. Open your dashboard → Orders to mark it shipped with a tracking number.</p>`;
      break;
    }
  }

  const net = order.total_charged
    ? `${(Number(order.total_charged) * (1 - COMMISSION_RATE)).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${order.currency}`
    : `0 ${order.currency}`;

  await Promise.allSettled([
    sendOrderApprovedEmail({
      to: order.customers.email,
      productTitle: order.products.title,
      orderId: order.id,
      accessPath,
      locale,
      extraHtml: customerExtra,
    }),
    Number(order.total_charged) > 0 || creatorExtra
      ? sendCreatorSaleEmail({
          to: order.creators.email,
          productTitle: order.products.title,
          netAmount: net,
          customerEmail: order.customers.email,
          extraHtml: creatorExtra,
        })
      : Promise.resolve(),
  ]);
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

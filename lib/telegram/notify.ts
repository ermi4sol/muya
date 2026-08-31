import { env } from "@/lib/env";
import { supabaseAdmin } from "@/lib/db/client";
import {
  sendTelegramMessage,
  sendTelegramDocument,
  tgEscape,
} from "@/lib/telegram/api";

/**
 * v2 order messaging — every customer/creator notification goes through the
 * bot. Every message names the creator (PDR requirement). Failures are
 * caught by callers (fulfillment parks them in failed_jobs for the sweep).
 */

type OrderMsgBase = {
  telegramUserId: string; // recipient chat id
  productTitle: string;
  creatorName: string;
  orderId: string;
};

function orderUrl(orderId: string) {
  return `${env.appUrl()}/order/${orderId}`;
}

export async function notifyOrderReceived(
  o: OrderMsgBase & { totalLabel: string }
) {
  await sendTelegramMessage(
    o.telegramUserId,
    `🧾 <b>Order received</b>\n\n` +
      `<b>${tgEscape(o.productTitle)}</b> from <b>${tgEscape(o.creatorName)}</b>\n` +
      `Total: <b>${tgEscape(o.totalLabel)}</b>\n\n` +
      `You don't pay anything yet — we'll confirm your order shortly and deliver it right here.`,
    { buttons: [[{ text: "📦 Order status", url: orderUrl(o.orderId) }]] }
  );
}

export async function notifyOrderRejected(
  o: OrderMsgBase & { reason?: string | null }
) {
  await sendTelegramMessage(
    o.telegramUserId,
    `❌ <b>Order not confirmed</b>\n\n` +
      `<b>${tgEscape(o.productTitle)}</b> from <b>${tgEscape(o.creatorName)}</b> couldn't be confirmed.` +
      (o.reason ? `\n\nReason: ${tgEscape(o.reason)}` : "") +
      `\n\nNothing was charged.`,
    { buttons: [[{ text: "Details", url: orderUrl(o.orderId) }]] }
  );
}

/** Renders the creator's custom confirmation template, if any. */
export function renderTemplate(
  template: string | null | undefined,
  vars: { customer_name: string; product_title: string; creator_name: string }
): string | null {
  if (!template?.trim()) return null;
  return tgEscape(template)
    .replaceAll("{{customer_name}}", `<b>${tgEscape(vars.customer_name)}</b>`)
    .replaceAll("{{product_title}}", `<b>${tgEscape(vars.product_title)}</b>`)
    .replaceAll("{{creator_name}}", `<b>${tgEscape(vars.creator_name)}</b>`);
}

export async function notifyOrderApproved(
  o: OrderMsgBase & {
    customerName: string;
    /** Extra type-specific HTML lines (already escaped). */
    extraHtml?: string;
    /** Buttons under the message. */
    buttons?: { text: string; url: string }[][];
    /** Creator's custom template (config.tg_confirmation_template). */
    template?: string | null;
    protectContent?: boolean;
  }
) {
  const custom = renderTemplate(o.template, {
    customer_name: o.customerName,
    product_title: o.productTitle,
    creator_name: o.creatorName,
  });
  const body =
    custom ??
    `✅ <b>Order confirmed!</b>\n\n` +
      `<b>${tgEscape(o.productTitle)}</b> from <b>${tgEscape(o.creatorName)}</b> is yours.`;
  await sendTelegramMessage(
    o.telegramUserId,
    body + (o.extraHtml ? `\n\n${o.extraHtml}` : ""),
    {
      buttons: o.buttons ?? [[{ text: "🔓 Open access", url: `${env.appUrl()}/access/${o.orderId}` }]],
      protectContent: o.protectContent ?? true,
    }
  );
}

/** Sends the actual digital file into the chat with protect_content. */
export async function deliverFileViaTelegram(o: {
  telegramUserId: string;
  filePath: string;
  fileName?: string | null;
  caption?: string;
}) {
  const { data, error } = await supabaseAdmin()
    .storage.from("product-files")
    .createSignedUrl(o.filePath, 600, { download: o.fileName ?? true });
  if (error || !data?.signedUrl) {
    throw new Error(`file sign failed: ${error?.message ?? "no url"}`);
  }
  await sendTelegramDocument(o.telegramUserId, data.signedUrl, o.caption, {
    protectContent: true,
  });
}

export async function notifyCreatorSale(o: {
  creatorTelegramId: string;
  productTitle: string;
  netLabel: string;
  customerLabel: string;
  extraHtml?: string;
}) {
  await sendTelegramMessage(
    o.creatorTelegramId,
    `💰 <b>You made a sale!</b>\n\n` +
      `<b>${tgEscape(o.productTitle)}</b> — you earn <b>${tgEscape(o.netLabel)}</b>\n` +
      `Buyer: ${tgEscape(o.customerLabel)}` +
      (o.extraHtml ? `\n\n${o.extraHtml}` : ""),
    {
      buttons: [[{ text: "📊 Open dashboard", url: `${env.appUrl()}/dashboard` }]],
    }
  );
}

export async function notifyShipmentUpdate(o: {
  telegramUserId: string;
  productTitle: string;
  creatorName: string;
  status: "shipped" | "delivered";
  trackingNumber?: string | null;
}) {
  const line =
    o.status === "shipped"
      ? `📦 <b>Your order is on its way!</b>` +
        (o.trackingNumber ? `\nTracking: <code>${tgEscape(o.trackingNumber)}</code>` : "")
      : `✅ <b>Your order was delivered.</b> Enjoy!`;
  await sendTelegramMessage(
    o.telegramUserId,
    `${line}\n\n<b>${tgEscape(o.productTitle)}</b> from <b>${tgEscape(o.creatorName)}</b>`
  );
}

export async function notifyRefund(o: {
  telegramUserId: string;
  productTitle: string;
  creatorName: string;
}) {
  await sendTelegramMessage(
    o.telegramUserId,
    `↩️ <b>Order refunded</b>\n\n` +
      `Your order for <b>${tgEscape(o.productTitle)}</b> from <b>${tgEscape(o.creatorName)}</b> was refunded and access was revoked.`
  );
}

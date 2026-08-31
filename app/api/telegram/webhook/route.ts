import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { supabaseAdmin } from "@/lib/db/client";
import { sendTelegramMessage, tgEscape } from "@/lib/telegram/api";

export const runtime = "nodejs";

/**
 * Telegram webhook for @MuyaOfficialBot.
 * Handles /start (with deep-link payloads) and "my purchases".
 * Always returns 200 quickly — Telegram retries on non-200.
 */

type TelegramUpdate = {
  message?: {
    message_id: number;
    from?: { id: number; first_name?: string; username?: string };
    chat: { id: number; type: string };
    text?: string;
  };
  callback_query?: {
    id: string;
    from: { id: number };
    data?: string;
    message?: { chat: { id: number } };
  };
};

export async function POST(req: Request) {
  // Telegram sends the secret we registered with setWebhook in this header.
  const secret = req.headers.get("x-telegram-bot-api-secret-token");
  if (secret !== env.telegramWebhookSecret()) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const update = (await req.json().catch(() => null)) as TelegramUpdate | null;
  if (!update) return NextResponse.json({ ok: true });

  try {
    const msg = update.message;
    if (msg?.text && msg.chat.type === "private" && msg.from) {
      await handleMessage(msg.chat.id, String(msg.from.id), msg.text.trim(), {
        firstName: msg.from.first_name,
        username: msg.from.username,
      });
    }
  } catch (err) {
    // Never fail the webhook — log to failed_jobs for the sweep to inspect.
    await supabaseAdmin()
      .from("failed_jobs")
      .insert({
        job_type: "telegram_webhook",
        payload: update as never,
        error: err instanceof Error ? err.message : String(err),
        status: "dead",
        attempts: 1,
        max_attempts: 1,
      });
  }
  return NextResponse.json({ ok: true });
}

async function handleMessage(
  chatId: number,
  telegramId: string,
  text: string,
  sender: { firstName?: string; username?: string }
) {
  const lower = text.toLowerCase();

  if (lower.startsWith("/start")) {
    const payload = text.split(/\s+/)[1] ?? "";
    await handleStart(chatId, telegramId, payload, sender);
    return;
  }

  if (
    lower === "/purchases" ||
    lower === "my purchases" ||
    lower === "/mypurchases"
  ) {
    await handleMyPurchases(chatId, telegramId);
    return;
  }

  await sendTelegramMessage(
    chatId,
    `I'm the <b>MUYA</b> bot 🛍\n\n` +
      `• <b>my purchases</b> — see everything you've bought\n` +
      `• Your purchases and order updates arrive here automatically.\n\n` +
      `Browse creators at ${env.appUrl()}`
  );
}

async function handleStart(
  chatId: number,
  telegramId: string,
  payload: string,
  sender: { firstName?: string; username?: string }
) {
  const name = sender.firstName ? tgEscape(sender.firstName) : "there";

  // Deep-link payloads: order_<uuid> → order status; login → point to the site
  if (payload.startsWith("order_")) {
    const orderId = payload.slice("order_".length);
    if (/^[0-9a-f-]{36}$/i.test(orderId)) {
      await sendTelegramMessage(
        chatId,
        `Hi ${name}! Track your order here:`,
        {
          buttons: [
            [{ text: "📦 Order status", url: `${env.appUrl()}/order/${orderId}` }],
          ],
        }
      );
      return;
    }
  }

  await sendTelegramMessage(
    chatId,
    `Hi ${name}, welcome to <b>MUYA</b> 👋\n\n` +
      `This is where your purchases are delivered and where sellers' updates reach you.\n\n` +
      `• Send <b>my purchases</b> anytime to see what you own.\n` +
      `• Sign in on the site with the <b>Continue with Telegram</b> button.`,
    {
      buttons: [[{ text: "🛍 Open MUYA", url: env.appUrl() }]],
    }
  );
}

async function handleMyPurchases(chatId: number, telegramId: string) {
  const db = supabaseAdmin();
  const { data: customer } = await db
    .from("customers")
    .select("id")
    .eq("telegram_user_id", telegramId)
    .maybeSingle();

  if (!customer) {
    await sendTelegramMessage(
      chatId,
      `I don't see any purchases yet. When you buy from a MUYA creator, everything you own shows up here.`
    );
    return;
  }

  const { data: entitlements } = await db
    .from("entitlements")
    .select("id, order_id, granted_at, products(title, type)")
    .eq("customer_id", customer.id)
    .eq("status", "active")
    .order("granted_at", { ascending: false })
    .limit(20);

  if (!entitlements || entitlements.length === 0) {
    await sendTelegramMessage(
      chatId,
      `No purchases yet — when an order is approved, it appears here.`
    );
    return;
  }

  const lines = entitlements.map((e, i) => {
    const product = e.products as unknown as { title: string | null; type: string } | null;
    return `${i + 1}. <b>${tgEscape(product?.title ?? "Product")}</b>`;
  });
  const buttons = entitlements
    .slice(0, 10)
    .map((e) => {
      const product = e.products as unknown as { title: string | null } | null;
      return [
        {
          text: `Open: ${(product?.title ?? "Product").slice(0, 40)}`,
          url: `${env.appUrl()}/access/${e.order_id}`,
        },
      ];
    });

  await sendTelegramMessage(
    chatId,
    `🧾 <b>Your purchases</b>\n\n${lines.join("\n")}`,
    { buttons, protectContent: true }
  );
}

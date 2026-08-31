import { env } from "@/lib/env";

/**
 * Minimal Telegram Bot API client for @MuyaOfficialBot.
 * All customer/creator messaging in v2 flows through here.
 */

const API_BASE = "https://api.telegram.org";

export class TelegramError extends Error {
  constructor(
    public method: string,
    public description: string,
    public errorCode?: number
  ) {
    super(`Telegram ${method} failed: ${description}`);
  }
}

async function call<T = unknown>(
  method: string,
  payload: Record<string, unknown>
): Promise<T> {
  const res = await fetch(`${API_BASE}/bot${env.telegramBotToken()}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await res.json().catch(() => null)) as {
    ok: boolean;
    result?: T;
    description?: string;
    error_code?: number;
  } | null;
  if (!data?.ok) {
    throw new TelegramError(
      method,
      data?.description ?? `HTTP ${res.status}`,
      data?.error_code
    );
  }
  return data.result as T;
}

export type InlineKeyboardButton = { text: string; url?: string; callback_data?: string };

export type SendMessageOptions = {
  /** Prevent forwarding/saving — used for paid content notifications. */
  protectContent?: boolean;
  /** Inline keyboard rows. */
  buttons?: InlineKeyboardButton[][];
  disablePreview?: boolean;
};

/** Send an HTML-formatted message. Returns the Telegram message id. */
export async function sendTelegramMessage(
  chatId: string | number,
  html: string,
  options: SendMessageOptions = {}
): Promise<number> {
  const result = await call<{ message_id: number }>("sendMessage", {
    chat_id: chatId,
    text: html,
    parse_mode: "HTML",
    protect_content: options.protectContent ?? false,
    ...(options.buttons ? { reply_markup: { inline_keyboard: options.buttons } } : {}),
    ...(options.disablePreview
      ? { link_preview_options: { is_disabled: true } }
      : {}),
  });
  return result.message_id;
}

/** Send a document by URL (Telegram fetches it) with protect_content. */
export async function sendTelegramDocument(
  chatId: string | number,
  fileUrl: string,
  caption?: string,
  options: { protectContent?: boolean } = {}
): Promise<number> {
  const result = await call<{ message_id: number }>("sendDocument", {
    chat_id: chatId,
    document: fileUrl,
    ...(caption ? { caption, parse_mode: "HTML" } : {}),
    protect_content: options.protectContent ?? true,
  });
  return result.message_id;
}

/** Register the webhook (called from the maintenance endpoint after deploy). */
export async function setTelegramWebhook(url: string, secretToken: string) {
  return call("setWebhook", {
    url,
    secret_token: secretToken,
    allowed_updates: ["message", "callback_query"],
    drop_pending_updates: true,
  });
}

export async function getTelegramWebhookInfo() {
  return call("getWebhookInfo", {});
}

/** Escape user-supplied text for Telegram HTML parse mode. */
export function tgEscape(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

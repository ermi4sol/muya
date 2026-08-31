import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import {
  setTelegramWebhook,
  getTelegramWebhookInfo,
} from "@/lib/telegram/api";

export const runtime = "nodejs";

/**
 * Registers (or re-registers) the bot webhook against this deployment.
 * POST with header `x-setup-key: <CRON_SECRET>`. Also called by the hourly
 * cron sweep to self-heal if the webhook ever drops.
 */
export async function POST(req: Request) {
  if (req.headers.get("x-setup-key") !== env.cronSecret()) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  const webhookUrl = `${env.appUrl()}/api/telegram/webhook`;
  await setTelegramWebhook(webhookUrl, env.telegramWebhookSecret());
  const info = await getTelegramWebhookInfo();
  return NextResponse.json({ ok: true, webhook: info });
}

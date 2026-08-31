import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/client";
import { fulfillOrder } from "@/lib/fulfillment";
import { env } from "@/lib/env";
import {
  sendTelegramMessage,
  tgEscape,
  getTelegramWebhookInfo,
  setTelegramWebhook,
} from "@/lib/telegram/api";

/**
 * Background sweep (invoked by the Netlify scheduled function, hourly):
 * 1. retries failed fulfillment/notification jobs with backoff
 * 2. sends webinar reminders via the bot ~24h before start
 * 3. self-heals the Telegram webhook registration
 */
export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${env.cronSecret()}`) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const db = supabaseAdmin();
  const results = { retried: 0, resolved: 0, dead: 0, reminders: 0, webhook: "ok" };

  // ---- 1. failed job retries ----
  const { data: jobs } = await db
    .from("failed_jobs")
    .select("id, job_type, payload, attempts, max_attempts")
    .eq("status", "retrying")
    .lte("next_retry_at", new Date().toISOString())
    .limit(20);

  for (const job of jobs ?? []) {
    results.retried++;
    try {
      if (job.job_type === "fulfill_order") {
        const orderId = (job.payload as { orderId?: string })?.orderId;
        if (orderId) await fulfillOrder(orderId);
      }
      await db
        .from("failed_jobs")
        .update({ status: "resolved", updated_at: new Date().toISOString() })
        .eq("id", job.id);
      results.resolved++;
    } catch (e) {
      const attempts = job.attempts + 1;
      const dead = attempts >= job.max_attempts;
      await db
        .from("failed_jobs")
        .update({
          attempts,
          status: dead ? "dead" : "retrying",
          error: e instanceof Error ? e.message : String(e),
          next_retry_at: new Date(
            Date.now() + Math.min(6, attempts) * 30 * 60 * 1000
          ).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id);
      if (dead) results.dead++;
    }
  }

  // ---- 2. webinar reminders via the bot (24h window) ----
  const { data: webinars } = await db
    .from("products")
    .select("id, title, config, creators(display_name, store_slug)")
    .eq("type", "webinar")
    .eq("status", "active");

  for (const w of webinars ?? []) {
    const config = (w.config ?? {}) as Record<string, unknown>;
    if (!config.starts_at || config.reminder_sent) continue;
    const start = new Date(config.starts_at as string).getTime();
    const hoursAway = (start - Date.now()) / 3600000;
    if (hoursAway <= 0 || hoursAway > 24) continue;

    const creator = w.creators as unknown as {
      display_name: string | null;
      store_slug: string;
    } | null;
    const creatorName = creator?.display_name ?? creator?.store_slug ?? "the creator";

    const { data: registrants } = await db
      .from("webinar_registrants")
      .select("join_url, entitlements(customers(telegram_user_id))")
      .eq("product_id", w.id);

    for (const r of registrants ?? []) {
      const telegramId = (
        r.entitlements as unknown as {
          customers: { telegram_user_id: string } | null;
        } | null
      )?.customers?.telegram_user_id;
      if (!telegramId) continue;
      const join = r.join_url ?? (config.zoom_join_url as string) ?? null;
      try {
        await sendTelegramMessage(
          telegramId,
          `⏰ <b>Starts soon!</b>\n\n<b>${tgEscape(w.title ?? "Webinar")}</b> from <b>${tgEscape(creatorName)}</b> goes live ${tgEscape(new Date(start).toLocaleString("en-GB", { dateStyle: "full", timeStyle: "short" }))}.`,
          join ? { buttons: [[{ text: "🎥 Join the session", url: join }]] } : {}
        );
        results.reminders++;
      } catch (e) {
        console.error("webinar reminder failed:", e);
      }
    }
    await db
      .from("products")
      .update({ config: { ...config, reminder_sent: true } })
      .eq("id", w.id);
  }

  // ---- 3. Telegram webhook self-heal ----
  try {
    const expected = `${env.appUrl()}/api/telegram/webhook`;
    const info = (await getTelegramWebhookInfo()) as { url?: string };
    if (info?.url !== expected) {
      await setTelegramWebhook(expected, env.telegramWebhookSecret());
      results.webhook = "re-registered";
    }
  } catch (e) {
    results.webhook = `error: ${e instanceof Error ? e.message : String(e)}`;
  }

  return NextResponse.json(results);
}

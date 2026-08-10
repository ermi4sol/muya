import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/client";
import { fulfillOrder } from "@/lib/fulfillment";
import { sendEmail, brandedEmail, ctaButton } from "@/lib/email/send";
import { env } from "@/lib/env";

/**
 * Background sweep (invoked by the Netlify scheduled function, hourly):
 * 1. retries failed fulfillment jobs with backoff
 * 2. sends webinar reminder emails ~24h before start
 */
export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${env.cronSecret()}`) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const db = supabaseAdmin();
  const results = { retried: 0, resolved: 0, dead: 0, reminders: 0 };

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

  // ---- 2. webinar reminders (24h window) ----
  const { data: webinars } = await db
    .from("products")
    .select("id, title, config")
    .eq("type", "webinar")
    .eq("status", "active");

  for (const w of webinars ?? []) {
    const config = (w.config ?? {}) as Record<string, unknown>;
    if (!config.starts_at || config.reminder_sent) continue;
    const start = new Date(config.starts_at as string).getTime();
    const hoursAway = (start - Date.now()) / 3600000;
    if (hoursAway <= 0 || hoursAway > 24) continue;

    const { data: registrants } = await db
      .from("webinar_registrants")
      .select("join_url, entitlements(customers(email))")
      .eq("product_id", w.id);

    for (const r of registrants ?? []) {
      const email = (
        r.entitlements as unknown as { customers: { email: string } | null } | null
      )?.customers?.email;
      if (!email) continue;
      const join = r.join_url ?? (config.zoom_join_url as string) ?? null;
      await sendEmail({
        to: email,
        subject: `⏰ Starts soon — ${w.title}`,
        html: brandedEmail(
          `<p><strong>${w.title}</strong> goes live ${new Date(start).toLocaleString()}.</p>${join ? ctaButton(join, "Join the session") : ""}`
        ),
      });
      results.reminders++;
    }
    await db
      .from("products")
      .update({ config: { ...config, reminder_sent: true } })
      .eq("id", w.id);
  }

  return NextResponse.json(results);
}

import { supabaseAdmin } from "@/lib/db/client";
import { sendTelegramMessage, tgEscape } from "@/lib/telegram/api";

/** R6 growth engines: funnel enrollment/dripping + scheduled flow broadcasts. */

type FunnelStep = { message: string; delay_hours: number };

/** Enrolls a buyer into the creator's active funnels (called after fulfillment). */
export async function enrollInFunnels(o: {
  creatorId: string;
  productId: string;
  customerTelegramId: string;
}): Promise<void> {
  const db = supabaseAdmin();
  const { data: funnels } = await db
    .from("funnels")
    .select("id, trigger_product_id, steps")
    .eq("creator_id", o.creatorId)
    .eq("status", "active");

  for (const f of funnels ?? []) {
    if (f.trigger_product_id && f.trigger_product_id !== o.productId) continue;
    const steps = (f.steps as FunnelStep[]) ?? [];
    if (steps.length === 0) continue;
    const firstDelay = Number(steps[0].delay_hours ?? 24);
    await db.from("funnel_enrollments").upsert(
      {
        funnel_id: f.id,
        telegram_user_id: o.customerTelegramId,
        step_index: 0,
        next_send_at: new Date(Date.now() + firstDelay * 3600000).toISOString(),
        completed: false,
      },
      { onConflict: "funnel_id,telegram_user_id", ignoreDuplicates: true }
    );
  }
}

/** Cron: sends due funnel steps and advances/completes enrollments. */
export async function processFunnelSteps(): Promise<number> {
  const db = supabaseAdmin();
  let sent = 0;
  const { data: due } = await db
    .from("funnel_enrollments")
    .select(
      "id, funnel_id, telegram_user_id, step_index, funnels(steps, status, creators(display_name, store_slug))"
    )
    .eq("completed", false)
    .lte("next_send_at", new Date().toISOString())
    .limit(50);

  for (const e of due ?? []) {
    const funnel = e.funnels as unknown as {
      steps: FunnelStep[];
      status: string;
      creators: { display_name: string | null; store_slug: string } | null;
    } | null;
    const steps = funnel?.steps ?? [];
    const step = steps[e.step_index];

    if (!funnel || funnel.status !== "active" || !step) {
      await db
        .from("funnel_enrollments")
        .update({ completed: true })
        .eq("id", e.id);
      continue;
    }

    const creatorName =
      funnel.creators?.display_name ?? funnel.creators?.store_slug ?? "the creator";
    try {
      await sendTelegramMessage(
        e.telegram_user_id,
        `${tgEscape(step.message)}\n\n— ${tgEscape(creatorName)}`
      );
      sent++;
    } catch {
      // unreachable chat — stop the sequence for this person
      await db
        .from("funnel_enrollments")
        .update({ completed: true })
        .eq("id", e.id);
      continue;
    }

    const nextIndex = e.step_index + 1;
    const nextStep = steps[nextIndex];
    await db
      .from("funnel_enrollments")
      .update(
        nextStep
          ? {
              step_index: nextIndex,
              next_send_at: new Date(
                Date.now() + Number(nextStep.delay_hours ?? 24) * 3600000
              ).toISOString(),
            }
          : { completed: true }
      )
      .eq("id", e.id);
  }
  return sent;
}

type FlowBlock = { type: "text" | "button"; text: string; url?: string };

/** Distinct Telegram ids of a creator's audience (buyers + captured leads). */
export async function audienceTelegramIds(creatorId: string): Promise<string[]> {
  const db = supabaseAdmin();
  const [{ data: buyers }, { data: leads }] = await Promise.all([
    db
      .from("orders")
      .select("customers(telegram_user_id)")
      .eq("creator_id", creatorId)
      .in("payment_status", ["paid", "pending"])
      .limit(2000),
    db
      .from("lead_captures")
      .select("customers(telegram_user_id)")
      .eq("creator_id", creatorId)
      .limit(2000),
  ]);
  const ids = new Set<string>();
  for (const row of [...(buyers ?? []), ...(leads ?? [])]) {
    const id = (row.customers as unknown as { telegram_user_id: string } | null)
      ?.telegram_user_id;
    if (id) ids.add(id);
  }
  return [...ids];
}

/** Sends one flow (broadcast) to the creator's audience. Returns recipients. */
export async function sendFlow(flowId: string): Promise<number> {
  const db = supabaseAdmin();
  const { data: flow } = await db
    .from("telegram_flows")
    .select("id, creator_id, blocks, status, creators(display_name, store_slug)")
    .eq("id", flowId)
    .maybeSingle();
  if (!flow || flow.status === "sent") return 0;

  const blocks = (flow.blocks as FlowBlock[]) ?? [];
  const textParts = blocks
    .filter((b) => b.type === "text" && b.text?.trim())
    .map((b) => tgEscape(b.text));
  const buttons = blocks
    .filter((b) => b.type === "button" && b.text && b.url)
    .map((b) => [{ text: b.text, url: b.url! }]);
  if (textParts.length === 0) return 0;

  const creator = flow.creators as unknown as {
    display_name: string | null;
    store_slug: string;
  } | null;
  const creatorName = creator?.display_name ?? creator?.store_slug ?? "the creator";
  const message = `${textParts.join("\n\n")}\n\n— ${tgEscape(creatorName)}`;

  const ids = await audienceTelegramIds(flow.creator_id);
  let sent = 0;
  for (const id of ids) {
    try {
      await sendTelegramMessage(id, message, {
        buttons: buttons.length ? buttons : undefined,
      });
      sent++;
    } catch {
      // skip unreachable chats
    }
  }

  await db
    .from("telegram_flows")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
      recipients_count: sent,
    })
    .eq("id", flowId);
  return sent;
}

/** Cron: fires scheduled flows whose time has come. */
export async function sendScheduledFlows(): Promise<number> {
  const db = supabaseAdmin();
  const { data: due } = await db
    .from("telegram_flows")
    .select("id")
    .eq("status", "scheduled")
    .lte("scheduled_at", new Date().toISOString())
    .limit(5);
  let total = 0;
  for (const f of due ?? []) {
    total += await sendFlow(f.id);
  }
  return total;
}

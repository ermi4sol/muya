import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/db/client";
import { sendFlow } from "@/lib/telegram/growth";

const BlockSchema = z.object({
  type: z.enum(["text", "button"]),
  text: z.string().max(1500),
  url: z.string().url().max(500).optional(),
});

const CreateBody = z.object({ name: z.string().min(1).max(80) });

const PatchBody = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(80).optional(),
  blocks: z.array(BlockSchema).max(12).optional(),
  action: z.enum(["save", "schedule", "send_now", "unschedule"]).default("save"),
  scheduled_at: z.string().datetime({ offset: true }).optional(),
});

async function ownedFlow(id: string, creatorId: string) {
  const { data } = await supabaseAdmin()
    .from("telegram_flows")
    .select("id, status")
    .eq("id", id)
    .eq("creator_id", creatorId)
    .maybeSingle();
  return data;
}

export async function POST(req: Request) {
  const session = await getUserSession();
  if (!session || session.role !== "creator") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const parsed = CreateBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const { data, error } = await supabaseAdmin()
    .from("telegram_flows")
    .insert({ creator_id: session.sub, name: parsed.data.name })
    .select("id")
    .single();
  if (error || !data) {
    return NextResponse.json({ error: "create_failed" }, { status: 500 });
  }
  return NextResponse.json({ id: data.id });
}

export async function PATCH(req: Request) {
  const session = await getUserSession();
  if (!session || session.role !== "creator") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const parsed = PatchBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_request", detail: parsed.error.issues[0]?.message },
      { status: 400 }
    );
  }
  const { id, action, scheduled_at, ...fields } = parsed.data;
  const flow = await ownedFlow(id, session.sub);
  if (!flow) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (flow.status === "sent") {
    return NextResponse.json({ error: "already_sent" }, { status: 409 });
  }

  const db = supabaseAdmin();
  const updates: Record<string, unknown> = { ...fields };

  if (action === "schedule") {
    if (!scheduled_at || new Date(scheduled_at).getTime() < Date.now()) {
      return NextResponse.json({ error: "bad_schedule" }, { status: 400 });
    }
    updates.status = "scheduled";
    updates.scheduled_at = scheduled_at;
  } else if (action === "unschedule") {
    updates.status = "draft";
    updates.scheduled_at = null;
  }

  if (Object.keys(updates).length > 0) {
    const { error } = await db
      .from("telegram_flows")
      .update(updates)
      .eq("id", id)
      .eq("creator_id", session.sub);
    if (error) {
      return NextResponse.json({ error: "update_failed" }, { status: 500 });
    }
  }

  if (action === "send_now") {
    const sent = await sendFlow(id);
    return NextResponse.json({ ok: true, sent });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const session = await getUserSession();
  if (!session || session.role !== "creator") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id || !/^[0-9a-f-]{36}$/.test(id)) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const { error } = await supabaseAdmin()
    .from("telegram_flows")
    .delete()
    .eq("id", id)
    .eq("creator_id", session.sub);
  if (error) {
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

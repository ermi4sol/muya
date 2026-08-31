import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/db/client";

const StepSchema = z.object({
  message: z.string().min(1).max(1500),
  delay_hours: z.number().min(0).max(24 * 30).default(24),
});

const CreateBody = z.object({
  name: z.string().min(1).max(80),
});

const PatchBody = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(80).optional(),
  status: z.enum(["draft", "active", "archived"]).optional(),
  trigger_product_id: z.string().uuid().nullable().optional(),
  steps: z.array(StepSchema).max(10).optional(),
});

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
    .from("funnels")
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
  const { id, ...fields } = parsed.data;
  const { error } = await supabaseAdmin()
    .from("funnels")
    .update(fields)
    .eq("id", id)
    .eq("creator_id", session.sub);
  if (error) {
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
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
    .from("funnels")
    .delete()
    .eq("id", id)
    .eq("creator_id", session.sub);
  if (error) {
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

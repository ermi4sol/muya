import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { z } from "zod";
import { getUserSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/db/client";

const CreateBody = z.object({
  name: z.string().min(1).max(60),
  commission_percent: z.number().min(1).max(90).default(20),
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
  const code = randomBytes(4).toString("hex");
  const { data, error } = await supabaseAdmin()
    .from("affiliates")
    .insert({
      creator_id: session.sub,
      name: parsed.data.name,
      commission_percent: parsed.data.commission_percent,
      referral_code: code,
    })
    .select("id, referral_code")
    .single();
  if (error || !data) {
    return NextResponse.json({ error: "create_failed" }, { status: 500 });
  }
  return NextResponse.json({ id: data.id, code: data.referral_code });
}

const PatchBody = z.object({
  id: z.string().uuid(),
  commission_percent: z.number().min(1).max(90),
});

export async function PATCH(req: Request) {
  const session = await getUserSession();
  if (!session || session.role !== "creator") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const parsed = PatchBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const { error } = await supabaseAdmin()
    .from("affiliates")
    .update({ commission_percent: parsed.data.commission_percent })
    .eq("id", parsed.data.id)
    .eq("creator_id", session.sub);
  if (error) {
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

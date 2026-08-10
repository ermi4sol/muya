import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession, requireAdminRole } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/db/client";
import { writeAuditLog } from "@/lib/db/identity";

const Body = z.object({ action: z.enum(["suspend", "reinstate"]) });

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!requireAdminRole(session, ["trust_safety", "support"])) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const { error } = await supabaseAdmin()
    .from("creators")
    .update({ status: parsed.data.action === "suspend" ? "suspended" : "active" })
    .eq("id", id);
  if (error) return NextResponse.json({ error: "failed" }, { status: 500 });
  await writeAuditLog({
    admin_user_id: session!.sub,
    action: `${parsed.data.action}_creator`,
    target_type: "creator",
    target_id: id,
  });
  return NextResponse.json({ ok: true });
}

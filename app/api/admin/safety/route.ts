import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession, requireAdminRole } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/db/client";
import { writeAuditLog } from "@/lib/db/identity";

const Body = z.object({
  action: z.enum(["remove_post", "approve_post", "freeze", "unfreeze"]),
  id: z.string().uuid(),
});

export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!requireAdminRole(session, ["trust_safety"])) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const db = supabaseAdmin();
  const { action, id } = parsed.data;

  if (action === "remove_post") {
    await db.from("community_posts").update({ removed: true }).eq("id", id);
  } else if (action === "approve_post") {
    await db
      .from("community_posts")
      .update({ reported: false, report_reason: null })
      .eq("id", id);
  } else {
    await db
      .from("communities")
      .update({ frozen: action === "freeze" })
      .eq("id", id);
  }
  await writeAuditLog({
    admin_user_id: session!.sub,
    action: `safety_${action}`,
    target_type: action.includes("post") ? "community_post" : "community",
    target_id: id,
  });
  return NextResponse.json({ ok: true });
}

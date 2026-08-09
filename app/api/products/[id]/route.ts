import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/db/client";

const Body = z.object({
  status: z.enum(["active", "draft"]).optional(),
  sort_order: z.number().int().min(0).max(10000).optional(),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getUserSession();
  if (!session || session.role !== "creator") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  // Ownership check before any write
  const db = supabaseAdmin();
  const { data: product } = await db
    .from("products")
    .select("id, creator_id")
    .eq("id", id)
    .maybeSingle();
  if (!product || product.creator_id !== session.sub) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { error } = await db.from("products").update(parsed.data).eq("id", id);
  if (error) {
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

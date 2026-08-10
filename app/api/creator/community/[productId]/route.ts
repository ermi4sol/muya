import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/db/client";

const Body = z.object({
  postId: z.string().uuid(),
  action: z.enum(["remove", "restore"]),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ productId: string }> }
) {
  const session = await getUserSession();
  if (!session || session.role !== "creator") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { productId } = await ctx.params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data: product } = await db
    .from("products")
    .select("id, creator_id")
    .eq("id", productId)
    .maybeSingle();
  if (!product || product.creator_id !== session.sub) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const { data: community } = await db
    .from("communities")
    .select("id")
    .eq("product_id", productId)
    .maybeSingle();
  if (!community) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { data: post } = await db
    .from("community_posts")
    .select("id, community_id")
    .eq("id", parsed.data.postId)
    .maybeSingle();
  if (!post || post.community_id !== community.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  await db
    .from("community_posts")
    .update({ removed: parsed.data.action === "remove" })
    .eq("id", post.id);
  return NextResponse.json({ ok: true });
}

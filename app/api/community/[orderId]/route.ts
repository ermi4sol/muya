import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/db/client";
import { communityContext, loadFeed } from "@/lib/db/community";
import { rateLimit } from "@/lib/auth/rate-limit";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await ctx.params;
  const context = await communityContext(orderId);
  if (!context) return NextResponse.json({ error: "no_access" }, { status: 403 });
  const posts = await loadFeed(context.community.id, context.order.customer_id);
  return NextResponse.json({ posts, name: context.community.name });
}

const PostBody = z.object({ body: z.string().min(1).max(2000) });

export async function POST(
  req: Request,
  ctx: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await ctx.params;
  const context = await communityContext(orderId);
  if (!context) return NextResponse.json({ error: "no_access" }, { status: 403 });

  const ok = await rateLimit(`compost:${context.order.customer_id}`, 15, 15 * 60);
  if (!ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const parsed = PostBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const { error } = await supabaseAdmin().from("community_posts").insert({
    community_id: context.community.id,
    author_customer_id: context.order.customer_id,
    body: parsed.data.body,
  });
  if (error) return NextResponse.json({ error: "failed" }, { status: 500 });
  return NextResponse.json({ ok: true });
}

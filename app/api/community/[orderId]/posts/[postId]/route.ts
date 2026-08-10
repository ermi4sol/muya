import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/db/client";
import { communityContext } from "@/lib/db/community";
import { rateLimit } from "@/lib/auth/rate-limit";

const Body = z.object({
  action: z.enum(["like", "unlike", "comment", "report", "delete"]),
  body: z.string().max(1000).optional(),
  reason: z.string().max(200).optional(),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ orderId: string; postId: string }> }
) {
  const { orderId, postId } = await ctx.params;
  const context = await communityContext(orderId);
  if (!context) return NextResponse.json({ error: "no_access" }, { status: 403 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const db = supabaseAdmin();
  const customerId = context.order.customer_id;

  // The post must belong to this community
  const { data: post } = await db
    .from("community_posts")
    .select("id, community_id, author_customer_id")
    .eq("id", postId)
    .maybeSingle();
  if (!post || post.community_id !== context.community.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  switch (parsed.data.action) {
    case "like":
      await db
        .from("community_post_likes")
        .upsert(
          { post_id: postId, customer_id: customerId },
          { onConflict: "post_id,customer_id", ignoreDuplicates: true }
        );
      break;
    case "unlike":
      await db
        .from("community_post_likes")
        .delete()
        .eq("post_id", postId)
        .eq("customer_id", customerId);
      break;
    case "comment": {
      if (!parsed.data.body?.trim()) {
        return NextResponse.json({ error: "invalid_request" }, { status: 400 });
      }
      const ok = await rateLimit(`comcomment:${customerId}`, 30, 15 * 60);
      if (!ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
      await db.from("community_post_comments").insert({
        post_id: postId,
        author_customer_id: customerId,
        body: parsed.data.body,
      });
      break;
    }
    case "report":
      await db
        .from("community_posts")
        .update({ reported: true, report_reason: parsed.data.reason ?? "reported by member" })
        .eq("id", postId);
      break;
    case "delete":
      // Members can delete their own posts only
      if (post.author_customer_id !== customerId) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
      }
      await db.from("community_posts").update({ removed: true }).eq("id", postId);
      break;
  }
  return NextResponse.json({ ok: true });
}

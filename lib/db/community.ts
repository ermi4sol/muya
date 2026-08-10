import { supabaseAdmin } from "@/lib/db/client";
import { verifyAccess } from "@/lib/fulfillment";

export interface FeedPost {
  id: string;
  body: string | null;
  authorName: string;
  mine: boolean;
  likes: number;
  likedByMe: boolean;
  reported: boolean;
  createdAt: string;
  comments: { id: string; body: string; authorName: string; createdAt: string }[];
}

/** Resolve an order capability → community membership context. */
export async function communityContext(orderId: string) {
  const order = await verifyAccess(orderId);
  if (!order || order.products.type !== "community") return null;
  const db = supabaseAdmin();
  const { data: community } = await db
    .from("communities")
    .select("id, name, frozen")
    .eq("product_id", order.product_id)
    .maybeSingle();
  if (!community || community.frozen) return null;
  const { data: member } = await db
    .from("community_members")
    .select("id")
    .eq("community_id", community.id)
    .eq("customer_id", order.customer_id)
    .maybeSingle();
  if (!member) return null;
  return { order, community };
}

function displayName(email: string, name: string | null): string {
  if (name) return name;
  const local = email.split("@")[0];
  return local.length > 2 ? `${local.slice(0, 2)}***` : local;
}

export async function loadFeed(
  communityId: string,
  viewerCustomerId: string
): Promise<FeedPost[]> {
  const db = supabaseAdmin();
  const { data: posts } = await db
    .from("community_posts")
    .select(
      "id, body, reported, removed, created_at, author_customer_id, customers(email, name), community_post_likes(customer_id), community_post_comments(id, body, removed, created_at, author_customer_id, customers(email, name))"
    )
    .eq("community_id", communityId)
    .eq("removed", false)
    .order("created_at", { ascending: false })
    .limit(50);

  return (posts ?? []).map((p) => {
    const author = p.customers as unknown as { email: string; name: string | null } | null;
    const likes = (p.community_post_likes ?? []) as { customer_id: string }[];
    const comments = (
      (p.community_post_comments ?? []) as unknown as {
        id: string; body: string; removed: boolean; created_at: string;
        author_customer_id: string;
        customers: { email: string; name: string | null } | null;
      }[]
    )
      .filter((c) => !c.removed)
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((c) => ({
        id: c.id,
        body: c.body,
        authorName: displayName(c.customers?.email ?? "?", c.customers?.name ?? null),
        createdAt: c.created_at,
      }));
    return {
      id: p.id,
      body: p.body,
      authorName: displayName(author?.email ?? "?", author?.name ?? null),
      mine: p.author_customer_id === viewerCustomerId,
      likes: likes.length,
      likedByMe: likes.some((l) => l.customer_id === viewerCustomerId),
      reported: p.reported,
      createdAt: p.created_at,
      comments,
    };
  });
}

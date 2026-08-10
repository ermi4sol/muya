import { notFound } from "next/navigation";
import { communityContext, loadFeed } from "@/lib/db/community";
import { CommunityFeed } from "@/components/community/Feed";

export const dynamic = "force-dynamic";

export default async function CommunityPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  if (!/^[0-9a-f-]{36}$/.test(orderId)) notFound();
  const context = await communityContext(orderId);
  if (!context) notFound();
  const posts = await loadFeed(context.community.id, context.order.customer_id);

  return (
    <div className="min-h-dvh bg-bg">
      <CommunityFeed
        orderId={orderId}
        initialPosts={posts}
        communityName={context.community.name ?? "Community"}
      />
    </div>
  );
}

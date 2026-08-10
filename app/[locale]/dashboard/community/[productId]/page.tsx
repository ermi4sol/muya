import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getUserSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/db/client";
import { ModerationList } from "@/components/community/ModerationList";

export const dynamic = "force-dynamic";

export default async function CommunityModerationPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const session = await getUserSession();
  if (!session || session.role !== "creator") redirect("/signin");
  const { productId } = await params;
  const t = await getTranslations("community");

  const db = supabaseAdmin();
  const { data: product } = await db
    .from("products")
    .select("id, creator_id, title")
    .eq("id", productId)
    .maybeSingle();
  if (!product || product.creator_id !== session.sub) notFound();

  const { data: community } = await db
    .from("communities")
    .select("id, name")
    .eq("product_id", productId)
    .maybeSingle();
  if (!community) notFound();

  const [{ data: posts }, { count: memberCount }] = await Promise.all([
    db
      .from("community_posts")
      .select("id, body, reported, report_reason, removed, created_at, customers(email, name)")
      .eq("community_id", community.id)
      .order("created_at", { ascending: false })
      .limit(100),
    db
      .from("community_members")
      .select("id", { count: "exact", head: true })
      .eq("community_id", community.id),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-heading text-2xl font-bold text-ink">
        💬 {community.name}
      </h1>
      <p className="mt-1 text-sm text-ink-soft">
        {t("members", { n: memberCount ?? 0 })} · {t("modSub")}
      </p>
      <ModerationList
        productId={productId}
        posts={(posts ?? []).map((p) => ({
          id: p.id,
          body: p.body,
          reported: p.reported,
          reportReason: p.report_reason,
          removed: p.removed,
          createdAt: p.created_at,
          authorEmail:
            (p.customers as unknown as { email: string } | null)?.email ?? "—",
        }))}
      />
    </div>
  );
}

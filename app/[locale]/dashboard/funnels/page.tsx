import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getUserSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/db/client";
import {
  FunnelManager,
  type FunnelRow,
} from "@/components/dashboard/FunnelManager";

export const dynamic = "force-dynamic";

/** Funnels tab (UI page 31): linear Telegram sequences after a purchase. */
export default async function FunnelsPage() {
  const session = await getUserSession();
  if (!session || session.role !== "creator") redirect("/signin");
  const t = await getTranslations("growth");
  const db = supabaseAdmin();

  const [{ data: funnels }, { data: products }] = await Promise.all([
    db
      .from("funnels")
      .select("id, name, status, trigger_product_id, steps, funnel_enrollments(id)")
      .eq("creator_id", session.sub)
      .neq("status", "archived")
      .order("created_at", { ascending: false }),
    db
      .from("products")
      .select("id, title")
      .eq("creator_id", session.sub)
      .eq("status", "active")
      .order("sort_order"),
  ]);

  const rows: FunnelRow[] = (funnels ?? []).map((f) => ({
    id: f.id,
    name: f.name,
    status: f.status,
    trigger_product_id: f.trigger_product_id,
    steps: (f.steps as FunnelRow["steps"]) ?? [],
    enrolled: ((f.funnel_enrollments as { id: string }[] | null) ?? []).length,
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="font-heading text-2xl font-bold text-ink">
        🪜 {t("funnelsTitle")}
      </h1>
      <p className="text-sm text-ink-soft">{t("funnelsSub")}</p>
      <FunnelManager
        funnels={rows}
        triggerOptions={(products ?? []).map((p) => ({
          id: p.id,
          title: p.title ?? "—",
        }))}
      />
    </div>
  );
}

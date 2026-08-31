import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getUserSession } from "@/lib/auth/session";
import { getCreator } from "@/lib/db/creator";
import { supabaseAdmin } from "@/lib/db/client";
import { FlowManager, type FlowRow } from "@/components/dashboard/FlowManager";

export const dynamic = "force-dynamic";

/** Telegram Flows tab (UI page 34): broadcasts/automations. */
export default async function FlowsPage() {
  const session = await getUserSession();
  if (!session || session.role !== "creator") redirect("/signin");
  const creator = await getCreator(session.sub);
  if (!creator) redirect("/signin");
  const t = await getTranslations("growth");

  const { data: flows } = await supabaseAdmin()
    .from("telegram_flows")
    .select("id, name, status, blocks, scheduled_at, sent_at, recipients_count")
    .eq("creator_id", creator.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <h1 className="font-heading text-2xl font-bold text-ink">
        ✈️ {t("flowsTitle")}
      </h1>
      <p className="text-sm text-ink-soft">{t("flowsSub")}</p>
      <FlowManager
        flows={(flows ?? []) as FlowRow[]}
        creatorName={creator.display_name ?? creator.store_slug}
      />
    </div>
  );
}

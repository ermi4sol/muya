import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getUserSession } from "@/lib/auth/session";
import { getCreator } from "@/lib/db/creator";
import { supabaseAdmin } from "@/lib/db/client";
import {
  AffiliateManager,
  type AffiliateRow,
} from "@/components/dashboard/AffiliateManager";

export const dynamic = "force-dynamic";

/** Referrals tab (UI page 33): affiliates table, commission setting, invites. */
export default async function ReferralsPage() {
  const session = await getUserSession();
  if (!session || session.role !== "creator") redirect("/signin");
  const creator = await getCreator(session.sub);
  if (!creator) redirect("/signin");
  const t = await getTranslations("growth");
  const db = supabaseAdmin();

  const { data: affiliates } = await db
    .from("affiliates")
    .select(
      "id, name, referral_code, commission_percent, affiliate_referrals(commission_amount, orders(payment_status))"
    )
    .eq("creator_id", creator.id)
    .order("created_at", { ascending: false });

  const rows: AffiliateRow[] = (affiliates ?? []).map((a) => {
    const refs =
      (a.affiliate_referrals as unknown as {
        commission_amount: number | null;
        orders: { payment_status: string } | null;
      }[]) ?? [];
    const paidRefs = refs.filter((r) => r.orders?.payment_status === "paid");
    return {
      id: a.id,
      name: a.name,
      referral_code: a.referral_code,
      commission_percent: Number(a.commission_percent),
      referrals: refs.length,
      earned: paidRefs.reduce((s, r) => s + Number(r.commission_amount ?? 0), 0),
    };
  });

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <h1 className="font-heading text-2xl font-bold text-ink">
        🤝 {t("referralsTitle")}
      </h1>
      <p className="text-sm text-ink-soft">{t("referralsSub")}</p>
      <AffiliateManager
        affiliates={rows}
        storeSlug={creator.store_slug}
        currency={creator.currency}
      />
    </div>
  );
}

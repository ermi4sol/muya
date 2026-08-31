import { supabaseAdmin } from "@/lib/db/client";

/**
 * v2 commission engine.
 * Rate comes from platform_settings.commission_percent (admin-editable,
 * default 7.00). A product type present in commission_type_exclusions with
 * is_excluded = true pays NO commission at all.
 */
export async function getCommissionRate(productType: string): Promise<number> {
  const db = supabaseAdmin();
  const [{ data: settings }, { data: exclusion }] = await Promise.all([
    db
      .from("platform_settings")
      .select("commission_percent")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    db
      .from("commission_type_exclusions")
      .select("is_excluded")
      .eq("product_type", productType)
      .maybeSingle(),
  ]);
  if (exclusion?.is_excluded) return 0;
  const percent = Number(settings?.commission_percent ?? 7);
  return Math.max(0, Math.min(100, percent)) / 100;
}

export function splitAmount(total: number, rate: number) {
  const commission = Math.round(total * rate * 100) / 100;
  const net = Math.round((total - commission) * 100) / 100;
  return { commission, net };
}

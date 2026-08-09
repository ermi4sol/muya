import { supabaseAdmin } from "@/lib/db/client";

export interface CreatorFull {
  id: string;
  email: string;
  store_slug: string;
  display_name: string | null;
  bio: string | null;
  profile_image_url: string | null;
  social_links: Record<string, string>;
  theme: { preset?: string };
  currency: string;
  preferred_locale: string;
  status: string;
}

export interface ProductRow {
  id: string;
  type: string;
  title: string;
  description: string | null;
  price: number;
  currency: string;
  status: string;
  sort_order: number;
  config: Record<string, unknown>;
}

export async function getCreator(id: string): Promise<CreatorFull | null> {
  const { data } = await supabaseAdmin()
    .from("creators")
    .select(
      "id, email, store_slug, display_name, bio, profile_image_url, social_links, theme, currency, preferred_locale, status"
    )
    .eq("id", id)
    .maybeSingle();
  return data as CreatorFull | null;
}

export async function getCreatorProducts(
  creatorId: string
): Promise<ProductRow[]> {
  const { data } = await supabaseAdmin()
    .from("products")
    .select("id, type, title, description, price, currency, status, sort_order, config")
    .eq("creator_id", creatorId)
    .neq("status", "archived")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  return (data ?? []) as ProductRow[];
}

/** Revenue + recent orders snapshot for the dashboard home. */
export async function getCreatorSnapshot(creatorId: string) {
  const db = supabaseAdmin();
  const now = Date.now();
  const dayAgo = new Date(now - 24 * 3600 * 1000).toISOString();
  const weekAgo = new Date(now - 7 * 24 * 3600 * 1000).toISOString();
  const monthAgo = new Date(now - 30 * 24 * 3600 * 1000).toISOString();

  const [{ data: sales }, { data: orders }, { data: ledger }] =
    await Promise.all([
      db
        .from("orders")
        .select("creator_net_amount, created_at")
        .eq("creator_id", creatorId)
        .eq("payment_status", "paid")
        .gte("created_at", monthAgo),
      db
        .from("orders")
        .select(
          "id, item_amount, currency, payment_status, created_at, products(title), customers(email)"
        )
        .eq("creator_id", creatorId)
        .order("created_at", { ascending: false })
        .limit(5),
      db
        .from("creator_ledger_entries")
        .select("balance_after")
        .eq("creator_id", creatorId)
        .order("created_at", { ascending: false })
        .limit(1),
    ]);

  const sum = (since: string) =>
    (sales ?? [])
      .filter((s) => s.created_at >= since)
      .reduce((a, s) => a + Number(s.creator_net_amount ?? 0), 0);

  return {
    revenue: { today: sum(dayAgo), week: sum(weekAgo), month: sum(monthAgo) },
    balance: Number(ledger?.[0]?.balance_after ?? 0),
    recentOrders: (orders ?? []).map((o) => ({
      id: o.id,
      amount: Number(o.item_amount),
      currency: o.currency,
      status: o.payment_status,
      createdAt: o.created_at,
      productTitle:
        (o.products as unknown as { title: string } | null)?.title ?? "—",
      customerEmail:
        (o.customers as unknown as { email: string } | null)?.email ?? "—",
    })),
  };
}

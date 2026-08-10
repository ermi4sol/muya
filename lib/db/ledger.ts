import { supabaseAdmin } from "@/lib/db/client";
import { writeAuditLog } from "@/lib/db/identity";
import { sendEmail, brandedEmail } from "@/lib/email/send";

export interface LedgerEntry {
  id: string;
  entry_type: string;
  amount: number;
  balance_after: number;
  created_at: string;
  productTitle: string | null;
}

export async function getLedgerSummary(creatorId: string) {
  const db = supabaseAdmin();
  const [{ data: entries }, { data: pendingPayouts }] = await Promise.all([
    db
      .from("creator_ledger_entries")
      .select("id, entry_type, amount, balance_after, created_at, orders(products(title))")
      .eq("creator_id", creatorId)
      .order("created_at", { ascending: false })
      .limit(100),
    db
      .from("payout_requests")
      .select("id, amount, status, payout_method, requested_at")
      .eq("creator_id", creatorId)
      .in("status", ["pending", "processing"])
      .order("requested_at", { ascending: false }),
  ]);

  const ledgerBalance = Number(entries?.[0]?.balance_after ?? 0);
  const held = (pendingPayouts ?? []).reduce((a, p) => a + Number(p.amount), 0);

  return {
    ledgerBalance,
    held,
    available: Math.max(0, Math.round((ledgerBalance - held) * 100) / 100),
    pendingPayouts: pendingPayouts ?? [],
    entries: (entries ?? []).map((e) => ({
      id: e.id,
      entry_type: e.entry_type,
      amount: Number(e.amount),
      balance_after: Number(e.balance_after),
      created_at: e.created_at,
      productTitle:
        (e.orders as unknown as { products: { title: string } | null } | null)
          ?.products?.title ?? null,
    })) as LedgerEntry[],
  };
}

export async function createPayoutRequest(
  creatorId: string,
  p: {
    amount: number;
    method: "bank" | "telebirr";
    details: Record<string, string>;
  }
): Promise<{ ok: boolean; error?: string }> {
  const summary = await getLedgerSummary(creatorId);
  if (p.amount <= 0 || p.amount > summary.available) {
    return { ok: false, error: "insufficient" };
  }
  const { error } = await supabaseAdmin().from("payout_requests").insert({
    creator_id: creatorId,
    amount: p.amount,
    payout_method: p.method,
    payout_details: p.details,
  });
  if (error) return { ok: false, error: "failed" };
  return { ok: true };
}

/** Refund a paid order: reverses the ledger credit and revokes access. */
export async function refundOrder(
  orderId: string,
  adminId: string
): Promise<{ ok: boolean; error?: string }> {
  const db = supabaseAdmin();
  const { data: claimed } = await db
    .from("orders")
    .update({ payment_status: "refunded" })
    .eq("id", orderId)
    .eq("payment_status", "paid")
    .select("id, creator_id, creator_net_amount, currency, customer_id, products(title), customers(email)");
  if (!claimed || claimed.length === 0) {
    return { ok: false, error: "not_paid" };
  }
  const order = claimed[0];
  const net = Number(order.creator_net_amount ?? 0);

  if (net > 0) {
    const { data: last } = await db
      .from("creator_ledger_entries")
      .select("balance_after")
      .eq("creator_id", order.creator_id)
      .order("created_at", { ascending: false })
      .limit(1);
    const prev = Number(last?.[0]?.balance_after ?? 0);
    await db.from("creator_ledger_entries").insert({
      creator_id: order.creator_id,
      order_id: orderId,
      entry_type: "refund",
      amount: -net,
      balance_after: Math.round((prev - net) * 100) / 100,
    });
  }
  await db
    .from("entitlements")
    .update({ status: "canceled", revoked_at: new Date().toISOString() })
    .eq("order_id", orderId);

  await writeAuditLog({
    admin_user_id: adminId,
    action: "refund_order",
    target_type: "order",
    target_id: orderId,
  });

  const customer = order.customers as unknown as { email: string } | null;
  const product = order.products as unknown as { title: string } | null;
  if (customer) {
    await sendEmail({
      to: customer.email,
      subject: `Refund processed — ${product?.title ?? "your order"}`,
      html: brandedEmail(
        `<p>Your order <strong>${product?.title ?? ""}</strong> was refunded. The MUYA team will arrange the repayment with you directly. Access to the product has been closed.</p>`
      ),
    });
  }
  return { ok: true };
}

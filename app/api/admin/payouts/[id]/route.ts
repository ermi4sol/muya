import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession, requireAdminRole } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/db/client";
import { writeAuditLog } from "@/lib/db/identity";
import { sendEmail, brandedEmail } from "@/lib/email/send";

const Body = z.object({
  action: z.enum(["processing", "paid", "reject"]),
  reason: z.string().max(300).optional(),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!requireAdminRole(session, ["finance"])) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const db = supabaseAdmin();
  const { data: payout } = await db
    .from("payout_requests")
    .select("id, creator_id, amount, status, payout_method, creators(email, display_name, currency)")
    .eq("id", id)
    .maybeSingle();
  if (!payout) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const creator = payout.creators as unknown as {
    email: string; display_name: string | null; currency: string;
  } | null;
  const action = parsed.data.action;

  if (action === "processing") {
    if (payout.status !== "pending") {
      return NextResponse.json({ error: "bad_state" }, { status: 409 });
    }
    await db
      .from("payout_requests")
      .update({ status: "processing", processed_by: session!.sub })
      .eq("id", id);
  } else if (action === "paid") {
    if (!["pending", "processing"].includes(payout.status)) {
      return NextResponse.json({ error: "bad_state" }, { status: 409 });
    }
    // Atomic claim so the ledger debit can never double-write
    const { data: claimed } = await db
      .from("payout_requests")
      .update({
        status: "paid",
        processed_by: session!.sub,
        processed_at: new Date().toISOString(),
      })
      .eq("id", id)
      .in("status", ["pending", "processing"])
      .select("id");
    if (!claimed || claimed.length === 0) {
      return NextResponse.json({ error: "bad_state" }, { status: 409 });
    }
    const { data: last } = await db
      .from("creator_ledger_entries")
      .select("balance_after")
      .eq("creator_id", payout.creator_id)
      .order("created_at", { ascending: false })
      .limit(1);
    const prev = Number(last?.[0]?.balance_after ?? 0);
    const amount = Number(payout.amount);
    await db.from("creator_ledger_entries").insert({
      creator_id: payout.creator_id,
      payout_request_id: id,
      entry_type: "payout",
      amount: -amount,
      balance_after: Math.round((prev - amount) * 100) / 100,
    });
    if (creator) {
      await sendEmail({
        to: creator.email,
        subject: `✅ Payout sent — ${amount.toLocaleString()} ${creator.currency}`,
        html: brandedEmail(
          `<p>Your payout of <strong>${amount.toLocaleString()} ${creator.currency}</strong> (${payout.payout_method}) has been sent. It may take a little time to arrive depending on your bank/telebirr.</p>`
        ),
      });
    }
  } else {
    if (!["pending", "processing"].includes(payout.status)) {
      return NextResponse.json({ error: "bad_state" }, { status: 409 });
    }
    await db
      .from("payout_requests")
      .update({
        status: "rejected",
        processed_by: session!.sub,
        processed_at: new Date().toISOString(),
        rejection_reason: parsed.data.reason ?? null,
      })
      .eq("id", id);
    if (creator) {
      await sendEmail({
        to: creator.email,
        subject: "About your payout request",
        html: brandedEmail(
          `<p>Your payout request of ${Number(payout.amount).toLocaleString()} ${creator.currency} was rejected.${parsed.data.reason ? ` Reason: "${parsed.data.reason}".` : ""} The amount stays in your MUYA balance — you can request again anytime.</p>`
        ),
      });
    }
  }

  await writeAuditLog({
    admin_user_id: session!.sub,
    action: `payout_${action}`,
    target_type: "payout_request",
    target_id: id,
    notes: parsed.data.reason,
  });
  return NextResponse.json({ ok: true });
}

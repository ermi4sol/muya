import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserSession } from "@/lib/auth/session";
import { createPayoutRequest } from "@/lib/db/ledger";
import { sendAdminAlert } from "@/lib/email/orders";

const Body = z.object({
  amount: z.number().positive().max(100000000),
  method: z.enum(["bank", "telebirr"]),
  details: z.object({
    account_name: z.string().min(1).max(80),
    account_number: z.string().min(4).max(40),
    bank_name: z.string().max(80).optional(),
  }),
});

export async function POST(req: Request) {
  const session = await getUserSession();
  if (!session || session.role !== "creator") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const result = await createPayoutRequest(session.sub, parsed.data);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }
  // Alert the admin (MUYA pays out manually, then marks paid in the panel)
  await sendAdminAlert({
    subject: `💸 Payout request — ${parsed.data.amount.toLocaleString()} ETB (${parsed.data.method})`,
    html: `<p><strong>New payout request</strong></p>
       <p>Creator: ${session.telegramId ? `Telegram ${session.telegramId}` : session.sub}<br/>Amount: ${parsed.data.amount.toLocaleString()} ETB<br/>Method: ${parsed.data.method}<br/>Account: ${parsed.data.details.account_name} · ${parsed.data.details.account_number}${parsed.data.details.bank_name ? ` · ${parsed.data.details.bank_name}` : ""}</p>`,
    ctaPath: "/admin/payouts",
    ctaLabel: "Open the payout queue",
  });
  return NextResponse.json({ ok: true });
}

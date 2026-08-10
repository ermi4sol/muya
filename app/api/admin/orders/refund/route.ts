import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession, requireAdminRole } from "@/lib/auth/session";
import { refundOrder } from "@/lib/db/ledger";

const Body = z.object({ orderId: z.string().uuid() });

export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!requireAdminRole(session, ["finance"])) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const result = await refundOrder(parsed.data.orderId, session!.sub);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
}

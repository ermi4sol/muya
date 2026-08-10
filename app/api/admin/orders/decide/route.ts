import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession, requireAdminRole } from "@/lib/auth/session";
import { approveOrder, rejectOrder } from "@/lib/fulfillment";

const Body = z.object({
  orderId: z.string().uuid(),
  action: z.enum(["approve", "reject"]),
  reason: z.string().max(300).optional(),
});

export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!requireAdminRole(session, ["finance"])) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const { orderId, action, reason } = parsed.data;

  try {
    const result =
      action === "approve"
        ? await approveOrder(orderId, session!.sub)
        : await rejectOrder(orderId, session!.sub, reason);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 409 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("decide failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

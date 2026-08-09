import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/client";

/** Public order-status poll — the order UUID is the capability. Status only. */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/.test(id)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const { data } = await supabaseAdmin()
    .from("orders")
    .select("payment_status, rejection_reason")
    .eq("id", id)
    .maybeSingle();
  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({
    status: data.payment_status,
    reason: data.rejection_reason,
  });
}

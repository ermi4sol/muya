import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/client";
import { verifyAccess } from "@/lib/fulfillment";

/** Entitlement-checked download: redirects to a 10-minute signed URL. */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/.test(orderId)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const order = await verifyAccess(orderId);
  if (!order) {
    return NextResponse.json({ error: "no_access" }, { status: 403 });
  }
  const file = (order.products.config?.file ?? null) as {
    path?: string;
    name?: string;
  } | null;
  if (!file?.path) {
    return NextResponse.json({ error: "no_file" }, { status: 404 });
  }
  const { data, error } = await supabaseAdmin()
    .storage.from("product-files")
    .createSignedUrl(file.path, 600, { download: file.name ?? true });
  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: "sign_failed" }, { status: 502 });
  }
  return NextResponse.redirect(data.signedUrl);
}

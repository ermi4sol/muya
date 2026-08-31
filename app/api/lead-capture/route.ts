import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/db/client";
import { rateLimit, clientIp } from "@/lib/auth/rate-limit";

const Body = z.object({
  productId: z.string().uuid(),
  name: z.string().max(80).optional(),
  email: z.string().email(),
});

/**
 * Email-mode lead magnets: capture the contact into lead_captures and hand
 * back an instant download link (10-minute signed URL). No account, no
 * Telegram, no order — this is a marketing capture, not a purchase.
 */
export async function POST(req: Request) {
  const ipOk = await rateLimit(`lead:ip:${clientIp(req)}`, 20, 60 * 60);
  if (!ipOk) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const b = parsed.data;

  const db = supabaseAdmin();
  const { data: product } = await db
    .from("products")
    .select("id, creator_id, type, title, status, config, creators(status)")
    .eq("id", b.productId)
    .maybeSingle();
  const creatorStatus = (product?.creators as unknown as { status: string } | null)
    ?.status;
  if (
    !product ||
    product.type !== "lead_magnet" ||
    product.status !== "active" ||
    creatorStatus !== "active"
  ) {
    return NextResponse.json({ error: "not_available" }, { status: 404 });
  }
  const config = (product.config ?? {}) as Record<string, unknown>;
  if ((config.capture_method ?? "telegram") !== "email") {
    return NextResponse.json({ error: "telegram_required" }, { status: 400 });
  }

  await db.from("lead_captures").insert({
    creator_id: product.creator_id,
    product_id: product.id,
    captured_email: b.email.toLowerCase(),
  });

  // Instant fulfillment: a signed download link right on the page
  const file = (config.file ?? null) as { path?: string; name?: string } | null;
  let downloadUrl: string | null = null;
  if (file?.path) {
    const { data } = await db.storage
      .from("product-files")
      .createSignedUrl(file.path, 600, { download: file.name ?? true });
    downloadUrl = data?.signedUrl ?? null;
  }

  return NextResponse.json({ ok: true, downloadUrl });
}

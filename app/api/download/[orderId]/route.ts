import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/client";
import { verifyAccess } from "@/lib/fulfillment";

type LessonFile = { path?: string; name?: string };

/**
 * Entitlement-checked download: redirects to a 10-minute signed URL.
 * - default: the product's main file (digital products / lead magnets)
 * - ?lesson=<module>-<lesson>: a course lesson's attachment
 */
export async function GET(
  req: Request,
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

  const lessonParam = new URL(req.url).searchParams.get("lesson");
  let file: LessonFile | null = null;

  if (lessonParam) {
    // Course lesson attachment — resolved strictly from THIS product's config
    const m = lessonParam.match(/^(\d{1,3})-(\d{1,3})$/);
    if (!m || order.products.type !== "course") {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    const modules =
      ((order.products.config?.modules ?? []) as {
        lessons?: { attachment?: LessonFile | null }[];
      }[]) ?? [];
    file = modules[Number(m[1])]?.lessons?.[Number(m[2])]?.attachment ?? null;
  } else {
    file = (order.products.config?.file ?? null) as LessonFile | null;
  }

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

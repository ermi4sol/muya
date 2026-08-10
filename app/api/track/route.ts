import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/db/client";
import { rateLimit, clientIp } from "@/lib/auth/rate-limit";

const Body = z.object({
  slug: z.string().min(1).max(40),
  path: z.string().max(120).optional(),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: true });

  // Best-effort dedupe: one count per IP+slug per 30 min
  const allowed = await rateLimit(
    `visit:${clientIp(req)}:${parsed.data.slug}`,
    1,
    30 * 60
  );
  if (!allowed) return NextResponse.json({ ok: true });

  const db = supabaseAdmin();
  const { data: creator } = await db
    .from("creators")
    .select("id")
    .eq("store_slug", parsed.data.slug)
    .maybeSingle();
  if (creator) {
    await db.from("store_visits").insert({
      creator_id: creator.id,
      path: parsed.data.path ?? "/",
    });
  }
  return NextResponse.json({ ok: true });
}

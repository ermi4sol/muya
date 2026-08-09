import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/db/client";
import { getCreator } from "@/lib/db/creator";

const Body = z.object({
  display_name: z.string().min(1).max(60).optional(),
  bio: z.string().max(300).optional(),
  store_slug: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/)
    .optional(),
  social_links: z.record(z.string(), z.string().max(200)).optional(),
  theme: z.object({ preset: z.string().max(30) }).optional(),
  preferred_locale: z.enum(["en", "am", "om", "ti", "so"]).optional(),
  profile_image_url: z.string().url().max(500).optional(),
});

export async function GET() {
  const session = await getUserSession();
  if (!session || session.role !== "creator") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const creator = await getCreator(session.sub);
  if (!creator) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ creator });
}

export async function PATCH(req: Request) {
  const session = await getUserSession();
  if (!session || session.role !== "creator") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const fields = parsed.data;
  if (fields.store_slug) {
    const { data: taken } = await supabaseAdmin()
      .from("creators")
      .select("id")
      .eq("store_slug", fields.store_slug)
      .neq("id", session.sub)
      .maybeSingle();
    if (taken) {
      return NextResponse.json({ error: "slug_taken" }, { status: 409 });
    }
  }

  const { error } = await supabaseAdmin()
    .from("creators")
    .update(fields)
    .eq("id", session.sub);
  if (error) {
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }
  const creator = await getCreator(session.sub);
  return NextResponse.json({ creator });
}

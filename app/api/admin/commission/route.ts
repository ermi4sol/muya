import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession, requireAdminRole } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/db/client";
import { writeAuditLog } from "@/lib/db/identity";
import { PRODUCT_TYPES } from "@/lib/product-types";

const Body = z.object({
  commission_percent: z.number().min(0).max(100).optional(),
  exclusions: z.record(z.enum(PRODUCT_TYPES), z.boolean()).optional(),
});

/** Commission management (UI page 43): rate + per-type exclusion toggles. */
export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!requireAdminRole(session, ["finance"])) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const db = supabaseAdmin();

  if (parsed.data.commission_percent !== undefined) {
    const { data: existing } = await db
      .from("platform_settings")
      .select("id")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing) {
      await db
        .from("platform_settings")
        .update({
          commission_percent: parsed.data.commission_percent,
          updated_by: session!.sub,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      await db.from("platform_settings").insert({
        commission_percent: parsed.data.commission_percent,
        updated_by: session!.sub,
      });
    }
    await writeAuditLog({
      admin_user_id: session!.sub,
      action: "set_commission_rate",
      target_type: "platform_settings",
      notes: `${parsed.data.commission_percent}%`,
    });
  }

  if (parsed.data.exclusions) {
    for (const [type, excluded] of Object.entries(parsed.data.exclusions)) {
      await db.from("commission_type_exclusions").upsert({
        product_type: type,
        is_excluded: excluded,
        updated_by: session!.sub,
        updated_at: new Date().toISOString(),
      });
    }
    await writeAuditLog({
      admin_user_id: session!.sub,
      action: "set_commission_exclusions",
      target_type: "commission_type_exclusions",
      notes: JSON.stringify(parsed.data.exclusions),
    });
  }

  return NextResponse.json({ ok: true });
}

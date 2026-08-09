import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyStageToken, verifyTotp } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/db/client";
import {
  signSession,
  cookieName,
  sessionCookieOptions,
  type AdminRole,
} from "@/lib/auth/session";
import { rateLimit } from "@/lib/auth/rate-limit";

const Body = z.object({
  stageToken: z.string().min(10),
  code: z.string().min(6).max(8),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const adminId = await verifyStageToken(parsed.data.stageToken, "mfa_login");
  if (!adminId) {
    return NextResponse.json({ error: "invalid_or_expired" }, { status: 400 });
  }

  const codeOk = await rateLimit(`adminmfa:${adminId}`, 8, 15 * 60);
  if (!codeOk) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const { data: admin } = await supabaseAdmin()
    .from("admin_users")
    .select("id, email, role, totp_secret, mfa_enabled")
    .eq("id", adminId)
    .maybeSingle();
  if (!admin?.totp_secret || !admin.mfa_enabled) {
    return NextResponse.json({ error: "setup_required" }, { status: 403 });
  }
  if (!verifyTotp(admin.totp_secret, parsed.data.code)) {
    return NextResponse.json({ error: "invalid_code" }, { status: 401 });
  }

  const jwt = await signSession({
    sub: admin.id,
    role: "admin",
    email: admin.email,
    adminRole: admin.role as AdminRole,
  });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(cookieName("admin"), jwt, sessionCookieOptions("admin"));
  return res;
}

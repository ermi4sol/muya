import { NextResponse } from "next/server";
import { z } from "zod";
import { findAdminByEmail } from "@/lib/db/identity";
import { verifyPassword, signStageToken } from "@/lib/auth/admin";
import { rateLimit, clientIp } from "@/lib/auth/rate-limit";

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(200),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const ip = clientIp(req);
  const [ipOk, emailOk] = await Promise.all([
    rateLimit(`adminlogin:ip:${ip}`, 10, 15 * 60),
    rateLimit(`adminlogin:email:${parsed.data.email.toLowerCase()}`, 5, 15 * 60),
  ]);
  if (!ipOk || !emailOk) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const admin = await findAdminByEmail(parsed.data.email);
  // Constant-shape response for wrong email vs wrong password
  if (!admin?.password_hash) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }
  const ok = await verifyPassword(parsed.data.password, admin.password_hash);
  if (!ok) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }
  if (!admin.mfa_enabled || !admin.totp_secret) {
    return NextResponse.json({ error: "setup_required" }, { status: 403 });
  }

  const stageToken = await signStageToken(admin.id, "mfa_login");
  return NextResponse.json({ mfaRequired: true, stageToken });
}

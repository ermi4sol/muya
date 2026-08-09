import { NextResponse } from "next/server";
import { z } from "zod";
import QRCode from "qrcode";
import {
  consumeAdminSetupToken,
  hashPassword,
  generateTotpSecret,
  totpUri,
  verifyTotp,
  signStageToken,
  verifyStageToken,
} from "@/lib/auth/admin";
import { updateAdmin, findAdminByEmail, writeAuditLog } from "@/lib/db/identity";
import { supabaseAdmin } from "@/lib/db/client";

const StartBody = z.object({
  token: z.string().min(10),
  password: z.string().min(10).max(200),
});

/** Step 1: consume setup token, store password, return TOTP QR + stage token. */
export async function POST(req: Request) {
  const parsed = StartBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_request", detail: "Password must be at least 10 characters." },
      { status: 400 }
    );
  }

  const consumed = await consumeAdminSetupToken(parsed.data.token);
  if (!consumed) {
    return NextResponse.json({ error: "invalid_or_expired" }, { status: 400 });
  }

  const secret = generateTotpSecret();
  await updateAdmin(consumed.adminId, {
    password_hash: await hashPassword(parsed.data.password),
    totp_secret: secret,
    mfa_enabled: false, // enabled after the code is confirmed
  });

  const uri = totpUri(secret, consumed.email);
  const qrDataUrl = await QRCode.toDataURL(uri, { width: 240, margin: 1 });
  const stageToken = await signStageToken(consumed.adminId, "mfa_setup");

  return NextResponse.json({ qrDataUrl, manualCode: secret, stageToken });
}

const ConfirmBody = z.object({
  stageToken: z.string().min(10),
  code: z.string().min(6).max(8),
});

/** Step 2: confirm the first TOTP code — activates MFA. */
export async function PUT(req: Request) {
  const parsed = ConfirmBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const adminId = await verifyStageToken(parsed.data.stageToken, "mfa_setup");
  if (!adminId) {
    return NextResponse.json({ error: "invalid_or_expired" }, { status: 400 });
  }

  const { data: admin } = await supabaseAdmin()
    .from("admin_users")
    .select("id, email, totp_secret")
    .eq("id", adminId)
    .maybeSingle();
  if (!admin?.totp_secret) {
    return NextResponse.json({ error: "setup_not_started" }, { status: 400 });
  }
  if (!verifyTotp(admin.totp_secret, parsed.data.code)) {
    return NextResponse.json({ error: "invalid_code" }, { status: 400 });
  }

  await updateAdmin(adminId, { mfa_enabled: true });
  await writeAuditLog({
    admin_user_id: adminId,
    action: "admin_mfa_enrolled",
    target_type: "admin_user",
    target_id: adminId,
  });
  const check = await findAdminByEmail(admin.email);
  return NextResponse.json({ ok: true, mfaEnabled: check?.mfa_enabled === true });
}

import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import * as OTPAuth from "otpauth";
import { createHash, randomBytes } from "crypto";
import { supabaseAdmin } from "@/lib/db/client";
import { env } from "@/lib/env";

// ---------- password ----------

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ---------- TOTP ----------

export function generateTotpSecret(): string {
  return new OTPAuth.Secret({ size: 20 }).base32;
}

export function totpUri(secret: string, accountEmail: string): string {
  return new OTPAuth.TOTP({
    issuer: "MUYA Admin",
    label: accountEmail,
    secret: OTPAuth.Secret.fromBase32(secret),
    digits: 6,
    period: 30,
  }).toString();
}

export function verifyTotp(secret: string, code: string): boolean {
  const totp = new OTPAuth.TOTP({
    secret: OTPAuth.Secret.fromBase32(secret),
    digits: 6,
    period: 30,
  });
  return totp.validate({ token: code.trim(), window: 1 }) !== null;
}

// ---------- short-lived stage tokens (between password and MFA steps) ----------

function secretKey(): Uint8Array {
  return new TextEncoder().encode(env.sessionSecret());
}

export async function signStageToken(
  adminId: string,
  purpose: "mfa_login" | "mfa_setup"
): Promise<string> {
  return new SignJWT({ purpose })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(adminId)
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(secretKey());
}

export async function verifyStageToken(
  token: string,
  purpose: "mfa_login" | "mfa_setup"
): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (payload.purpose !== purpose || !payload.sub) return null;
    return payload.sub;
  } catch {
    return null;
  }
}

// ---------- admin setup links ----------

export async function issueAdminSetupLink(adminId: string, email: string) {
  const raw = randomBytes(32).toString("base64url");
  const { error } = await supabaseAdmin().from("magic_link_tokens").insert({
    owner_type: "admin",
    owner_id: adminId,
    email: email.toLowerCase(),
    token_hash: createHash("sha256").update(raw).digest("hex"),
    expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  });
  if (error) throw new Error(`setup link insert failed: ${error.message}`);
  return raw;
}

export async function consumeAdminSetupToken(
  raw: string
): Promise<{ adminId: string; email: string } | null> {
  const db = supabaseAdmin();
  const hash = createHash("sha256").update(raw).digest("hex");
  const { data: row } = await db
    .from("magic_link_tokens")
    .select("id, owner_id, email, expires_at, used_at, owner_type")
    .eq("token_hash", hash)
    .maybeSingle();
  if (
    !row ||
    row.owner_type !== "admin" ||
    row.used_at ||
    !row.owner_id ||
    new Date(row.expires_at) < new Date()
  ) {
    return null;
  }
  const { data: claimed } = await db
    .from("magic_link_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("id", row.id)
    .is("used_at", null)
    .select("id");
  if (!claimed || claimed.length === 0) return null;
  return { adminId: row.owner_id, email: row.email ?? "" };
}

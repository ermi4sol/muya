import { createHash, randomBytes } from "crypto";
import { supabaseAdmin } from "@/lib/db/client";

const TOKEN_TTL_MINUTES = 30;

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/** Create a magic-link token; returns the RAW token (only ever emailed, never stored). */
export async function issueMagicLink(params: {
  ownerType: "customer" | "creator";
  ownerId: string | null;
  email: string;
  redirectTo?: string;
}): Promise<string> {
  const raw = randomBytes(32).toString("base64url");
  const db = supabaseAdmin();
  const { error } = await db.from("magic_link_tokens").insert({
    owner_type: params.ownerType,
    owner_id: params.ownerId,
    email: params.email.toLowerCase(),
    token_hash: hashToken(raw),
    redirect_to: params.redirectTo ?? null,
    expires_at: new Date(
      Date.now() + TOKEN_TTL_MINUTES * 60 * 1000
    ).toISOString(),
  });
  if (error) throw new Error(`magic link insert failed: ${error.message}`);
  return raw;
}

export interface ConsumedToken {
  ownerType: "customer" | "creator";
  ownerId: string | null;
  email: string;
  redirectTo: string | null;
}

/** Verify + single-use consume. Returns null when invalid, expired, or reused. */
export async function consumeMagicLink(
  raw: string
): Promise<ConsumedToken | null> {
  const db = supabaseAdmin();
  const { data: row } = await db
    .from("magic_link_tokens")
    .select("id, owner_type, owner_id, email, redirect_to, expires_at, used_at")
    .eq("token_hash", hashToken(raw))
    .maybeSingle();

  if (!row || row.used_at || new Date(row.expires_at) < new Date()) return null;

  // Atomic single-use claim: only succeeds if used_at is still null
  const { data: claimed } = await db
    .from("magic_link_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("id", row.id)
    .is("used_at", null)
    .select("id");
  if (!claimed || claimed.length === 0) return null;

  return {
    ownerType: row.owner_type,
    ownerId: row.owner_id,
    email: row.email,
    redirectTo: row.redirect_to,
  };
}

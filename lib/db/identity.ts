import { supabaseAdmin } from "@/lib/db/client";

export interface CreatorRow {
  id: string;
  email: string;
  store_slug: string;
  display_name: string | null;
  status: string;
  preferred_locale: string;
}

export interface AdminRow {
  id: string;
  email: string;
  role: "superadmin" | "finance" | "support" | "trust_safety";
  password_hash: string | null;
  totp_secret: string | null;
  mfa_enabled: boolean;
}

export async function findCreatorByEmail(
  email: string
): Promise<CreatorRow | null> {
  const { data } = await supabaseAdmin()
    .from("creators")
    .select("id, email, store_slug, display_name, status, preferred_locale")
    .eq("email", email.toLowerCase())
    .maybeSingle();
  return data;
}

const RESERVED_SLUGS = new Set([
  "admin", "api", "dashboard", "signin", "signup", "restore", "account",
  "order", "terms", "support", "en", "am", "om", "ti", "so", "muya",
]);

function slugify(base: string): string {
  const cleaned = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);
  if (!cleaned || RESERVED_SLUGS.has(cleaned)) return `${cleaned || "store"}-shop`;
  return cleaned;
}

/** Create a creator (+ free subscription) on first verified magic link. */
export async function createCreator(email: string): Promise<CreatorRow> {
  const db = supabaseAdmin();
  const base = slugify(email.split("@")[0]);

  for (let attempt = 0; attempt < 5; attempt++) {
    const slug =
      attempt === 0
        ? base
        : `${base}-${Math.random().toString(36).slice(2, 6)}`;
    const { data, error } = await db
      .from("creators")
      .insert({ email: email.toLowerCase(), store_slug: slug })
      .select("id, email, store_slug, display_name, status, preferred_locale")
      .single();
    if (!error && data) {
      await db
        .from("creator_subscriptions")
        .insert({ creator_id: data.id, tier: "free" });
      return data;
    }
    // Unique violation on email means a concurrent signup won — fetch it
    if (error?.code === "23505" && error.message.includes("email")) {
      const existing = await findCreatorByEmail(email);
      if (existing) return existing;
    }
    // Otherwise assume slug collision and retry with a suffix
  }
  throw new Error("could not allocate store slug");
}

export async function findOrCreateCustomer(
  email: string
): Promise<{ id: string; email: string }> {
  const db = supabaseAdmin();
  const lower = email.toLowerCase();
  const { data: existing } = await db
    .from("customers")
    .select("id, email")
    .eq("email", lower)
    .maybeSingle();
  if (existing) return existing;
  const { data, error } = await db
    .from("customers")
    .insert({ email: lower })
    .select("id, email")
    .single();
  if (error) {
    const { data: retry } = await db
      .from("customers")
      .select("id, email")
      .eq("email", lower)
      .maybeSingle();
    if (retry) return retry;
    throw new Error(`customer create failed: ${error.message}`);
  }
  return data;
}

export async function findAdminByEmail(
  email: string
): Promise<AdminRow | null> {
  const { data } = await supabaseAdmin()
    .from("admin_users")
    .select("id, email, role, password_hash, totp_secret, mfa_enabled")
    .eq("email", email.toLowerCase())
    .maybeSingle();
  return data;
}

export async function updateAdmin(
  id: string,
  fields: Partial<Pick<AdminRow, "password_hash" | "totp_secret" | "mfa_enabled">>
): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("admin_users")
    .update(fields)
    .eq("id", id);
  if (error) throw new Error(`admin update failed: ${error.message}`);
}

export async function writeAuditLog(entry: {
  admin_user_id: string;
  action: string;
  target_type?: string;
  target_id?: string;
  notes?: string;
}): Promise<void> {
  await supabaseAdmin().from("admin_audit_log").insert(entry);
}

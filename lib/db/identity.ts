import { supabaseAdmin } from "@/lib/db/client";

/** v2 — identity lives in Better Auth + Telegram; this module keeps the
 * admin audit log and small admin lookups. */

export interface AdminRow {
  id: string;
  email: string;
  role: "superadmin" | "finance" | "support" | "trust_safety";
  telegram_user_id: string | null;
  auth_user_id: string | null;
  mfa_enabled: boolean;
}

export async function findAdminByEmail(email: string): Promise<AdminRow | null> {
  const { data } = await supabaseAdmin()
    .from("admin_users")
    .select("id, email, role, telegram_user_id, auth_user_id, mfa_enabled")
    .eq("email", email.toLowerCase())
    .maybeSingle();
  return data as AdminRow | null;
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

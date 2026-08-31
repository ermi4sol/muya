/**
 * v2 session layer — same interface as v1 (getUserSession / getAdminSession /
 * requireAdminRole) so existing pages keep working, now backed by Better Auth.
 *
 * Identity model:
 * - Creators + customers sign in with Telegram (Better Auth user has telegramId).
 * - The single admin signs in with email + password + TOTP (no telegramId).
 * - Session.sub stays the DOMAIN id (creators.id / customers.id / admin_users.id),
 *   exactly like v1, so all existing queries keep working.
 */
import { headers } from "next/headers";
import { auth } from "./auth";
import { supabaseAdmin } from "@/lib/db/client";

export type SessionRole = "creator" | "customer" | "admin";
export type AdminRole = "superadmin" | "finance" | "support" | "trust_safety";

export interface Session {
  sub: string; // owner id (creators.id / customers.id / admin_users.id)
  role: SessionRole;
  email: string;
  adminRole?: AdminRole;
  /** Telegram numeric user id as string (creators/customers only). */
  telegramId?: string;
  /** customers.id for this person, when one exists (creators can buy too). */
  customerId?: string;
}

type BetterAuthUser = {
  id: string;
  email: string;
  telegramId?: string | null;
  telegramUsername?: string | null;
};

async function getBetterAuthSession() {
  try {
    return await auth.api.getSession({ headers: await headers() });
  } catch {
    return null;
  }
}

/** Read the current creator/customer session (server-side). */
export async function getUserSession(): Promise<Session | null> {
  const s = await getBetterAuthSession();
  if (!s) return null;
  const user = s.user as unknown as BetterAuthUser;
  const telegramId = user.telegramId ?? undefined;
  if (!telegramId) return null; // an admin (or unknown) session is not a user session

  const db = supabaseAdmin();
  const [{ data: creator }, { data: customer }] = await Promise.all([
    db
      .from("creators")
      .select("id, status")
      .eq("telegram_user_id", telegramId)
      .maybeSingle(),
    db.from("customers").select("id").eq("telegram_user_id", telegramId).maybeSingle(),
  ]);

  if (creator && creator.status !== "suspended") {
    return {
      sub: creator.id,
      role: "creator",
      email: user.email,
      telegramId,
      customerId: customer?.id,
    };
  }
  if (customer) {
    return {
      sub: customer.id,
      role: "customer",
      email: user.email,
      telegramId,
      customerId: customer.id,
    };
  }
  return null;
}

/** Read the current admin session (server-side). */
export async function getAdminSession(): Promise<Session | null> {
  const s = await getBetterAuthSession();
  if (!s) return null;
  const user = s.user as unknown as BetterAuthUser;
  if (user.telegramId) return null; // Telegram users are never admins

  const { data: adminRow } = await supabaseAdmin()
    .from("admin_users")
    .select("id, role, email")
    .eq("email", user.email)
    .maybeSingle();
  if (!adminRow) return null;

  return {
    sub: adminRow.id,
    role: "admin",
    email: adminRow.email,
    adminRole: adminRow.role as AdminRole,
  };
}

export function requireAdminRole(
  session: Session | null,
  allowed: AdminRole[]
): boolean {
  if (!session || session.role !== "admin" || !session.adminRole) return false;
  if (session.adminRole === "superadmin") return true;
  return allowed.includes(session.adminRole);
}

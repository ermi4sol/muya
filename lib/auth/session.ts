import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

export type SessionRole = "creator" | "customer" | "admin";
export type AdminRole = "superadmin" | "finance" | "support" | "trust_safety";

export interface Session {
  sub: string; // owner id (creators.id / customers.id / admin_users.id)
  role: SessionRole;
  email: string;
  adminRole?: AdminRole;
}

const USER_COOKIE = "muya_session";
const ADMIN_COOKIE = "muya_admin";
const USER_MAX_AGE = 60 * 60 * 24 * 60; // 60 days
const ADMIN_MAX_AGE = 60 * 60 * 12; // 12 hours

function secret(): Uint8Array {
  return new TextEncoder().encode(env.sessionSecret());
}

export async function signSession(session: Session): Promise<string> {
  const maxAge = session.role === "admin" ? ADMIN_MAX_AGE : USER_MAX_AGE;
  return new SignJWT({
    role: session.role,
    email: session.email,
    ...(session.adminRole ? { adminRole: session.adminRole } : {}),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.sub)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + maxAge)
    .sign(secret());
}

export async function verifySessionToken(
  token: string
): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub || !payload.role) return null;
    return {
      sub: payload.sub,
      role: payload.role as SessionRole,
      email: (payload.email as string) ?? "",
      adminRole: payload.adminRole as AdminRole | undefined,
    };
  } catch {
    return null;
  }
}

export function cookieName(role: SessionRole): string {
  return role === "admin" ? ADMIN_COOKIE : USER_COOKIE;
}

export function sessionCookieOptions(role: SessionRole) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: role === "admin" ? ADMIN_MAX_AGE : USER_MAX_AGE,
  };
}

/** Read the current creator/customer session from cookies (server-side). */
export async function getUserSession(): Promise<Session | null> {
  const store = await cookies();
  const token = store.get(USER_COOKIE)?.value;
  if (!token) return null;
  const s = await verifySessionToken(token);
  return s && (s.role === "creator" || s.role === "customer") ? s : null;
}

/** Read the current admin session from cookies (server-side). */
export async function getAdminSession(): Promise<Session | null> {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  const s = await verifySessionToken(token);
  return s && s.role === "admin" ? s : null;
}

export function requireAdminRole(
  session: Session | null,
  allowed: AdminRole[]
): boolean {
  if (!session || session.role !== "admin" || !session.adminRole) return false;
  if (session.adminRole === "superadmin") return true;
  return allowed.includes(session.adminRole);
}

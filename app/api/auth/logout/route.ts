import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { env } from "@/lib/env";

export const runtime = "nodejs";

/**
 * Plain-form sign-out shim (kept from v1 so <form action=...> keeps working).
 * Revokes the Better Auth session, then redirects.
 */
export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const admin = searchParams.get("admin") === "1";
  try {
    await auth.api.signOut({ headers: await headers() });
  } catch {
    // no active session — nothing to revoke
  }
  return NextResponse.redirect(
    `${env.appUrl()}${admin ? "/admin/login" : "/"}`,
    { status: 303 }
  );
}

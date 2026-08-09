import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/client";

// Temporary Phase-3 diagnostic endpoint. Reports component status only —
// never values. Will be removed/locked in the security hardening phase.
export async function GET() {
  const requiredEnv = [
    "NEXT_PUBLIC_APP_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SESSION_SECRET",
    "CRON_SECRET",
    "RESEND_API_KEY",
    "EMAIL_FROM",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "GOOGLE_REDIRECT_URI",
    "ZOOM_ACCOUNT_ID",
    "ZOOM_CLIENT_ID",
    "ZOOM_CLIENT_SECRET",
  ];
  const missingEnv = requiredEnv.filter((k) => !process.env[k]);

  let db = "ok";
  try {
    const { error } = await supabaseAdmin()
      .from("rate_limits")
      .select("key")
      .limit(1);
    if (error) db = `error: ${error.message}`;
  } catch (e) {
    db = `throw: ${e instanceof Error ? e.message : String(e)}`;
  }

  let tokenInsert = "ok";
  try {
    const { error } = await supabaseAdmin().from("magic_link_tokens").insert({
      owner_type: "customer",
      owner_id: null,
      email: "health@check.local",
      token_hash: `health-${Math.random().toString(36).slice(2)}`,
      expires_at: new Date(Date.now() + 1000).toISOString(),
    });
    if (error) tokenInsert = `error: ${error.message}`;
  } catch (e) {
    tokenInsert = `throw: ${e instanceof Error ? e.message : String(e)}`;
  }

  return NextResponse.json({ missingEnv, db, tokenInsert });
}

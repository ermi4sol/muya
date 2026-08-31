import { NextResponse } from "next/server";
import { Pool } from "pg";
import { supabaseAdmin } from "@/lib/db/client";

export const runtime = "nodejs";

// v2 diagnostic endpoint. Reports component status only — never values.
// Locked down / removed in the R7 hardening pass.
export async function GET() {
  const requiredEnv = [
    "NEXT_PUBLIC_APP_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SESSION_SECRET",
    "CRON_SECRET",
    "DATABASE_URL",
    "TELEGRAM_BOT_TOKEN",
    "TELEGRAM_BOT_USERNAME",
    "TELEGRAM_WEBHOOK_SECRET",
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

  // Supabase REST reachability (service role)
  let supabase = "ok";
  try {
    const { error } = await supabaseAdmin()
      .from("rate_limits")
      .select("key")
      .limit(1);
    if (error) supabase = `error: ${error.message}`;
  } catch (e) {
    supabase = `throw: ${e instanceof Error ? e.message : String(e)}`;
  }

  // Direct Postgres via DATABASE_URL (what Better Auth uses)
  let postgres = "ok";
  if (process.env.DATABASE_URL) {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 1,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 8000,
    });
    try {
      const r = await pool.query('select count(*)::int as n from "user"');
      postgres = `ok (better-auth users: ${r.rows[0].n})`;
    } catch (e) {
      postgres = `error: ${e instanceof Error ? e.message : String(e)}`;
    } finally {
      await pool.end().catch(() => {});
    }
  } else {
    postgres = "skipped: DATABASE_URL not set";
  }

  return NextResponse.json({ missingEnv, supabase, postgres });
}

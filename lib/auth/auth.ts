import { betterAuth } from "better-auth";
import { twoFactor } from "better-auth/plugins/two-factor";
import { nextCookies } from "better-auth/next-js";
import { Pool } from "pg";
import { telegramAuth } from "./telegram-plugin";

/**
 * MUYA v2 identity layer (Better Auth).
 * - Creators + customers: "Continue with Telegram" (custom plugin, Login Widget HMAC).
 * - Admin: email + password + TOTP MFA (public sign-up disabled; bootstrapped once
 *   via /api/admin/bootstrap guarded by CRON_SECRET).
 * Better Auth talks to Postgres directly (Supabase pooler) via DATABASE_URL.
 */

let pool: Pool | null = null;
function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 2, // serverless: keep the per-instance footprint tiny
      ssl: { rejectUnauthorized: false },
    });
  }
  return pool;
}

export const auth = betterAuth({
  appName: "MUYA",
  baseURL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  secret: process.env.SESSION_SECRET,
  database: getPool(),
  telemetry: { enabled: false },
  emailAndPassword: {
    enabled: true,
    disableSignUp: true, // admin-only; no public email accounts in v2
  },
  session: {
    expiresIn: 60 * 60 * 24 * 60, // 60 days (matches v1 creator sessions)
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 60 * 5 },
  },
  advanced: {
    cookiePrefix: "muya",
  },
  user: {
    additionalFields: {
      telegramId: { type: "string", required: false, input: false },
      telegramUsername: { type: "string", required: false, input: false },
    },
  },
  plugins: [
    telegramAuth(),
    twoFactor({ issuer: "MUYA" }),
    nextCookies(), // must stay last
  ],
});

export type AuthSession = typeof auth.$Infer.Session;

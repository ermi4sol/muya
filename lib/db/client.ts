import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * Browser-safe client (anon key, RLS enforced).
 */
export function supabaseAnon(): SupabaseClient {
  return createClient(env.supabaseUrl(), env.supabaseAnonKey());
}

/**
 * Server-only admin client (service role, bypasses RLS).
 * Use ONLY inside server code paths that have already done their own
 * authorization checks (admin routes, webhook handlers, fulfillment).
 */
let adminClient: SupabaseClient | null = null;
export function supabaseAdmin(): SupabaseClient {
  if (!adminClient) {
    adminClient = createClient(
      env.supabaseUrl(),
      env.supabaseServiceRoleKey(),
      { auth: { persistSession: false } }
    );
  }
  return adminClient;
}

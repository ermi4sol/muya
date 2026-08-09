import { supabaseAdmin } from "@/lib/db/client";

/**
 * Fixed-window rate limiter backed by Postgres (shared across serverless
 * instances). Returns true when the call is ALLOWED.
 */
export async function rateLimit(
  key: string,
  maxInWindow: number,
  windowSeconds: number
): Promise<boolean> {
  const db = supabaseAdmin();
  const now = new Date();
  const { data: row } = await db
    .from("rate_limits")
    .select("count, window_start")
    .eq("key", key)
    .maybeSingle();

  if (
    !row ||
    now.getTime() - new Date(row.window_start).getTime() > windowSeconds * 1000
  ) {
    await db
      .from("rate_limits")
      .upsert({ key, count: 1, window_start: now.toISOString() });
    return true;
  }

  if (row.count >= maxInWindow) return false;

  await db
    .from("rate_limits")
    .update({ count: row.count + 1 })
    .eq("key", key);
  return true;
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd ? fwd.split(",")[0].trim() : "unknown";
}

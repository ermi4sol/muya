import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/client";
import { verifyOauthState, exchangeCode } from "@/lib/integrations/google";
import { env } from "@/lib/env";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const settings = `${env.appUrl()}/dashboard/settings`;

  if (!code || !state) {
    return NextResponse.redirect(`${settings}?google=error`);
  }
  const creatorId = await verifyOauthState(state);
  if (!creatorId) {
    return NextResponse.redirect(`${settings}?google=error`);
  }
  const tokens = await exchangeCode(code);
  if (!tokens) {
    return NextResponse.redirect(`${settings}?google=error`);
  }

  const db = supabaseAdmin();
  const { data: existing } = await db
    .from("creator_integrations")
    .select("id, refresh_token")
    .eq("creator_id", creatorId)
    .eq("provider", "google_calendar")
    .maybeSingle();

  const record = {
    access_token: tokens.access_token,
    // Google only returns refresh_token on first consent — keep the old one
    refresh_token: tokens.refresh_token ?? existing?.refresh_token ?? null,
    token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
  };
  if (existing) {
    await db.from("creator_integrations").update(record).eq("id", existing.id);
  } else {
    await db.from("creator_integrations").insert({
      creator_id: creatorId,
      provider: "google_calendar",
      ...record,
    });
  }
  return NextResponse.redirect(`${settings}?google=connected`);
}

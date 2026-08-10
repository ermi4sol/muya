import { NextResponse } from "next/server";
import { getUserSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/db/client";

export async function POST() {
  const session = await getUserSession();
  if (!session || session.role !== "creator") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  await supabaseAdmin()
    .from("creator_integrations")
    .delete()
    .eq("creator_id", session.sub)
    .eq("provider", "google_calendar");
  return NextResponse.json({ ok: true });
}

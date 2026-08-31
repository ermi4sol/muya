import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/db/client";
import { sendTelegramMessage } from "@/lib/telegram/api";

const Body = z.object({
  telegram_user_id: z
    .string()
    .regex(/^\d{4,15}$/)
    .nullable(),
});

/** Links (or clears) the signed-in admin's Telegram ID for bot alerts. */
export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const { error } = await supabaseAdmin()
    .from("admin_users")
    .update({ telegram_user_id: parsed.data.telegram_user_id })
    .eq("id", session.sub);
  if (error) {
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }
  if (parsed.data.telegram_user_id) {
    try {
      await sendTelegramMessage(
        parsed.data.telegram_user_id,
        "✅ <b>MUYA admin alerts linked.</b> New orders, payout requests and new products will be reported here."
      );
    } catch {
      return NextResponse.json({
        ok: true,
        warning:
          "Saved, but the bot couldn't message this ID — send /start to @MuyaOfficialBot first.",
      });
    }
  }
  return NextResponse.json({ ok: true });
}

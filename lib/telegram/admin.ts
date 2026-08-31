import { supabaseAdmin } from "@/lib/db/client";
import { sendTelegramMessage } from "@/lib/telegram/api";

/**
 * Admin Telegram alerts (R7): sent to every admin_users row with a linked
 * telegram_user_id. Best-effort — failures never block the calling flow.
 */
export async function notifyAdminsTelegram(
  html: string,
  buttons?: { text: string; url: string }[][]
): Promise<void> {
  try {
    const { data: admins } = await supabaseAdmin()
      .from("admin_users")
      .select("telegram_user_id")
      .not("telegram_user_id", "is", null);
    await Promise.allSettled(
      (admins ?? [])
        .filter((a) => a.telegram_user_id)
        .map((a) => sendTelegramMessage(a.telegram_user_id!, html, { buttons }))
    );
  } catch (e) {
    console.error("admin telegram alert failed:", e);
  }
}

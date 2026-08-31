import { createHash, createHmac, timingSafeEqual } from "crypto";
import { env } from "@/lib/env";

/** Payload the Telegram Login Widget returns (also used for bot-side login handoff). */
export type TelegramAuthPayload = {
  id: number | string;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number | string;
  hash: string;
};

const MAX_AGE_SECONDS = 10 * 60; // widget payloads accepted for 10 minutes

/**
 * Verifies a Telegram Login Widget payload.
 * Spec: data_check_string = sorted "key=value" lines of every field except hash,
 * secret_key = SHA256(bot_token), signature = HMAC_SHA256(data_check_string, secret_key).
 */
export function verifyTelegramAuth(payload: TelegramAuthPayload): {
  ok: boolean;
  reason?: string;
} {
  if (!payload || typeof payload.hash !== "string" || !payload.id) {
    return { ok: false, reason: "malformed" };
  }
  const authDate = Number(payload.auth_date);
  if (!Number.isFinite(authDate)) return { ok: false, reason: "malformed" };
  if (Math.abs(Date.now() / 1000 - authDate) > MAX_AGE_SECONDS) {
    return { ok: false, reason: "expired" };
  }

  const entries = Object.entries(payload)
    .filter(([key, value]) => key !== "hash" && value !== undefined && value !== null)
    .map(([key, value]) => `${key}=${value}`)
    .sort();
  const dataCheckString = entries.join("\n");

  const secretKey = createHash("sha256").update(env.telegramBotToken()).digest();
  const expected = createHmac("sha256", secretKey).update(dataCheckString).digest();
  const provided = Buffer.from(payload.hash, "hex");

  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return { ok: false, reason: "bad_signature" };
  }
  return { ok: true };
}

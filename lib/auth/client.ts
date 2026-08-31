"use client";

import { createAuthClient } from "better-auth/react";
import { twoFactorClient } from "better-auth/client/plugins";
import type { TelegramAuthPayload } from "./telegram-verify";

export const authClient = createAuthClient({
  plugins: [twoFactorClient()],
});

/**
 * Completes "Continue with Telegram": posts the Login Widget payload to the
 * server-side plugin endpoint, which verifies the HMAC and sets the session.
 */
export async function signInWithTelegram(
  telegram: TelegramAuthPayload,
  intent: "creator" | "customer"
): Promise<{
  ok: boolean;
  error?: string;
  isNewCreator?: boolean;
  storeSlug?: string | null;
}> {
  const res = await fetch("/api/auth/sign-in/telegram", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ telegram, intent }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, error: data?.message ?? "Sign-in failed" };
  }
  return { ok: true, isNewCreator: data.isNewCreator, storeSlug: data.storeSlug };
}

/**
 * Central, typed access to environment variables.
 * Server-only secrets throw if read in the browser.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function serverOnly(name: string): string {
  if (typeof window !== "undefined") {
    throw new Error(`${name} must never be accessed from the browser`);
  }
  return required(name);
}

export const env = {
  appUrl: () =>
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  supabaseUrl: () => required("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: () => required("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  supabaseServiceRoleKey: () => serverOnly("SUPABASE_SERVICE_ROLE_KEY"),
  sessionSecret: () => serverOnly("SESSION_SECRET"),
  cronSecret: () => serverOnly("CRON_SECRET"),
  resendApiKey: () => serverOnly("RESEND_API_KEY"),
  emailFrom: () => process.env.EMAIL_FROM ?? "MUYA <onboarding@resend.dev>",
  googleClientId: () => serverOnly("GOOGLE_CLIENT_ID"),
  googleClientSecret: () => serverOnly("GOOGLE_CLIENT_SECRET"),
  googleRedirectUri: () => serverOnly("GOOGLE_REDIRECT_URI"),
  zoomAccountId: () => serverOnly("ZOOM_ACCOUNT_ID"),
  zoomClientId: () => serverOnly("ZOOM_CLIENT_ID"),
  zoomClientSecret: () => serverOnly("ZOOM_CLIENT_SECRET"),
  // ---- v2 (Telegram + Better Auth) ----
  telegramBotToken: () => serverOnly("TELEGRAM_BOT_TOKEN"),
  telegramBotUsername: () =>
    process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ??
    process.env.TELEGRAM_BOT_USERNAME ??
    "MuyaOfficialBot",
  telegramWebhookSecret: () => serverOnly("TELEGRAM_WEBHOOK_SECRET"),
  /** Direct Postgres connection (Supabase pooler) — required by Better Auth. */
  databaseUrl: () => serverOnly("DATABASE_URL"),
};

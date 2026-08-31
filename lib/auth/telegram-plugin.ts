import { z } from "zod";
import { createAuthEndpoint, APIError } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import type { BetterAuthPlugin } from "better-auth";
import { verifyTelegramAuth } from "./telegram-verify";
import { provisionTelegramIdentity } from "./provision";

/** Deterministic surrogate email for a Telegram identity (Better Auth requires an email). */
export function telegramSurrogateEmail(telegramId: string) {
  return `tg${telegramId}@telegram.mymuya.local`;
}

const bodySchema = z.object({
  /** Raw payload from the Telegram Login Widget (or bot handoff). */
  telegram: z.object({
    id: z.union([z.string(), z.number()]),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    username: z.string().optional(),
    photo_url: z.string().optional(),
    auth_date: z.union([z.string(), z.number()]),
    hash: z.string(),
  }),
  /** What the person is signing in as; provisions the matching domain row. */
  intent: z.enum(["creator", "customer"]).default("customer"),
});

/**
 * Better Auth plugin: "Continue with Telegram".
 * POST /api/auth/sign-in/telegram — verifies the Login Widget HMAC server-side,
 * finds-or-creates the Better Auth user keyed by a surrogate email derived from
 * the Telegram user id, provisions the creators/customers row, and sets the
 * session cookie.
 */
export const telegramAuth = () => {
  return {
    id: "telegram",
    endpoints: {
      signInTelegram: createAuthEndpoint(
        "/sign-in/telegram",
        { method: "POST", body: bodySchema },
        async (ctx) => {
          const { telegram, intent } = ctx.body;

          const verdict = verifyTelegramAuth(telegram);
          if (!verdict.ok) {
            throw new APIError("UNAUTHORIZED", {
              message:
                verdict.reason === "expired"
                  ? "Telegram sign-in expired — please try again."
                  : "Telegram sign-in could not be verified.",
            });
          }

          const telegramId = String(telegram.id);
          const email = telegramSurrogateEmail(telegramId);
          const displayName =
            [telegram.first_name, telegram.last_name].filter(Boolean).join(" ") ||
            telegram.username ||
            `Telegram user ${telegramId}`;

          const internal = ctx.context.internalAdapter;
          const existing = await internal.findUserByEmail(email);
          let user = existing?.user ?? null;

          if (!user) {
            user = await internal.createUser(
              {
                email,
                name: displayName,
                emailVerified: true,
                image: telegram.photo_url ?? undefined,
                telegramId,
                telegramUsername: telegram.username ?? null,
              } as never,
              { method: "telegram" }
            );
          } else if (
            (telegram.username && (user as { telegramUsername?: string | null }).telegramUsername !== telegram.username) ||
            (telegram.photo_url && user.image !== telegram.photo_url)
          ) {
            user = await internal.updateUser(user.id, {
              name: displayName,
              image: telegram.photo_url ?? user.image,
              telegramUsername: telegram.username ?? null,
            } as never);
          }

          // Provision the domain row (creators/customers) for this Telegram identity.
          const domain = await provisionTelegramIdentity({
            telegramId,
            telegramUsername: telegram.username ?? null,
            displayName,
            photoUrl: telegram.photo_url ?? null,
            intent,
          });

          const session = await internal.createSession(user.id);
          await setSessionCookie(ctx, { session, user });

          return ctx.json({
            ok: true,
            intent,
            isNewCreator: domain.isNewCreator,
            storeSlug: domain.storeSlug,
          });
        }
      ),
    },
    schema: {
      user: {
        fields: {
          telegramId: { type: "string", required: false, unique: true, input: false },
          telegramUsername: { type: "string", required: false, input: false },
        },
      },
    },
  } satisfies BetterAuthPlugin;
};

import { supabaseAdmin } from "@/lib/db/client";
import { notifyAdminsTelegram } from "@/lib/telegram/admin";

function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);
  return base || "store";
}

const RESERVED_SLUGS = new Set([
  "admin", "api", "dashboard", "signin", "signup", "signout", "shop", "cart",
  "order", "orders", "checkout", "terms", "support", "settings", "muya",
  "en", "am", "om", "ti", "so", "_next", "static", "assets",
]);

async function uniqueStoreSlug(preferred: string): Promise<string> {
  const db = supabaseAdmin();
  let candidate = slugify(preferred);
  if (RESERVED_SLUGS.has(candidate)) candidate = `${candidate}-store`;
  for (let attempt = 0; attempt < 50; attempt++) {
    const slug =
      attempt === 0 ? candidate : `${candidate}-${Math.floor(Math.random() * 9000) + 1000}`;
    const { data } = await db
      .from("creators")
      .select("id")
      .eq("store_slug", slug)
      .maybeSingle();
    if (!data) return slug;
  }
  return `${candidate}-${Date.now().toString(36)}`;
}

export type ProvisionInput = {
  telegramId: string;
  telegramUsername: string | null;
  displayName: string;
  photoUrl: string | null;
  intent: "creator" | "customer";
};

export type ProvisionResult = {
  creatorId: string | null;
  customerId: string | null;
  isNewCreator: boolean;
  storeSlug: string | null;
};

/**
 * Ensures the domain rows exist for a verified Telegram identity.
 * - intent "creator": ensures a creators row (creating slug + free-tier subscription on first sign-up)
 *   AND a customers row (creators can buy too).
 * - intent "customer": ensures a customers row only.
 */
export async function provisionTelegramIdentity(
  input: ProvisionInput
): Promise<ProvisionResult> {
  const db = supabaseAdmin();
  const result: ProvisionResult = {
    creatorId: null,
    customerId: null,
    isNewCreator: false,
    storeSlug: null,
  };

  // Customers row (always ensured — buyers and sellers alike).
  const { data: existingCustomer } = await db
    .from("customers")
    .select("id")
    .eq("telegram_user_id", input.telegramId)
    .maybeSingle();
  if (existingCustomer) {
    result.customerId = existingCustomer.id;
    await db
      .from("customers")
      .update({ telegram_username: input.telegramUsername, name: input.displayName })
      .eq("id", existingCustomer.id);
  } else {
    const { data: created, error } = await db
      .from("customers")
      .insert({
        telegram_user_id: input.telegramId,
        telegram_username: input.telegramUsername,
        name: input.displayName,
      })
      .select("id")
      .single();
    if (error) throw new Error(`customer provisioning failed: ${error.message}`);
    result.customerId = created.id;
  }

  if (input.intent === "creator") {
    const { data: existingCreator } = await db
      .from("creators")
      .select("id, store_slug")
      .eq("telegram_user_id", input.telegramId)
      .maybeSingle();
    if (existingCreator) {
      result.creatorId = existingCreator.id;
      result.storeSlug = existingCreator.store_slug;
      await db
        .from("creators")
        .update({ telegram_username: input.telegramUsername })
        .eq("id", existingCreator.id);
    } else {
      const slug = await uniqueStoreSlug(
        input.telegramUsername ?? input.displayName ?? `store-${input.telegramId}`
      );
      const { data: created, error } = await db
        .from("creators")
        .insert({
          telegram_user_id: input.telegramId,
          telegram_username: input.telegramUsername,
          store_slug: slug,
          display_name: input.displayName,
          profile_image_url: input.photoUrl,
        })
        .select("id, store_slug")
        .single();
      if (error) throw new Error(`creator provisioning failed: ${error.message}`);
      result.creatorId = created.id;
      result.storeSlug = created.store_slug;
      result.isNewCreator = true;
      await db.from("creator_subscriptions").insert({ creator_id: created.id, tier: "free" });
      // System alert: a new creator joined
      await notifyAdminsTelegram(
        `👤 <b>New creator signed up</b>\n` +
          `${input.displayName}${input.telegramUsername ? ` (@${input.telegramUsername})` : ""}\n` +
          `Store: /${created.store_slug}`
      ).catch(() => {});
    }
  }

  return result;
}

/** Looks up the creators row for a Telegram id (null if the person isn't a creator). */
export async function findCreatorByTelegramId(telegramId: string) {
  const db = supabaseAdmin();
  const { data } = await db
    .from("creators")
    .select("*")
    .eq("telegram_user_id", telegramId)
    .maybeSingle();
  return data;
}

/** Looks up the customers row for a Telegram id. */
export async function findCustomerByTelegramId(telegramId: string) {
  const db = supabaseAdmin();
  const { data } = await db
    .from("customers")
    .select("*")
    .eq("telegram_user_id", telegramId)
    .maybeSingle();
  return data;
}

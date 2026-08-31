import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/auth";
import { createLocalAccountIssuer } from "@better-auth/core/db";
import { env } from "@/lib/env";
import { supabaseAdmin } from "@/lib/db/client";
import { rateLimit } from "@/lib/auth/rate-limit";

export const runtime = "nodejs";

const bodySchema = z.object({
  setupKey: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(12, "Password must be at least 12 characters"),
});

/**
 * One-time admin credential bootstrap (public sign-up is disabled).
 * Requires the CRON_SECRET as setupKey and an email already present in
 * admin_users. Creates the Better Auth user + credential account and links
 * admin_users.auth_user_id. Refuses if a credential account already exists.
 */
export async function POST(req: Request) {
  const allowed = await rateLimit("admin-bootstrap", 5, 60 * 60);
  if (!allowed) {
    return NextResponse.json({ message: "Too many attempts" }, { status: 429 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }
  const { setupKey, email, password } = parsed.data;

  if (setupKey !== env.cronSecret()) {
    return NextResponse.json({ message: "Invalid setup key" }, { status: 403 });
  }

  const db = supabaseAdmin();
  const { data: adminRow } = await db
    .from("admin_users")
    .select("id, email, auth_user_id")
    .eq("email", email.toLowerCase())
    .maybeSingle();
  if (!adminRow) {
    return NextResponse.json(
      { message: "This email is not registered as an admin" },
      { status: 403 }
    );
  }

  const ctx = await auth.$context;
  const existing = await ctx.internalAdapter.findUserByEmail(email.toLowerCase());
  const hasCredential = existing?.accounts?.some(
    (a: { providerId: string }) => a.providerId === "credential"
  );
  if (hasCredential) {
    return NextResponse.json(
      { message: "Admin account already set up — sign in instead" },
      { status: 409 }
    );
  }

  const user =
    existing?.user ??
    (await ctx.internalAdapter.createUser(
      {
        email: email.toLowerCase(),
        name: "MUYA Admin",
        emailVerified: true,
      },
      { method: "email-password" }
    ));

  const hashed = await ctx.password.hash(password);
  await ctx.internalAdapter.linkAccount({
    userId: user.id,
    providerId: "credential",
    accountId: user.id,
    issuer: createLocalAccountIssuer("credential"),
    password: hashed,
  });

  await db
    .from("admin_users")
    .update({ auth_user_id: user.id })
    .eq("id", adminRow.id);

  return NextResponse.json({
    ok: true,
    message:
      "Admin account created. Sign in at /admin/login, then enable two-factor from the prompt.",
  });
}

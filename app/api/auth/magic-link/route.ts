import { NextResponse } from "next/server";
import { z } from "zod";
import { issueMagicLink } from "@/lib/auth/tokens";
import { rateLimit, clientIp } from "@/lib/auth/rate-limit";
import { sendMagicLinkEmail } from "@/lib/email/send";
import { findCreatorByEmail, findOrCreateCustomer } from "@/lib/db/identity";
import { env } from "@/lib/env";

const Body = z.object({
  email: z.string().email(),
  ownerType: z.enum(["creator", "customer"]),
  locale: z.string().max(5).optional(),
  redirectTo: z.string().max(500).optional(),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const { email, ownerType, locale, redirectTo } = parsed.data;
  const lower = email.toLowerCase();

  const [emailOk, ipOk] = await Promise.all([
    rateLimit(`magiclink:email:${lower}`, 3, 15 * 60),
    rateLimit(`magiclink:ip:${clientIp(req)}`, 10, 60 * 60),
  ]);
  if (!emailOk || !ipOk) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  let ownerId: string | null = null;
  if (ownerType === "creator") {
    const creator = await findCreatorByEmail(lower);
    if (creator?.status === "suspended") {
      // Do not reveal suspension via the request endpoint
      return NextResponse.json({ sent: true });
    }
    ownerId = creator?.id ?? null; // null → row created on first verify (sign-up)
  } else {
    const customer = await findOrCreateCustomer(lower);
    ownerId = customer.id;
  }

  const raw = await issueMagicLink({
    ownerType,
    ownerId,
    email: lower,
    redirectTo,
  });
  const link = `${env.appUrl()}/api/auth/verify?token=${raw}`;
  const result = await sendMagicLinkEmail({ to: lower, link, locale });

  if (!result.ok) {
    return NextResponse.json({ error: "email_failed" }, { status: 502 });
  }
  return NextResponse.json({ sent: true });
}

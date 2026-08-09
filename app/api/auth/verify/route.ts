import { NextResponse } from "next/server";
import { consumeMagicLink } from "@/lib/auth/tokens";
import {
  createCreator,
  findCreatorByEmail,
  findOrCreateCustomer,
} from "@/lib/db/identity";
import {
  signSession,
  cookieName,
  sessionCookieOptions,
} from "@/lib/auth/session";
import { env } from "@/lib/env";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const appUrl = env.appUrl();

  if (!token) {
    return NextResponse.redirect(`${appUrl}/signin?error=missing_token`);
  }

  const consumed = await consumeMagicLink(token);
  if (!consumed) {
    return NextResponse.redirect(`${appUrl}/signin?error=invalid_or_expired`);
  }

  let sub: string;
  let destination: string;

  if (consumed.ownerType === "creator") {
    let creator = consumed.ownerId
      ? await findCreatorByEmail(consumed.email)
      : null;
    if (!creator) creator = await createCreator(consumed.email);
    if (creator.status === "suspended") {
      return NextResponse.redirect(`${appUrl}/signin?error=account_suspended`);
    }
    sub = creator.id;
    destination = consumed.redirectTo ?? "/dashboard";
  } else {
    const customer = await findOrCreateCustomer(consumed.email);
    sub = customer.id;
    destination = consumed.redirectTo ?? "/account";
  }

  // Only allow same-site relative redirects
  if (!destination.startsWith("/")) destination = "/";

  const jwt = await signSession({
    sub,
    role: consumed.ownerType,
    email: consumed.email,
  });

  const res = NextResponse.redirect(`${appUrl}${destination}`);
  res.cookies.set(
    cookieName(consumed.ownerType),
    jwt,
    sessionCookieOptions(consumed.ownerType)
  );
  return res;
}

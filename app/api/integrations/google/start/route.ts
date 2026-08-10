import { NextResponse } from "next/server";
import { getUserSession } from "@/lib/auth/session";
import { googleAuthUrl } from "@/lib/integrations/google";
import { env } from "@/lib/env";

export async function GET() {
  const session = await getUserSession();
  if (!session || session.role !== "creator") {
    return NextResponse.redirect(`${env.appUrl()}/signin`);
  }
  return NextResponse.redirect(await googleAuthUrl(session.sub));
}

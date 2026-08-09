import { NextResponse } from "next/server";
import { env } from "@/lib/env";

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const admin = searchParams.get("admin") === "1";
  const res = NextResponse.redirect(
    `${env.appUrl()}${admin ? "/admin/login" : "/"}`,
    { status: 303 }
  );
  res.cookies.set(admin ? "muya_admin" : "muya_session", "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
  return res;
}

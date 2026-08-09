import { NextResponse } from "next/server";
import { z } from "zod";
import { findAdminByEmail } from "@/lib/db/identity";
import { issueAdminSetupLink } from "@/lib/auth/admin";
import { rateLimit, clientIp } from "@/lib/auth/rate-limit";
import { sendEmail, brandedEmail, ctaButton } from "@/lib/email/send";
import { env } from "@/lib/env";

const Body = z.object({ email: z.string().email() });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const ok = await rateLimit(`adminsetup:ip:${clientIp(req)}`, 5, 60 * 60);
  if (!ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  // Always answer "sent" — never reveal whether an admin account exists
  const admin = await findAdminByEmail(parsed.data.email);
  if (admin) {
    const raw = await issueAdminSetupLink(admin.id, admin.email);
    const link = `${env.appUrl()}/admin/setup?token=${raw}`;
    await sendEmail({
      to: admin.email,
      subject: "Set up your MUYA admin access",
      html: brandedEmail(
        `<p>Hello,</p><p>Use the button below to set your admin password and enable two-factor authentication. The link works once and expires in 30 minutes.</p>${ctaButton(link, "Set up admin access")}<p style="color:#8a9693;font-size:13px;">If you didn't request this, contact the MUYA team immediately.</p>`
      ),
    });
  }
  return NextResponse.json({ sent: true });
}

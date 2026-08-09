import { Resend } from "resend";
import { env } from "@/lib/env";

let client: Resend | null = null;
function resend(): Resend {
  if (!client) client = new Resend(env.resendApiKey());
  return client;
}

const BRAND_HEADER = `
  <div style="background:#175550;padding:20px 24px;border-radius:16px 16px 0 0;">
    <span style="font-family:Arial,sans-serif;font-size:22px;font-weight:bold;color:#ffffff;letter-spacing:-0.5px;">MUYA</span>
  </div>`;

export function brandedEmail(bodyHtml: string): string {
  return `
  <div style="background:#faf8f4;padding:24px;">
    <div style="max-width:520px;margin:0 auto;">
      ${BRAND_HEADER}
      <div style="background:#ffffff;padding:28px 24px;border-radius:0 0 16px 16px;font-family:Arial,sans-serif;color:#16211f;font-size:15px;line-height:1.6;">
        ${bodyHtml}
      </div>
      <p style="font-family:Arial,sans-serif;font-size:12px;color:#8a9693;text-align:center;margin-top:16px;">
        MUYA — Sell anything. Get paid. One link.
      </p>
    </div>
  </div>`;
}

export function ctaButton(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:#1d6a64;color:#ffffff;text-decoration:none;font-weight:bold;padding:13px 26px;border-radius:12px;margin:16px 0;">${label}</a>`;
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await resend().emails.send({
      from: env.emailFrom(),
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

const MAGIC_LINK_COPY: Record<
  string,
  { subject: string; hello: string; body: string; button: string; ignore: string }
> = {
  en: {
    subject: "Your MUYA sign-in link",
    hello: "Hello,",
    body: "Tap the button below to sign in. This link works once and expires in 30 minutes.",
    button: "Sign in to MUYA",
    ignore: "If you didn't request this, you can safely ignore this email.",
  },
  am: {
    subject: "የMUYA መግቢያ ሊንክዎ",
    hello: "ሰላም፣",
    body: "ለመግባት ከታች ያለውን ቁልፍ ይጫኑ። ይህ ሊንክ አንድ ጊዜ ብቻ የሚሰራ ሲሆን በ30 ደቂቃ ውስጥ ጊዜው ያበቃል።",
    button: "ወደ MUYA ይግቡ",
    ignore: "ይህን ካልጠየቁ ይህን ኢሜይል ችላ ማለት ይችላሉ።",
  },
};

export async function sendMagicLinkEmail(params: {
  to: string;
  link: string;
  locale?: string;
}) {
  const copy = MAGIC_LINK_COPY[params.locale ?? "en"] ?? MAGIC_LINK_COPY.en;
  return sendEmail({
    to: params.to,
    subject: copy.subject,
    html: brandedEmail(
      `<p>${copy.hello}</p><p>${copy.body}</p>${ctaButton(params.link, copy.button)}<p style="color:#8a9693;font-size:13px;">${copy.ignore}</p>`
    ),
  });
}

import { sendEmail, brandedEmail, ctaButton } from "@/lib/email/send";
import { env } from "@/lib/env";

type Copy = { subject: string; body: string; button?: string };

const APPROVED: Record<string, Copy> = {
  en: {
    subject: "Your order is confirmed ✅",
    body: "Great news — your order was confirmed! Use the button below to open your access.",
    button: "Open my access",
  },
  am: {
    subject: "ትዕዛዝዎ ተረጋግጧል ✅",
    body: "መልካም ዜና — ትዕዛዝዎ ተረጋግጧል! መዳረሻዎን ለመክፈት ከታች ያለውን ቁልፍ ይጠቀሙ።",
    button: "መዳረሻዬን ክፈት",
  },
};

const REJECTED: Record<string, Copy> = {
  en: {
    subject: "About your order",
    body: "Unfortunately your order could not be confirmed. If you believe this is a mistake, reply to this email and the MUYA team will help.",
  },
  am: {
    subject: "ስለ ትዕዛዝዎ",
    body: "በሚያሳዝን ሁኔታ ትዕዛዝዎ ሊረጋገጥ አልቻለም። ስህተት ነው ብለው ካመኑ ለዚህ ኢሜይል ምላሽ ይስጡ፣ የMUYA ቡድን ይረዳዎታል።",
  },
};

export async function sendOrderApprovedEmail(p: {
  to: string;
  productTitle: string;
  orderId: string;
  accessPath: string | null;
  locale?: string;
  extraHtml?: string;
}) {
  const c = APPROVED[p.locale ?? "en"] ?? APPROVED.en;
  const cta = p.accessPath
    ? ctaButton(`${env.appUrl()}${p.accessPath}`, c.button ?? "Open")
    : "";
  return sendEmail({
    to: p.to,
    subject: `${c.subject} — ${p.productTitle}`,
    html: brandedEmail(
      `<p><strong>${p.productTitle}</strong></p><p>${c.body}</p>${cta}${p.extraHtml ?? ""}`
    ),
  });
}

export async function sendOrderRejectedEmail(p: {
  to: string;
  productTitle: string;
  reason?: string | null;
  locale?: string;
}) {
  const c = REJECTED[p.locale ?? "en"] ?? REJECTED.en;
  return sendEmail({
    to: p.to,
    subject: `${c.subject} — ${p.productTitle}`,
    html: brandedEmail(
      `<p><strong>${p.productTitle}</strong></p><p>${c.body}</p>${p.reason ? `<p style="color:#8a9693;">"${p.reason}"</p>` : ""}`
    ),
  });
}

export async function sendCreatorSaleEmail(p: {
  to: string;
  productTitle: string;
  netAmount: string;
  customerEmail: string;
  extraHtml?: string;
}) {
  return sendEmail({
    to: p.to,
    subject: `💰 You made a sale — ${p.productTitle}`,
    html: brandedEmail(
      `<p><strong>You made a sale!</strong></p>
       <p>${p.productTitle}<br/>Buyer: ${p.customerEmail}<br/>Your earnings (after 7% MUYA fee): <strong>${p.netAmount}</strong></p>
       ${p.extraHtml ?? ""}
       <p>Track it in your dashboard → Income (coming next phases).</p>`
    ),
  });
}

export async function sendShippedEmail(p: {
  to: string;
  productTitle: string;
  tracking?: string | null;
  locale?: string;
}) {
  const copy =
    (p.locale ?? "en") === "am"
      ? { subject: "ትዕዛዝዎ ተልኳል 📦", body: "ትዕዛዝዎ ተልኳል! በቅርቡ ይደርስዎታል።", tr: "የመከታተያ ቁጥር" }
      : { subject: "Your order shipped 📦", body: "Your order is on its way!", tr: "Tracking number" };
  return sendEmail({
    to: p.to,
    subject: `${copy.subject} — ${p.productTitle}`,
    html: brandedEmail(
      `<p><strong>${p.productTitle}</strong></p><p>${copy.body}</p>${p.tracking ? `<p>${copy.tr}: <strong>${p.tracking}</strong></p>` : ""}`
    ),
  });
}

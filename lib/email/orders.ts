import { sendEmail, brandedEmail, ctaButton } from "@/lib/email/send";
import { env } from "@/lib/env";

const COPY: Record<string, { subject: string; body: string; button: string }> = {
  en: {
    subject: "We received your order",
    body: "Thanks! Your order is pending review by the MUYA team. You'll get another email the moment it's confirmed. You can follow its status any time:",
    button: "View order status",
  },
  am: {
    subject: "ትዕዛዝዎ ደርሶናል",
    body: "እናመሰግናለን! ትዕዛዝዎ በMUYA ቡድን በመገምገም ላይ ነው። ሲረጋገጥ ወዲያውኑ ሌላ ኢሜይል ይደርስዎታል። ሁኔታውን በማንኛውም ጊዜ መከታተል ይችላሉ፡",
    button: "የትዕዛዝ ሁኔታ ይመልከቱ",
  },
};

export async function sendOrderReceivedEmail(params: {
  to: string;
  orderId: string;
  productTitle: string;
  total: string;
  locale?: string;
}) {
  const c = COPY[params.locale ?? "en"] ?? COPY.en;
  const link = `${env.appUrl()}/order/${params.orderId}`;
  return sendEmail({
    to: params.to,
    subject: `${c.subject} — ${params.productTitle}`,
    html: brandedEmail(
      `<p><strong>${params.productTitle}</strong> · ${params.total}</p><p>${c.body}</p>${ctaButton(link, c.button)}`
    ),
  });
}

export async function sendAdminNewOrderAlert(params: {
  orderId: string;
  productTitle: string;
  productType: string;
  creatorName: string;
  customerEmail: string;
  total: string;
  details?: string;
}) {
  const adminEmail = "ermiyas4solomon@gmail.com"; // superadmin — Phase 11 makes this dynamic
  return sendEmail({
    to: adminEmail,
    subject: `🛎️ New order pending — ${params.productTitle} (${params.total})`,
    html: brandedEmail(
      `<p><strong>New order awaiting approval</strong></p>
       <p>Product: ${params.productTitle} <em>(${params.productType})</em><br/>
       Creator: ${params.creatorName}<br/>
       Customer: ${params.customerEmail}<br/>
       Total: ${params.total}${params.details ? `<br/>${params.details}` : ""}</p>
       <p>Order ID: ${params.orderId}</p>
       <p>Approve or reject it from the admin panel (Orders queue — arrives in Phase 8/11; until then use the database).</p>`
    ),
  });
}

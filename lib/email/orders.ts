import { sendEmail, brandedEmail, ctaButton } from "@/lib/email/send";
import { env } from "@/lib/env";
import { supabaseAdmin } from "@/lib/db/client";

/**
 * v2 — email is ADMIN-ONLY. Customers and creators are notified via the
 * Telegram bot (lib/telegram/notify.ts).
 */

async function adminEmail(): Promise<string> {
  const { data } = await supabaseAdmin()
    .from("admin_users")
    .select("email")
    .eq("role", "superadmin")
    .limit(1)
    .maybeSingle();
  return data?.email ?? "ermiyas4solomon@gmail.com";
}

export async function sendAdminNewOrderAlert(params: {
  orderId: string;
  productTitle: string;
  productType: string;
  creatorName: string;
  customerLabel: string;
  total: string;
  details?: string;
}) {
  return sendEmail({
    to: await adminEmail(),
    subject: `🛎️ New order pending — ${params.productTitle} (${params.total})`,
    html: brandedEmail(
      `<p><strong>New order awaiting approval</strong></p>
       <p>Product: ${params.productTitle} <em>(${params.productType})</em><br/>
       Creator: ${params.creatorName}<br/>
       Customer: ${params.customerLabel}<br/>
       Total: ${params.total}${params.details ? `<br/>${params.details}` : ""}</p>
       <p>Order ID: ${params.orderId}</p>
       ${ctaButton(`${env.appUrl()}/admin`, "Open the orders queue")}`
    ),
  });
}

export async function sendAdminAlert(params: {
  subject: string;
  html: string;
  ctaPath?: string;
  ctaLabel?: string;
}) {
  return sendEmail({
    to: await adminEmail(),
    subject: params.subject,
    html: brandedEmail(
      params.html +
        (params.ctaPath
          ? ctaButton(`${env.appUrl()}${params.ctaPath}`, params.ctaLabel ?? "Open")
          : "")
    ),
  });
}

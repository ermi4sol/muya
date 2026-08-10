// Hourly background sweep — retries failed fulfillment and sends webinar
// reminders by calling the app's guarded cron endpoint.
export default async () => {
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://mymuya.netlify.app";
  const res = await fetch(`${base}/api/cron/run`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
  });
  console.log("cron sweep:", res.status, await res.text());
  return new Response("ok");
};

export const config = { schedule: "@hourly" };

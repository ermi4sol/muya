import { env } from "@/lib/env";

let cached: { token: string; expiresAt: number } | null = null;

/** Server-to-Server OAuth token (account-level, cached ~55 min). */
async function zoomToken(): Promise<string | null> {
  if (cached && cached.expiresAt - Date.now() > 60_000) return cached.token;
  const basic = Buffer.from(
    `${env.zoomClientId()}:${env.zoomClientSecret()}`
  ).toString("base64");
  const res = await fetch(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${env.zoomAccountId()}`,
    { method: "POST", headers: { Authorization: `Basic ${basic}` } }
  );
  if (!res.ok) {
    console.error("zoom token failed:", res.status, await res.text());
    return null;
  }
  const body = (await res.json()) as { access_token: string; expires_in: number };
  cached = {
    token: body.access_token,
    expiresAt: Date.now() + body.expires_in * 1000,
  };
  return cached.token;
}

/** Creates a scheduled Zoom meeting; returns join details or null. */
export async function createZoomMeeting(p: {
  topic: string;
  startIso: string;
  durationMinutes: number;
}): Promise<{ meetingId: string; joinUrl: string } | null> {
  const token = await zoomToken();
  if (!token) return null;
  const res = await fetch("https://api.zoom.us/v2/users/me/meetings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      topic: p.topic.slice(0, 200),
      type: 2,
      start_time: p.startIso,
      duration: p.durationMinutes,
      settings: {
        join_before_host: false,
        waiting_room: true,
        approval_type: 2,
      },
    }),
  });
  if (!res.ok) {
    console.error("zoom meeting failed:", res.status, await res.text());
    return null;
  }
  const body = (await res.json()) as { id: number; join_url: string };
  return { meetingId: String(body.id), joinUrl: body.join_url };
}

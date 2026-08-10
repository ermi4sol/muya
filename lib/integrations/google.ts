import { SignJWT, jwtVerify } from "jose";
import { supabaseAdmin } from "@/lib/db/client";
import { env } from "@/lib/env";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const SCOPE = "https://www.googleapis.com/auth/calendar.events";

function secretKey() {
  return new TextEncoder().encode(env.sessionSecret());
}

export async function googleAuthUrl(creatorId: string): Promise<string> {
  const state = await new SignJWT({ purpose: "google_oauth" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(creatorId)
    .setExpirationTime("15m")
    .sign(secretKey());
  const params = new URLSearchParams({
    client_id: env.googleClientId(),
    redirect_uri: env.googleRedirectUri(),
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `${AUTH_URL}?${params}`;
}

export async function verifyOauthState(state: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(state, secretKey());
    return payload.purpose === "google_oauth" ? (payload.sub ?? null) : null;
  } catch {
    return null;
  }
}

export async function exchangeCode(code: string): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in: number;
} | null> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.googleClientId(),
      client_secret: env.googleClientSecret(),
      redirect_uri: env.googleRedirectUri(),
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) return null;
  return res.json();
}

/** Valid access token for a creator, refreshing when expired. */
export async function googleAccessToken(
  creatorId: string
): Promise<string | null> {
  const db = supabaseAdmin();
  const { data: row } = await db
    .from("creator_integrations")
    .select("access_token, refresh_token, token_expires_at")
    .eq("creator_id", creatorId)
    .eq("provider", "google_calendar")
    .maybeSingle();
  if (!row) return null;

  const stillValid =
    row.token_expires_at &&
    new Date(row.token_expires_at).getTime() - Date.now() > 60_000;
  if (stillValid && row.access_token) return row.access_token;
  if (!row.refresh_token) return row.access_token ?? null;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: row.refresh_token,
      client_id: env.googleClientId(),
      client_secret: env.googleClientSecret(),
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { access_token: string; expires_in: number };
  await db
    .from("creator_integrations")
    .update({
      access_token: body.access_token,
      token_expires_at: new Date(Date.now() + body.expires_in * 1000).toISOString(),
    })
    .eq("creator_id", creatorId)
    .eq("provider", "google_calendar");
  return body.access_token;
}

/** Creates a calendar event with a Google Meet link. Returns null on failure. */
export async function createCalendarEvent(
  creatorId: string,
  p: {
    summary: string;
    description?: string;
    startIso: string;
    durationMinutes: number;
    attendeeEmail?: string;
  }
): Promise<{ eventId: string; meetLink: string | null } | null> {
  const token = await googleAccessToken(creatorId);
  if (!token) return null;
  const end = new Date(
    new Date(p.startIso).getTime() + p.durationMinutes * 60_000
  ).toISOString();
  const res = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: p.summary,
        description: p.description,
        start: { dateTime: p.startIso },
        end: { dateTime: end },
        attendees: p.attendeeEmail ? [{ email: p.attendeeEmail }] : [],
        conferenceData: {
          createRequest: {
            requestId: `muya-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
      }),
    }
  );
  if (!res.ok) {
    console.error("calendar event failed:", res.status, await res.text());
    return null;
  }
  const body = (await res.json()) as {
    id: string;
    hangoutLink?: string;
    conferenceData?: { entryPoints?: { uri?: string; entryPointType?: string }[] };
  };
  const meet =
    body.hangoutLink ??
    body.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video")
      ?.uri ??
    null;
  return { eventId: body.id, meetLink: meet };
}

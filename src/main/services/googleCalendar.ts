import { createServer } from "node:http";
import { randomBytes, createHash } from "node:crypto";
import { shell } from "electron";
import type { AppData } from "../../shared/types.js";
import { JsonStore } from "./storage.js";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3";
const GOOGLE_SCOPE = "https://www.googleapis.com/auth/calendar";

function base64Url(buffer: Buffer) {
  return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function pkceChallenge(verifier: string) {
  return base64Url(createHash("sha256").update(verifier).digest());
}

function normalizeGoogleEvent(item: any) {
  const startAt = item.start?.dateTime || `${item.start?.date || ""}T00:00:00.000Z`;
  const endAt = item.end?.dateTime || `${item.end?.date || ""}T23:59:59.000Z`;
  return {
    id: crypto.randomUUID(),
    title: String(item.summary || "Google Calendar event").trim(),
    notes: String(item.description || "").trim(),
    location: String(item.location || "").trim(),
    startAt,
    endAt,
    allDay: Boolean(item.start?.date && !item.start?.dateTime),
    createdAt: item.created || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    googleEventId: item.id,
    googleUpdatedAt: item.updated || new Date().toISOString(),
    lastSyncedAt: new Date().toISOString(),
    source: "google"
  };
}

function toGoogleRequestBody(event: any) {
  return {
    summary: event.title,
    description: event.notes || "",
    location: event.location || "",
    start: event.allDay
      ? { date: new Date(event.startAt).toISOString().slice(0, 10) }
      : { dateTime: new Date(event.startAt).toISOString() },
    end: event.allDay
      ? { date: new Date(event.endAt).toISOString().slice(0, 10) }
      : { dateTime: new Date(event.endAt).toISOString() }
  };
}

async function googleFetch<T>(accessToken: string, url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });
  if (!response.ok) throw new Error(`Google Calendar request failed (${response.status}): ${await response.text()}`);
  return response.json() as Promise<T>;
}

async function getAccessToken(store: JsonStore) {
  const refreshToken = await store.getGoogleCalendarRefreshToken();
  const clientSecret = await store.getGoogleCalendarClientSecret();
  const data = await store.read();
  const clientId = data.settings.calendar?.googleClientId?.trim();
  if (!clientId || !refreshToken) throw new Error("Google Calendar is not connected.");
  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: "refresh_token",
    refresh_token: refreshToken
  });
  if (clientSecret) body.set("client_secret", clientSecret);
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });
  if (!response.ok) throw new Error(`Google token refresh failed (${response.status}): ${await response.text()}`);
  const payload = await response.json() as any;
  return String(payload.access_token || "");
}

async function getCalendarIdentity(accessToken: string) {
  const payload = await googleFetch<any>(accessToken, `${GOOGLE_CALENDAR_API}/users/me/calendarList`);
  const primary = (payload.items ?? []).find((item: any) => item.primary) ?? payload.items?.[0];
  return {
    calendarId: String(primary?.id || "primary"),
    email: String(primary?.id || ""),
    summary: String(primary?.summary || "Primary calendar")
  };
}

export async function googleCalendarStatus(store: JsonStore) {
  const data = await store.read();
  return {
    connected: await store.hasGoogleCalendarRefreshToken(),
    hasClientSecret: await store.hasGoogleCalendarClientSecret(),
    secureStorage: store.isSecureStorageAvailable(),
    clientId: data.settings.calendar?.googleClientId || "",
    connectedEmail: data.settings.calendar?.connectedEmail || "",
    calendarId: data.settings.calendar?.calendarId || "primary",
    lastSyncAt: data.settings.calendar?.lastSyncAt || "",
    lastSyncError: data.settings.calendar?.lastSyncError || "",
    syncEnabled: data.settings.calendar?.syncEnabled !== false
  };
}

export async function connectGoogleCalendar(store: JsonStore) {
  const data = await store.read();
  const clientId = data.settings.calendar?.googleClientId?.trim();
  const clientSecret = await store.getGoogleCalendarClientSecret();
  if (!clientId) throw new Error("Add a Google OAuth Client ID in Settings first.");

  const verifier = base64Url(randomBytes(48));
  const challenge = pkceChallenge(verifier);
  let redirectUri = "";

  const result = await new Promise<{ code: string; redirectUri: string }>((resolve, reject) => {
    const server = createServer((req, res) => {
      try {
        const url = new URL(req.url || "/", "http://127.0.0.1");
        const code = url.searchParams.get("code");
        const error = url.searchParams.get("error");
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end("<html><body style=\"font-family:Segoe UI,sans-serif;background:#0b1015;color:#eef;padding:32px;\"><h2>EclipOS</h2><p>You can return to the app now.</p></body></html>");
        server.close();
        if (error) reject(new Error(`Google authorization failed: ${error}`));
        else if (!code) reject(new Error("Google did not return an authorization code."));
        else resolve({ code, redirectUri });
      } catch (err) {
        server.close();
        reject(err);
      }
    });
    server.listen(0, "127.0.0.1", async () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("Could not start local OAuth callback server."));
        return;
      }
      redirectUri = `http://127.0.0.1:${address.port}`;
      const authUrl = new URL(GOOGLE_AUTH_URL);
      authUrl.searchParams.set("client_id", clientId);
      authUrl.searchParams.set("redirect_uri", redirectUri);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("scope", GOOGLE_SCOPE);
      authUrl.searchParams.set("access_type", "offline");
      authUrl.searchParams.set("prompt", "consent");
      authUrl.searchParams.set("code_challenge", challenge);
      authUrl.searchParams.set("code_challenge_method", "S256");
      await shell.openExternal(authUrl.toString());
    });
  });

  const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      ...(clientSecret ? { client_secret: clientSecret } : {}),
      code: result.code,
      code_verifier: verifier,
      grant_type: "authorization_code",
      redirect_uri: result.redirectUri
    })
  });
  if (!tokenResponse.ok) throw new Error(`Google token exchange failed (${tokenResponse.status}): ${await tokenResponse.text()}`);
  const tokens = await tokenResponse.json() as any;
  const refreshToken = String(tokens.refresh_token || "");
  const accessToken = String(tokens.access_token || "");
  if (!refreshToken) throw new Error("Google did not return a refresh token. Remove access and reconnect, or ensure consent is prompted.");
  await store.saveGoogleCalendarRefreshToken(refreshToken);
  const identity = await getCalendarIdentity(accessToken);
  await store.patch((draft: any) => ({
    ...draft,
    settings: {
      ...draft.settings,
      calendar: {
        ...draft.settings.calendar,
        connectedEmail: identity.email,
        calendarId: identity.calendarId,
        syncEnabled: true,
        lastSyncError: ""
      }
    }
  }));
  return googleCalendarStatus(store);
}

export async function disconnectGoogleCalendar(store: JsonStore) {
  await store.clearGoogleCalendarRefreshToken();
  await store.patch((draft: any) => ({
    ...draft,
    settings: {
      ...draft.settings,
      calendar: {
        ...draft.settings.calendar,
        connectedEmail: "",
        calendarId: "primary",
        googleSyncToken: "",
        lastSyncAt: "",
        lastSyncError: ""
      }
    }
  }));
  return googleCalendarStatus(store);
}

export async function syncGoogleCalendar(store: JsonStore) {
  const data = await store.read();
  const accessToken = await getAccessToken(store);
  const identity = await getCalendarIdentity(accessToken);
  const calendarId = encodeURIComponent(data.settings.calendar?.calendarId || identity.calendarId || "primary");

  let nextData = data;

  for (const event of nextData.calendarEvents ?? []) {
    const pendingLocalChange = !event.lastSyncedAt || new Date(event.updatedAt).getTime() > new Date(event.lastSyncedAt).getTime();
    if (!pendingLocalChange) continue;
    if (event.googleEventId) {
      const updated = await googleFetch<any>(accessToken, `${GOOGLE_CALENDAR_API}/calendars/${calendarId}/events/${encodeURIComponent(event.googleEventId)}`, {
        method: "PUT",
        body: JSON.stringify(toGoogleRequestBody(event))
      });
      const syncedAt = new Date().toISOString();
      nextData = await store.patch((draft: any) => ({
        ...draft,
        calendarEvents: (draft.calendarEvents ?? []).map((item: any) => item.id === event.id ? {
          ...item,
          googleUpdatedAt: updated.updated || syncedAt,
          lastSyncedAt: syncedAt,
          source: item.source || "local"
        } : item)
      }));
    } else {
      const created = await googleFetch<any>(accessToken, `${GOOGLE_CALENDAR_API}/calendars/${calendarId}/events`, {
        method: "POST",
        body: JSON.stringify(toGoogleRequestBody(event))
      });
      const syncedAt = new Date().toISOString();
      nextData = await store.patch((draft: any) => ({
        ...draft,
        calendarEvents: (draft.calendarEvents ?? []).map((item: any) => item.id === event.id ? {
          ...item,
          googleEventId: created.id,
          googleUpdatedAt: created.updated || syncedAt,
          lastSyncedAt: syncedAt,
          source: item.source || "local"
        } : item)
      }));
    }
  }

  let pageToken = "";
  let syncToken = nextData.settings.calendar?.googleSyncToken || "";
  let latestSyncToken = syncToken;
  const remoteItems: any[] = [];

  do {
    const url = new URL(`${GOOGLE_CALENDAR_API}/calendars/${calendarId}/events`);
    url.searchParams.set("singleEvents", "true");
    url.searchParams.set("showDeleted", "true");
    url.searchParams.set("maxResults", "250");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    else if (syncToken) url.searchParams.set("syncToken", syncToken);
    else url.searchParams.set("timeMin", new Date(Date.now() - 30 * 24 * 60 * 60_000).toISOString());
    const payload = await googleFetch<any>(accessToken, url.toString());
    remoteItems.push(...(payload.items ?? []));
    pageToken = String(payload.nextPageToken || "");
    latestSyncToken = String(payload.nextSyncToken || latestSyncToken);
  } while (pageToken);

  nextData = await store.patch((draft: any) => {
    let calendarEvents = [...(draft.calendarEvents ?? [])];
    for (const remote of remoteItems) {
      const existingIndex = calendarEvents.findIndex((item: any) => item.googleEventId === remote.id);
      if (remote.status === "cancelled") {
        if (existingIndex >= 0) calendarEvents.splice(existingIndex, 1);
        continue;
      }
      const normalized = normalizeGoogleEvent(remote);
      if (existingIndex >= 0) {
        const current = calendarEvents[existingIndex];
        const pendingLocalChange = current.lastSyncedAt && new Date(current.updatedAt).getTime() > new Date(current.lastSyncedAt).getTime();
        if (!pendingLocalChange) {
          calendarEvents[existingIndex] = {
            ...current,
            ...normalized,
            id: current.id,
            source: current.source || "google"
          };
        }
      } else {
        calendarEvents.unshift(normalized);
      }
    }
    return {
      ...draft,
      calendarEvents,
      settings: {
        ...draft.settings,
        calendar: {
          ...draft.settings.calendar,
          calendarId: identity.calendarId,
          connectedEmail: identity.email,
          googleSyncToken: latestSyncToken,
          lastSyncAt: new Date().toISOString(),
          lastSyncError: ""
        }
      }
    };
  });

  return nextData;
}

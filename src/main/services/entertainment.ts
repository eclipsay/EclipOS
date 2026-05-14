import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { EntertainmentActivity, EntertainmentDetectedApp, EntertainmentRecommendation, EntertainmentSnapshot, ImmersiveProfile } from "../../shared/types.js";
import type { JsonStore } from "./storage.js";

const execFileAsync = promisify(execFile);
const RESPONSES_URL = "https://api.openai.com/v1/responses";
let activeSessionId: string | null = null;

const gameExecutables = /\b(cyberpunk|eldenring|starfield|valorant|fortnite|minecraft|overwatch|cod|warzone|destiny|halo|diablo|wow|league|dota|cs2|rocketleague|r5apex|bg3|palworld)\b/i;
const launchers = /\b(steam|epicgameslauncher|battle\.net|battlenet|riotclientservices|gog|ubisoftconnect|eadesktop|xbox)\b/i;
const mediaApps = /\b(vlc|mpv|plex|jellyfin|kodi|potplayer|wmplayer|itunes|spotify|netflix|crunchyroll)\b/i;
const browserMediaTitles = /\b(youtube|netflix|crunchyroll|hulu|disney\+|prime video|twitch|plex|jellyfin|max|paramount)\b/i;

const now = () => new Date().toISOString();

function rows<T>(value: T | T[] | null | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

async function processWindows() {
  if (process.platform !== "win32") return [];
  const script = "Get-Process | Where-Object { $_.MainWindowTitle -or $_.Path } | Select-Object -First 180 Id,ProcessName,MainWindowTitle,Path | ConvertTo-Json -Compress";
  try {
    const { stdout } = await execFileAsync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script], { timeout: 3500, maxBuffer: 1024 * 1024 * 3, windowsHide: true });
    return rows<any>(stdout.trim() ? JSON.parse(stdout) : []);
  } catch {
    return [];
  }
}

function classify(row: any, rules: { pattern: string; profile: ImmersiveProfile; enabled: boolean }[]): EntertainmentDetectedApp | null {
  const executable = String(row.ProcessName || "");
  const title = String(row.MainWindowTitle || executable);
  const filePath = String(row.Path || "");
  const haystack = `${executable} ${title} ${filePath}`.toLowerCase();
  const matchedRule = rules.find((rule) => rule.enabled && new RegExp(rule.pattern, "i").test(haystack));
  if (matchedRule) {
    return { pid: Number(row.Id), title: title || executable, appName: executable, executable, path: filePath, kind: matchedRule.profile === "gaming" ? "game" : "media", profile: matchedRule.profile, confidence: 88, reason: `Matched rule: ${matchedRule.pattern}` };
  }
  if (filePath.toLowerCase().includes("\\steamapps\\common\\") || gameExecutables.test(executable)) {
    return { pid: Number(row.Id), title: title || executable, appName: executable, executable, path: filePath, kind: "game", profile: "gaming", confidence: 82, reason: "Recognized game executable or Steam library path" };
  }
  if (mediaApps.test(executable)) {
    return { pid: Number(row.Id), title: title || executable, appName: executable, executable, path: filePath, kind: "media", profile: "watching", confidence: 78, reason: "Recognized media player" };
  }
  if (browserMediaTitles.test(title)) {
    return { pid: Number(row.Id), title, appName: executable, executable, path: filePath, kind: "video", profile: "watching", confidence: 68, reason: "Browser window title looks like streaming media" };
  }
  if (launchers.test(executable)) {
    return { pid: Number(row.Id), title: title || executable, appName: executable, executable, path: filePath, kind: "launcher", profile: "gaming", confidence: 45, reason: "Game launcher detected" };
  }
  return null;
}

function shouldExclude(app: EntertainmentDetectedApp, excluded: string[]) {
  const text = `${app.appName} ${app.title} ${app.path}`.toLowerCase();
  return excluded.some((item) => item && text.includes(item.toLowerCase()));
}

function durationSeconds(startedAt: string, endedAt?: string) {
  return Math.max(0, Math.round(((endedAt ? new Date(endedAt) : new Date()).getTime() - new Date(startedAt).getTime()) / 1000));
}

async function updateSession(store: JsonStore, detected: EntertainmentDetectedApp[], profile: ImmersiveProfile | "off") {
  const data = await store.read();
  if (!data.settings.entertainment.trackingEnabled) return null;
  const primary = detected.find((item) => item.kind !== "launcher") ?? detected[0] ?? null;
  if (!primary || profile === "off") {
    if (activeSessionId) {
      const endedAt = now();
      await store.patch((draft) => ({
        ...draft,
        entertainmentActivities: draft.entertainmentActivities.map((item) => item.id === activeSessionId ? { ...item, endedAt, durationSeconds: durationSeconds(item.startedAt, endedAt) } : item)
      }));
      activeSessionId = null;
    }
    return null;
  }
  const existing = data.entertainmentActivities.find((item) => item.id === activeSessionId);
  if (existing && existing.executable === primary.executable && !existing.endedAt) {
    const next = { ...existing, durationSeconds: durationSeconds(existing.startedAt) };
    await store.patch((draft) => ({ ...draft, entertainmentActivities: draft.entertainmentActivities.map((item) => item.id === next.id ? next : item) }));
    return next;
  }
  if (activeSessionId && existing && !existing.endedAt) {
    const endedAt = now();
    await store.patch((draft) => ({
      ...draft,
      entertainmentActivities: draft.entertainmentActivities.map((item) => item.id === activeSessionId ? { ...item, endedAt, durationSeconds: durationSeconds(item.startedAt, endedAt) } : item)
    }));
  }
  const activity: EntertainmentActivity = {
    id: crypto.randomUUID(),
    title: primary.title,
    appName: primary.appName,
    executable: primary.executable,
    path: primary.path,
    kind: primary.kind,
    profile: primary.profile,
    startedAt: now(),
    durationSeconds: 0,
    source: primary.reason.includes("window") || primary.reason.includes("Browser") ? "window-title" : "process"
  };
  activeSessionId = activity.id;
  await store.patch((draft) => ({ ...draft, entertainmentActivities: [activity, ...draft.entertainmentActivities].slice(0, 500) }));
  return activity;
}

export async function entertainmentSnapshot(store: JsonStore): Promise<EntertainmentSnapshot> {
  const data = await store.read();
  const settings = data.settings.entertainment;
  const detected = settings.autoDetect
    ? (await processWindows()).map((row) => classify(row, settings.appRules)).filter(Boolean) as EntertainmentDetectedApp[]
    : [];
  const filtered = detected.filter((item) => !shouldExclude(item, settings.excludedApps)).sort((a, b) => b.confidence - a.confidence);
  const manual = settings.manualProfile !== "off";
  const profile = manual ? settings.manualProfile : filtered[0]?.profile ?? "off";
  const active = settings.immersiveEnabled && (manual || filtered.some((item) => item.confidence >= 60));
  const activeSession = active ? await updateSession(store, filtered, profile) : await updateSession(store, [], "off");
  const refreshed = await store.read();
  const activities = refreshed.entertainmentActivities;
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const total = (predicate: (item: EntertainmentActivity) => boolean) => activities.filter(predicate).reduce((sum, item) => sum + item.durationSeconds, 0);
  return {
    active,
    profile: active ? profile : "off",
    reason: active ? (manual ? `Manual ${profile} profile` : filtered[0]?.reason ?? "Activity detected") : "No entertainment activity detected",
    detected: filtered.slice(0, 12),
    activeSession,
    recent: activities.slice(0, 20),
    totals: {
      gameSeconds: total((item) => item.kind === "game"),
      watchSeconds: total((item) => ["show", "movie", "video", "media"].includes(item.kind)),
      sessions: activities.length,
      thisWeekSeconds: total((item) => new Date(item.startedAt).getTime() >= weekAgo)
    },
    privacy: { localOnly: true, trackingEnabled: settings.trackingEnabled, excludedApps: settings.excludedApps }
  };
}

function localRecommendations(snapshot: EntertainmentSnapshot): EntertainmentRecommendation[] {
  const unfinished = snapshot.recent.filter((item) => item.durationSeconds > 600).slice(0, 3);
  return [
    ...(unfinished[0] ? [{
      id: crypto.randomUUID(),
      title: `Continue ${unfinished[0].title}`,
      category: unfinished[0].kind === "game" ? "Continue Playing" as const : "Continue Watching" as const,
      explanation: `You spent ${Math.round(unfinished[0].durationSeconds / 60)} minutes here recently. It is a good candidate to pick back up.`,
      actionLabel: "Open activity",
      relatedTitle: unfinished[0].title,
      confidence: "medium" as const,
      source: "local" as const
    }] : []),
    {
      id: crypto.randomUUID(),
      title: "Short session pick",
      category: "Short Session",
      explanation: "For a quick break, choose something from your recent list with shorter previous sessions.",
      actionLabel: "Review recent activity",
      confidence: "low",
      source: "local"
    }
  ];
}

function parseRecommendations(text: string): EntertainmentRecommendation[] {
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return [];
  try {
    return (JSON.parse(match[0]) as Array<Partial<EntertainmentRecommendation>>).slice(0, 8).map((item) => ({
      id: crypto.randomUUID(),
      title: String(item.title ?? "Entertainment pick"),
      category: item.category ?? "Insight",
      explanation: String(item.explanation ?? ""),
      actionLabel: String(item.actionLabel ?? "Review"),
      relatedTitle: item.relatedTitle ? String(item.relatedTitle) : undefined,
      confidence: item.confidence ?? "medium",
      source: "openai"
    }));
  } catch {
    return [];
  }
}

export async function generateEntertainmentRecommendations(store: JsonStore): Promise<EntertainmentRecommendation[]> {
  const snapshot = await entertainmentSnapshot(store);
  const apiKey = await store.getOpenAiApiKey();
  const data = await store.read();
  if (!apiKey) {
    const fallback = localRecommendations(snapshot);
    await store.patch((draft) => ({ ...draft, entertainmentRecommendations: fallback }));
    return fallback;
  }
  const input = {
    active: snapshot.active,
    profile: snapshot.profile,
    totals: snapshot.totals,
    recent: snapshot.recent.slice(0, 30).map((item) => ({
      title: item.title,
      appName: item.appName,
      kind: item.kind,
      profile: item.profile,
      startedAt: item.startedAt,
      durationMinutes: Math.round(item.durationSeconds / 60)
    }))
  };
  const response = await fetch(RESPONSES_URL, {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: data.settings.ai.model,
      max_output_tokens: 900,
      instructions: "You are the EclipOS entertainment assistant. Recommend games, shows, and movies in a consumer-friendly way from local play and watch history. Return only a JSON array. Categories: Tonight's Pick, Continue Playing, Continue Watching, Short Session, Hidden Gem, Insight. Do not invent exact external metadata if not provided.",
      input: JSON.stringify(input)
    })
  });
  if (!response.ok) throw new Error(`OpenAI recommendation request failed (${response.status}).`);
  const json = await response.json() as any;
  const text = json.output_text ?? json.output?.flatMap((item: any) => item.content ?? []).map((item: any) => item.text ?? "").join("\n") ?? "";
  const recommendations = parseRecommendations(text);
  const finalRows = recommendations.length ? recommendations : localRecommendations(snapshot);
  await store.patch((draft) => ({ ...draft, entertainmentRecommendations: finalRows }));
  return finalRows;
}

export async function clearEntertainmentHistory(store: JsonStore) {
  activeSessionId = null;
  return store.patch((draft) => ({ ...draft, entertainmentActivities: [], entertainmentRecommendations: [] }));
}

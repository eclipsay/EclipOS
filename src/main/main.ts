import { app, BrowserWindow, Menu, Notification, Tray, clipboard, globalShortcut, ipcMain, nativeImage, screen, shell } from "electron";
import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import type { AiChatRequest, AppData, AppSettings, CodexPromptTemplate, CommandItem, NoteItem, PerformanceDiagnostics, ReminderItem, StressTestResult, SystemSnapshotOptions, UpdateCheckResult, UpdateInfo, WatchingModeStatus } from "../shared/types.js";
import { aiStatus, cancelAiRequest, clearAiConversation, exportAiConversation, generateStorageRecommendations, getAiConversation, previewAiContext, sendAiMessage, testOpenAiKey } from "./services/ai.js";
import { startClipboardWatcher } from "./services/clipboard.js";
import { cancelCodexSession, codexAvailability, codexPromptNeedsConfirmation, runCodexSession } from "./services/codex.js";
import { executeCommand } from "./services/commands.js";
import { deleteReminderOnBackend, discordStatus, patchReminderOnBackend, pushReminderToBackend, retryReminderOnBackend, saveDiscordBackendToken, syncReminders, testDiscordDm } from "./services/discord.js";
import { clearEntertainmentHistory, entertainmentSnapshot, generateEntertainmentRecommendations } from "./services/entertainment.js";
import { chooseFolders, indexFolders, openFile, revealFile } from "./services/files.js";
import { changedFiles, gitStatus, isGitRepository, revertChanges } from "./services/git.js";
import { getLogFile, log } from "./services/logger.js";
import { JsonStore } from "./services/storage.js";
import { analyzeStorage, cancelStorageScan, exportStorageReport, getLightSystemSnapshot, getSystemCacheDiagnostics, getSystemSnapshot, getSystemStats, killProcess, openProcessLocation, pauseStorageScan, resumeStorageScan, runDiskBenchmark, startStorageScan, startStressTest, stopStressTest, stressTestStatus, storageScanDiagnostics, storageScanStatus, storageScanTargets } from "./services/system.js";
import { defaultWorkingDirectory, detectExecutable, normalizeUserPath, openFolder, openKnownFolder, openTerminal, pathExists, selectExecutable, selectProjectFolder, validateDirectory } from "./services/tools.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const execFileAsync = promisify(execFile);
app.setName("EclipOS");
app.setAppUserModelId("com.eclipsay.eclipos");
app.setPath("userData", path.join(app.getPath("appData"), "EclipOS"));
app.commandLine.appendSwitch("disable-frame-rate-limit");
app.commandLine.appendSwitch("disable-gpu-vsync");

const store = new JsonStore();
let mainWindow: BrowserWindow | null = null;
let overlayWindow: BrowserWindow | null = null;
const dimWindows = new Map<number, BrowserWindow>();
let tray: Tray | null = null;
let clipboardTimer: NodeJS.Timeout | null = null;
let watchingModeTimer: NodeJS.Timeout | null = null;
let watchingStatus: WatchingModeStatus = { active: false, reason: "Not checked yet", playbackDisplayId: null, playbackDisplayLabel: "", fullscreen: false, dimmedDisplayIds: [] };
const reminderTimers = new Map<string, NodeJS.Timeout>();
let reminderSyncTimer: NodeJS.Timeout | null = null;
let lastPerfCpu = process.cpuUsage();
let lastPerfAt = process.hrtime.bigint();

function fallbackHtml(title: string, body: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>
    body{margin:0;background:#080c11;color:#e6edf3;font-family:Segoe UI,Arial,sans-serif;display:grid;place-items:center;height:100vh}
    main{max-width:720px;border:1px solid #263240;background:#111821;border-radius:8px;padding:28px;box-shadow:0 24px 80px rgba(0,0,0,.35)}
    h1{margin:0 0 12px;font-size:24px}p{color:#9fb0bd;line-height:1.5}code{color:#2dd4bf}
  </style></head><body><main><h1>${title}</h1><p>${body}</p><p>Startup log: <code>${getLogFile()}</code></p></main></body></html>`;
}

async function createWindow() {
  log("Creating main BrowserWindow", { packaged: app.isPackaged, userData: app.getPath("userData"), exe: app.getPath("exe") });
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 1040,
    minHeight: 680,
    title: "EclipOS",
    backgroundColor: "#090d12",
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.webContents.on("did-finish-load", () => log("Renderer did-finish-load", mainWindow?.webContents.getURL()));
  mainWindow.webContents.on("did-fail-load", (_event, code, description, url) => {
    log("Renderer did-fail-load", { code, description, url });
    mainWindow?.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(fallbackHtml("Frontend failed to load", `${description} (${code}) while loading ${url}.`))}`);
  });
  mainWindow.webContents.on("render-process-gone", (_event, details) => {
    log("Renderer process gone", details);
    mainWindow?.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(fallbackHtml("Renderer crashed", `Reason: ${details.reason}. Exit code: ${details.exitCode}.`))}`);
  });
  mainWindow.webContents.on("preload-error", (_event, preloadPath, error) => log("Preload failed", { preloadPath, error: error.message }));
  mainWindow.webContents.on("console-message", (_event, level, message, line, sourceId) => log("Renderer console", { level, message, line, sourceId }));

  try {
    if (process.env.VITE_DEV_SERVER_URL) {
      log("Loading dev renderer", process.env.VITE_DEV_SERVER_URL);
      await mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
      mainWindow.webContents.openDevTools({ mode: "detach" });
    } else {
      const rendererFile = path.resolve(__dirname, "../../dist-renderer/index.html");
      log("Loading packaged renderer", { rendererFile, exists: fs.existsSync(rendererFile) });
      await mainWindow.loadFile(rendererFile);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log("Renderer load threw", message);
    await mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(fallbackHtml("Startup error", message))}`);
  }
}

async function loadRenderer(window: BrowserWindow, hash = "") {
  if (process.env.VITE_DEV_SERVER_URL) {
    await window.loadURL(`${process.env.VITE_DEV_SERVER_URL}${hash}`);
  } else {
    const rendererFile = path.resolve(__dirname, "../../dist-renderer/index.html");
    await window.loadFile(rendererFile, hash ? { hash: hash.replace(/^#/, "") } : undefined);
  }
}

function overlayBounds(settings: AppSettings["monitoring"], reason: string) {
  const display = screen.getPrimaryDisplay();
  const bounds = display.workArea;
  const margin = 18;
  const width = Math.max(520, Math.min(1400, bounds.width - margin * 2));
  const height = settings.overlayMode === "expanded" ? 58 : 34;
  const positions = {
    "top-right": { x: bounds.x + bounds.width - width - margin, y: bounds.y + margin },
    "top-left": { x: bounds.x + margin, y: bounds.y + margin },
    "bottom-right": { x: bounds.x + bounds.width - width - margin, y: bounds.y + bounds.height - height - margin },
    "bottom-left": { x: bounds.x + margin, y: bounds.y + bounds.height - height - margin }
  };
  const position = positions[settings.overlayPositionPreset];
  if (settings.overlayDebug) {
    log("Overlay reposition", { reason, displayId: display.id, primaryBounds: bounds, width, height, x: position.x, y: position.y, preset: settings.overlayPositionPreset });
  }
  return { ...position, width, height };
}

async function createOverlayWindow() {
  const data = await store.read();
  const settings = data.settings.monitoring;
  if (overlayWindow && !overlayWindow.isDestroyed()) return overlayWindow;
  const bounds = overlayBounds(settings, "create");
  overlayWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    focusable: !settings.overlayClickThrough,
    skipTaskbar: true,
    alwaysOnTop: true,
    backgroundColor: "#00000000",
    opacity: settings.overlayOpacity,
    hasShadow: false,
    title: "EclipOS Performance Overlay",
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false
    }
  });
  overlayWindow.setAlwaysOnTop(true, "screen-saver");
  overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  overlayWindow.setIgnoreMouseEvents(settings.overlayClickThrough, { forward: true });
  overlayWindow.on("closed", () => { overlayWindow = null; });
  await loadRenderer(overlayWindow, "#overlay");
  return overlayWindow;
}

async function setOverlayVisible(visible: boolean) {
  const data = await store.patch((draft) => ({ ...draft, settings: { ...draft.settings, monitoring: { ...draft.settings.monitoring, enableOverlay: visible } } }));
  if (visible) {
    const win = await createOverlayWindow();
    win.showInactive();
  } else {
    overlayWindow?.hide();
  }
  return data;
}

async function refreshOverlaySettings() {
  const data = await store.read();
  const settings = data.settings.monitoring;
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.setOpacity(settings.overlayOpacity);
    overlayWindow.setIgnoreMouseEvents(settings.overlayClickThrough, { forward: true });
    overlayWindow.setFocusable(!settings.overlayClickThrough);
    overlayWindow.setMovable(false);
    overlayWindow.setBounds(overlayBounds(settings, "settings"));
    overlayWindow.webContents.send("overlay:settings", settings);
    if (settings.enableOverlay) overlayWindow.showInactive();
    else overlayWindow.hide();
  } else if (settings.enableOverlay) {
    await createOverlayWindow();
  }
}

async function repositionOverlayForDisplayChange(reason: string) {
  if (!overlayWindow || overlayWindow.isDestroyed()) return;
  const data = await store.read();
  if (!data.settings.monitoring.enableOverlay) return;
  overlayWindow.setBounds(overlayBounds(data.settings.monitoring, reason));
}

const mediaPlaybackPattern = /\b(vlc|mpv|mpc-hc|mpc-be|potplayer|plex|jellyfin|kodi|wmplayer|netflix|crunchyroll|youtube|hulu|disney|prime video|twitch|max|paramount)\b/i;
const mediaBrowserPattern = /\b(youtube|netflix|crunchyroll|hulu|disney\+|prime video|twitch|plex|jellyfin|max|paramount)\b/i;

async function foregroundWindowInfo() {
  if (process.platform !== "win32") return null;
  const script = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class EclipWindowApi {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
  public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }
}
"@
$hwnd = [EclipWindowApi]::GetForegroundWindow()
$rect = New-Object EclipWindowApi+RECT
[void][EclipWindowApi]::GetWindowRect($hwnd, [ref]$rect)
$pidValue = 0
[void][EclipWindowApi]::GetWindowThreadProcessId($hwnd, [ref]$pidValue)
$process = Get-Process -Id $pidValue -ErrorAction SilentlyContinue
$cim = Get-CimInstance Win32_Process -Filter "ProcessId=$pidValue" -ErrorAction SilentlyContinue
[PSCustomObject]@{
  Hwnd = $hwnd.ToInt64()
  Pid = $pidValue
  ProcessName = $process.ProcessName
  Title = $process.MainWindowTitle
  Path = $cim.ExecutablePath
  Left = $rect.Left
  Top = $rect.Top
  Right = $rect.Right
  Bottom = $rect.Bottom
} | ConvertTo-Json -Compress`;
  try {
    const { stdout } = await execFileAsync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script], { timeout: 2500, maxBuffer: 1024 * 256, windowsHide: true });
    return stdout.trim() ? JSON.parse(stdout) as any : null;
  } catch {
    return null;
  }
}

function isFullscreenOnDisplay(rect: Electron.Rectangle, display: Electron.Display) {
  const bounds = display.bounds;
  const workArea = display.workArea;
  const tolerance = 12;
  const covers = (area: Electron.Rectangle) =>
    rect.x <= area.x + tolerance &&
    rect.y <= area.y + tolerance &&
    rect.x + rect.width >= area.x + area.width - tolerance &&
    rect.y + rect.height >= area.y + area.height - tolerance;
  const nearlyFull = rect.width >= bounds.width * 0.9 && rect.height >= bounds.height * 0.86;
  return covers(bounds) || covers(workArea) || nearlyFull;
}

function isMediaPlaybackCandidate(info: any) {
  const processName = String(info?.ProcessName ?? "");
  const title = String(info?.Title ?? "");
  const filePath = String(info?.Path ?? "");
  const haystack = `${processName} ${title} ${filePath}`;
  if (mediaPlaybackPattern.test(haystack)) return true;
  if (/\b(chrome|msedge|firefox|brave|opera|vivaldi)\b/i.test(processName) && mediaBrowserPattern.test(title)) return true;
  return false;
}

function dimHtml(settings: AppSettings["entertainment"]) {
  const amount = Math.max(0, Math.min(0.95, settings.dimAmount));
  const fade = Math.max(0, Math.min(3000, settings.dimFadeMs));
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    html,body{margin:0;width:100%;height:100%;background:transparent;overflow:hidden}
    #dim{position:fixed;inset:0;background:#000;opacity:${amount};transition:opacity ${fade}ms ease;pointer-events:none}
    #badge{position:fixed;right:18px;bottom:16px;color:rgba(255,255,255,.58);font:12px Segoe UI,Arial,sans-serif;text-shadow:0 1px 2px #000;opacity:.72}
  </style></head><body><div id="dim"></div><div id="badge">Watching Mode</div></body></html>`;
}

async function createDimWindow(display: Electron.Display, settings: AppSettings["entertainment"]) {
  const existing = dimWindows.get(display.id);
  if (existing && !existing.isDestroyed()) {
    existing.setBounds(display.bounds);
    return existing;
  }
  const win = new BrowserWindow({
    ...display.bounds,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    focusable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    backgroundColor: "#00000000",
    hasShadow: false,
    title: "EclipOS Watching Mode Dimmer",
    webPreferences: { contextIsolation: true, nodeIntegration: false, backgroundThrottling: false }
  });
  win.setAlwaysOnTop(true, "screen-saver");
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.setIgnoreMouseEvents(true, { forward: true });
  win.on("closed", () => dimWindows.delete(display.id));
  await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(dimHtml(settings))}`);
  dimWindows.set(display.id, win);
  return win;
}

function hideDimWindows() {
  for (const win of dimWindows.values()) {
    if (!win.isDestroyed()) win.hide();
  }
}

async function updateWatchingModeDimming(reason = "poll") {
  const data = await store.read();
  const settings = data.settings.entertainment;
  if (!settings.immersiveEnabled || !settings.monitorDimmingEnabled || !settings.autoDetect) {
    hideDimWindows();
    watchingStatus = { active: false, reason: "Watching dimming disabled", playbackDisplayId: null, playbackDisplayLabel: "", fullscreen: false, dimmedDisplayIds: [] };
    return watchingStatus;
  }
  const info = await foregroundWindowInfo();
  if (!info || !isMediaPlaybackCandidate(info)) {
    hideDimWindows();
    watchingStatus = { active: false, reason: "No active media playback window", playbackDisplayId: null, playbackDisplayLabel: "", fullscreen: false, dimmedDisplayIds: [] };
    return watchingStatus;
  }
  const rect = { x: Number(info.Left || 0), y: Number(info.Top || 0), width: Math.max(0, Number(info.Right || 0) - Number(info.Left || 0)), height: Math.max(0, Number(info.Bottom || 0) - Number(info.Top || 0)) };
  const playbackDisplay = screen.getDisplayMatching(rect);
  const fullscreen = isFullscreenOnDisplay(rect, playbackDisplay);
  if (settings.onlyDimFullscreenPlayback && !fullscreen) {
    hideDimWindows();
    watchingStatus = { active: false, reason: "Media window is not fullscreen", playbackDisplayId: playbackDisplay.id, playbackDisplayLabel: playbackDisplay.label || `Display ${playbackDisplay.id}`, fullscreen, dimmedDisplayIds: [], app: info.ProcessName, title: info.Title, bounds: rect };
    return watchingStatus;
  }
  const displays = screen.getAllDisplays();
  const skip = new Set<number>([playbackDisplay.id, ...settings.excludedMonitorIds]);
  if (settings.keepOverlayMonitorUndimmed && overlayWindow?.isVisible()) skip.add(screen.getPrimaryDisplay().id);
  const dimTargets = displays.filter((display) => !skip.has(display.id));
  for (const display of displays) {
    const win = dimWindows.get(display.id);
    if (!dimTargets.some((target) => target.id === display.id)) win?.hide();
  }
  for (const display of dimTargets) {
    const win = await createDimWindow(display, settings);
    win.setBounds(display.bounds);
    win.showInactive();
  }
  watchingStatus = {
    active: true,
    reason: `Fullscreen media detected via ${info.ProcessName}`,
    playbackDisplayId: playbackDisplay.id,
    playbackDisplayLabel: playbackDisplay.label || `Display ${playbackDisplay.id}`,
    fullscreen,
    dimmedDisplayIds: dimTargets.map((display) => display.id),
    app: info.ProcessName,
    title: info.Title,
    bounds: rect
  };
  if (settings.dimDebug) log("Watching dimming update", { reason, watchingStatus });
  return watchingStatus;
}

function startWatchingModePoller() {
  if (watchingModeTimer) clearInterval(watchingModeTimer);
  watchingModeTimer = setInterval(() => void updateWatchingModeDimming("interval"), 1500);
  void updateWatchingModeDimming("start");
}

function repositionDimmersForDisplayChange(reason: string) {
  for (const [displayId, win] of dimWindows) {
    const display = screen.getAllDisplays().find((item) => item.id === displayId);
    if (!display || win.isDestroyed()) {
      win?.destroy();
      dimWindows.delete(displayId);
    } else {
      win.setBounds(display.bounds);
    }
  }
  void updateWatchingModeDimming(reason);
}

async function getPerformanceDiagnostics(): Promise<PerformanceDiagnostics> {
  const data = await store.read();
  const cpuNow = process.cpuUsage();
  const atNow = process.hrtime.bigint();
  const elapsedMicros = Math.max(1, Number((atNow - lastPerfAt) / 1000n));
  const cpuMicros = (cpuNow.user - lastPerfCpu.user) + (cpuNow.system - lastPerfCpu.system);
  lastPerfCpu = cpuNow;
  lastPerfAt = atNow;
  const memory = process.memoryUsage();
  const storage = await storageScanDiagnostics();
  return {
    capturedAt: new Date().toISOString(),
    process: {
      pid: process.pid,
      cpuPercent: Math.round((cpuMicros / elapsedMicros) * 1000) / 10,
      memoryRss: memory.rss,
      heapUsed: memory.heapUsed,
      uptimeSeconds: process.uptime()
    },
    windows: {
      mainVisible: !!mainWindow?.isVisible(),
      mainMinimized: !!mainWindow?.isMinimized(),
      overlayCreated: !!overlayWindow && !overlayWindow.isDestroyed(),
      overlayVisible: !!overlayWindow?.isVisible()
    },
    pollers: [
      { name: "overlay renderer", active: !!overlayWindow?.isVisible() && data.settings.monitoring.enableOverlay, intervalMs: data.settings.monitoring.lowPowerMode ? Math.max(3000, data.settings.monitoring.overlayRefreshMs) : Math.max(1000, data.settings.monitoring.overlayRefreshMs), note: "Uses lightweight cached metrics only." },
      { name: "main dashboard", active: !!mainWindow?.isVisible() && !mainWindow?.isMinimized(), intervalMs: data.settings.monitoring.refreshMs, note: "Paused when minimized if enabled." },
      { name: "clipboard watcher", active: !!clipboardTimer, intervalMs: 2500 },
      { name: "reminder timers", active: reminderTimers.size > 0, note: `${reminderTimers.size} scheduled` },
      { name: "storage scanner", active: storage.activeScan, note: storage.lastScanTarget || "idle" }
    ],
    cache: getSystemCacheDiagnostics(),
    storage,
    overlay: {
      refreshMs: data.settings.monitoring.overlayRefreshMs,
      lowPowerMode: data.settings.monitoring.lowPowerMode,
      positionPreset: data.settings.monitoring.overlayPositionPreset,
      debugLogging: data.settings.monitoring.overlayDebug
    }
  };
}

async function registerShortcut() {
  const data = await store.read();
  globalShortcut.unregisterAll();
  globalShortcut.register(data.settings.globalShortcut, () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
    mainWindow.webContents.send("open-command-palette");
  });
  globalShortcut.register(data.settings.monitoring.overlayHotkey, () => {
    void setOverlayVisible(!(overlayWindow?.isVisible() ?? data.settings.monitoring.enableOverlay));
  });
}

function createTray() {
  try {
    const image = nativeImage.createFromPath(app.getPath("exe"));
    tray = new Tray(image.isEmpty() ? nativeImage.createEmpty() : image);
  tray.setToolTip("EclipOS");
    tray.setContextMenu(Menu.buildFromTemplate([
    { label: "Show EclipOS", click: () => { mainWindow?.show(); mainWindow?.focus(); } },
      { label: "Toggle Performance Overlay", click: () => void setOverlayVisible(!(overlayWindow?.isVisible() ?? false)) },
      { type: "separator" },
      { label: "Quit", click: () => app.quit() }
    ]));
  } catch (error) {
    log("Tray unavailable", error instanceof Error ? error.message : String(error));
  }
}

function upsertById<T extends { id: string }>(rows: T[], item: T): T[] {
  const exists = rows.some((row) => row.id === item.id);
  return exists ? rows.map((row) => (row.id === item.id ? item : row)) : [item, ...rows];
}

function selectProjectInData(data: AppData, folder: string): AppData {
  const normalized = normalizeUserPath(folder);
  const existing = data.projects.find((project) => project.path.toLowerCase() === normalized.toLowerCase());
  const nextProject = {
    path: normalized,
    name: path.basename(normalized) || normalized,
    pinned: existing?.pinned ?? false,
    lastOpenedAt: new Date().toISOString()
  };
  const projects = [nextProject, ...data.projects.filter((project) => project.path.toLowerCase() !== normalized.toLowerCase())];
  return {
    ...data,
    projects,
    settings: {
      ...data.settings,
      defaultWorkingDirectory: normalized,
      projectFolders: projects.map((project) => project.path)
    }
  };
}

function upsertStorageScanLocation(data: AppData, targetPath: string, kind: "drive" | "folder"): AppData {
  const normalized = normalizeUserPath(targetPath);
  const existing = data.storageScanLocations.find((item) => item.path.toLowerCase() === normalized.toLowerCase());
  const entry = {
    path: normalized,
    label: kind === "drive" ? normalized.replace(/\\$/, "") : path.basename(normalized) || normalized,
    kind,
    pinned: existing?.pinned ?? false,
    lastScannedAt: new Date().toISOString()
  };
  return {
    ...data,
    storageScanLocations: [entry, ...data.storageScanLocations.filter((item) => item.path.toLowerCase() !== normalized.toLowerCase())].slice(0, 40)
  };
}

async function saveStressResult(result: StressTestResult | null) {
  if (!result || !result.finishedAt) return;
  await store.patch((data) => data.stressTestHistory.some((item) => item.id === result.id) ? data : ({
    ...data,
    stressTestHistory: [result, ...data.stressTestHistory].slice(0, 40)
  }));
}

function clearReminderTimer(id: string) {
  const timer = reminderTimers.get(id);
  if (timer) clearTimeout(timer);
  reminderTimers.delete(id);
}

function showReminderNotification(reminder: ReminderItem) {
  if (!Notification.isSupported()) return;
  const notification = new Notification({
    title: reminder.title || reminder.text || "EclipOS reminder",
    body: reminder.notes || reminder.text,
    silent: false
  });
  notification.on("click", () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });
  notification.show();
}

function normalizeReminder(reminder: ReminderItem): ReminderItem {
  const title = String(reminder.title || reminder.text || "").trim();
  const notes = String(reminder.notes || "").trim();
  const existingNotified = Boolean(reminder.notified || reminder.notifiedAt);
  return {
    ...reminder,
    id: String(reminder.id || crypto.randomUUID()),
    text: title,
    title,
    notes,
    completed: Boolean(reminder.completed),
    dismissed: Boolean(reminder.dismissed),
    notified: existingNotified,
    notifiedAt: reminder.notifiedAt,
    dismissedAt: reminder.dismissedAt,
    discordNotificationStatus: reminder.discordNotificationStatus || "pending",
    discordNotificationSentAt: reminder.discordNotificationSentAt,
    discordNotificationError: reminder.discordNotificationError,
    createdAt: reminder.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

async function deliverDueReminder(reminder: ReminderItem) {
  if (reminder.completed || reminder.dismissed || reminder.notified || reminder.notifiedAt) return;
  showReminderNotification(reminder);
  const notifiedAt = new Date().toISOString();
  const next = await store.patch((draft) => ({
    ...draft,
    reminders: draft.reminders.map((item) => item.id === reminder.id ? {
      ...item,
      notified: true,
      notifiedAt,
      updatedAt: notifiedAt
    } : item)
  }));
  mainWindow?.webContents.send("reminders:updated", next);
}

function scheduleReminder(reminder: ReminderItem) {
  clearReminderTimer(reminder.id);
  if (reminder.completed || reminder.dismissed || reminder.notified || reminder.notifiedAt) return;
  const delay = new Date(reminder.dueAt).getTime() - Date.now();
  if (!Number.isFinite(delay)) return;
  const maxDelay = 2_147_483_647;
  if (delay > maxDelay) {
    reminderTimers.set(reminder.id, setTimeout(() => scheduleReminder(reminder), maxDelay));
    return;
  }
  const fire = async () => {
    clearReminderTimer(reminder.id);
    const data = await store.read();
    const latest = data.reminders.find((item) => item.id === reminder.id);
    if (!latest) return;
    await deliverDueReminder(latest);
  };
  if (delay <= 0) {
    void fire();
    return;
  }
  reminderTimers.set(reminder.id, setTimeout(fire, delay));
}

async function scheduleAllReminders() {
  reminderTimers.forEach((timer) => clearTimeout(timer));
  reminderTimers.clear();
  const data = await store.read();
  data.reminders.forEach(scheduleReminder);
}

async function syncRemindersAndNotifyRenderer() {
  const next = await syncReminders(store);
  mainWindow?.webContents.send("reminders:updated", next);
  await scheduleAllReminders();
  return next;
}

function startReminderSyncPoller() {
  if (reminderSyncTimer) clearInterval(reminderSyncTimer);
  reminderSyncTimer = setInterval(() => {
    syncRemindersAndNotifyRenderer().catch((error) => log("Reminder sync failed", error instanceof Error ? error.message : String(error)));
  }, 60_000);
}

async function tryReminderBackendSync(action: () => Promise<void>) {
  try {
    await action();
    await syncRemindersAndNotifyRenderer();
  } catch (error) {
    log("Reminder backend operation failed", error instanceof Error ? error.message : String(error));
  }
}

function compareVersions(a: string, b: string) {
  const left = a.split(/[.-]/).map((part) => Number.parseInt(part, 10) || 0);
  const right = b.split(/[.-]/).map((part) => Number.parseInt(part, 10) || 0);
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const diff = (left[index] ?? 0) - (right[index] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

function validateUpdateInfo(value: unknown): UpdateInfo {
  if (!value || typeof value !== "object") throw new Error("Update feed did not return a JSON object.");
  const latest = value as Partial<UpdateInfo>;
  if (!latest.version || !latest.downloadUrl || !latest.publishedAt) {
    throw new Error("Update feed is missing version, downloadUrl, or publishedAt.");
  }
  return {
    version: String(latest.version),
    downloadUrl: String(latest.downloadUrl),
    releaseNotes: String(latest.releaseNotes ?? ""),
    fileSize: Number(latest.fileSize ?? 0),
    publishedAt: String(latest.publishedAt),
    sha256: latest.sha256 ? String(latest.sha256) : undefined,
    portableUrl: latest.portableUrl ? String(latest.portableUrl) : undefined,
    portableFileSize: latest.portableFileSize ? Number(latest.portableFileSize) : undefined,
    portableSha256: latest.portableSha256 ? String(latest.portableSha256) : undefined
  };
}

async function checkForUpdate(): Promise<UpdateCheckResult> {
  const currentVersion = app.getVersion();
  const data = await store.read();
  const settings = data.settings.updates;
  if (!settings.enabled) return { available: false, currentVersion, latest: null, error: "Update checks are disabled." };
  if (!settings.feedUrl.trim()) return { available: false, currentVersion, latest: null, error: "No update feed URL is configured." };
  try {
    const response = await fetch(settings.feedUrl.trim(), { cache: "no-store" });
    if (!response.ok) throw new Error(`Update feed returned HTTP ${response.status}.`);
    const latest = validateUpdateInfo(await response.json());
    const checkedAt = new Date().toISOString();
    await store.patch((draft) => ({
      ...draft,
      settings: {
        ...draft.settings,
        updates: { ...draft.settings.updates, lastCheckedAt: checkedAt }
      }
    }));
    return { available: compareVersions(latest.version, currentVersion) > 0, currentVersion, latest };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log("Update check failed", { message });
    return { available: false, currentVersion, latest: null, error: message };
  }
}

function wireIpc() {
  ipcMain.handle("data:get", () => store.read());
  ipcMain.handle("data:export", async () => JSON.stringify(await store.read(), null, 2));
  ipcMain.handle("data:reset", async () => {
    const current = await store.read();
    const next = await store.write({ ...current, commands: [], notes: [], reminders: [], clipboard: [], fileIndex: [], codexSessions: [], projects: [], settings: { ...current.settings, defaultWorkingDirectory: "", projectFolders: [] } });
    await scheduleAllReminders();
    return next;
  });
  ipcMain.handle("data:import", async (_event, data: AppData) => {
    const next = await store.write({ ...data, reminders: data.reminders ?? [] });
    await scheduleAllReminders();
    return next;
  });

  ipcMain.handle("settings:save", async (_event, settings: AppSettings, apiKey?: string) => {
    if (settings.defaultWorkingDirectory && !(await pathExists(settings.defaultWorkingDirectory))) {
      throw new Error(`Default working directory does not exist or is not accessible: ${settings.defaultWorkingDirectory}`);
    }
    if (settings.codexExecutablePath && !(await pathExists(settings.codexExecutablePath))) {
      throw new Error(`Codex executable does not exist or is not accessible: ${settings.codexExecutablePath}`);
    }
    if (typeof apiKey === "string") await store.saveOpenAiApiKey(apiKey);
    const data = await store.patch((draft) => ({ ...draft, settings }));
    app.setLoginItemSettings({ openAtLogin: settings.launchAtStartup });
    await registerShortcut();
    await refreshOverlaySettings();
    return data;
  });

  ipcMain.handle("discord:status", () => discordStatus(store));
  ipcMain.handle("discord:saveToken", (_event, token: string) => saveDiscordBackendToken(store, token));
  ipcMain.handle("discord:testDm", (_event, token?: string) => testDiscordDm(store, token));
  ipcMain.handle("discord:sync", () => syncRemindersAndNotifyRenderer());

  ipcMain.handle("updates:check", () => checkForUpdate());
  ipcMain.handle("updates:openDownload", async (_event, url?: string) => {
    const target = url || (await checkForUpdate()).latest?.downloadUrl;
    if (!target) throw new Error("No update download URL is available.");
    await shell.openExternal(target);
    return true;
  });

  ipcMain.handle("ai:status", () => aiStatus(store));
  ipcMain.handle("ai:conversation", () => getAiConversation(store));
  ipcMain.handle("ai:saveKey", async (_event, apiKey: string) => {
    await store.saveOpenAiApiKey(apiKey);
    return aiStatus(store);
  });
  ipcMain.handle("ai:testKey", (_event, apiKey?: string) => testOpenAiKey(store, apiKey));
  ipcMain.handle("ai:previewContext", () => previewAiContext(store));
  ipcMain.handle("ai:send", (event, request: AiChatRequest) => sendAiMessage(store, request, event.sender, {
    createReminder: async (draft) => {
      const normalized = normalizeReminder(draft as ReminderItem);
      const next = await store.patch((data) => ({ ...data, reminders: upsertById(data.reminders, normalized) }));
      scheduleReminder(normalized);
      await tryReminderBackendSync(() => pushReminderToBackend(store, normalized));
      mainWindow?.webContents.send("reminders:updated", next);
      return normalized;
    }
  }));
  ipcMain.handle("ai:cancel", (_event, requestId: string) => cancelAiRequest(requestId));
  ipcMain.handle("ai:clearChat", () => clearAiConversation(store));
  ipcMain.handle("ai:exportChat", () => exportAiConversation(store));
  ipcMain.handle("ai:storageRecommendations", () => generateStorageRecommendations(store));

  ipcMain.handle("commands:save", async (_event, command: CommandItem) =>
    store.patch((data) => ({ ...data, commands: upsertById(data.commands, command) }))
  );
  ipcMain.handle("commands:delete", async (_event, id: string) =>
    store.patch((data) => ({ ...data, commands: data.commands.filter((command) => command.id !== id) }))
  );
  ipcMain.handle("commands:run", async (_event, id: string, allowDangerous?: boolean) => {
    const data = await store.read();
    const command = data.commands.find((item) => item.id === id);
    if (!command) throw new Error("Command not found.");
    const cwd = data.settings.defaultWorkingDirectory || defaultWorkingDirectory();
    if (cwd && !(await pathExists(cwd))) throw new Error(`Working directory does not exist or is not accessible: ${cwd}`);
    const result = await executeCommand(command, allowDangerous, cwd);
    await store.patch((draft) => ({
      ...draft,
      commands: draft.commands.map((item) =>
        item.id === id ? { ...item, runCount: item.runCount + 1, lastRunAt: new Date().toISOString() } : item
      )
    }));
    return result;
  });

  ipcMain.handle("files:chooseFolders", () => chooseFolders());
  ipcMain.handle("files:index", async (_event, folders: string[]) => {
    const fileIndex = await indexFolders(folders);
    return store.patch((data) => ({ ...data, fileIndex, settings: { ...data.settings, indexedFolders: folders } }));
  });
  ipcMain.handle("files:open", (_event, target: string) => openFile(target));
  ipcMain.handle("files:reveal", (_event, target: string) => revealFile(target));
  ipcMain.handle("folders:openKnown", (_event, kind: "app" | "data" | "logs") => openKnownFolder(kind));
  ipcMain.handle("projects:select", async () => {
    const folder = await selectProjectFolder();
    if (!folder) return store.read();
    return store.patch((data) => selectProjectInData(data, folder));
  });
  ipcMain.handle("projects:setManual", async (_event, folder: string) => {
    const normalized = await validateDirectory(folder);
    return store.patch((data) => selectProjectInData(data, normalized));
  });
  ipcMain.handle("projects:pin", async (_event, folder: string) =>
    store.patch((data) => ({
      ...data,
      projects: data.projects.map((project) => project.path === folder ? { ...project, pinned: !project.pinned } : project)
    }))
  );
  ipcMain.handle("projects:open", async () => {
    const data = await store.read();
    if (!data.settings.defaultWorkingDirectory) throw new Error("Select a project folder first.");
    return openFolder(data.settings.defaultWorkingDirectory);
  });
  ipcMain.handle("projects:openTerminal", async () => {
    const data = await store.read();
    if (!data.settings.defaultWorkingDirectory) throw new Error("Select a project folder first.");
    return openTerminal(data.settings.defaultWorkingDirectory);
  });
  ipcMain.handle("folders:selectProject", async () => {
    const folder = await selectProjectFolder();
    if (!folder) return store.read();
    return store.patch((data) => ({
      ...data,
      settings: {
        ...data.settings,
        defaultWorkingDirectory: folder,
        projectFolders: Array.from(new Set([folder, ...data.settings.projectFolders]))
      }
    }));
  });
  ipcMain.handle("tools:detectCodex", async () => {
    const detected = (await detectExecutable("codex.exe")) || (await detectExecutable("codex.cmd")) || (await detectExecutable("codex"));
    return store.patch((data) => ({ ...data, settings: { ...data.settings, codexExecutablePath: detected || data.settings.codexExecutablePath } }));
  });
  ipcMain.handle("tools:selectCodex", async () => {
    const selected = await selectExecutable();
    if (!selected) return store.read();
    if (!(await pathExists(selected))) throw new Error(`Selected executable does not exist: ${selected}`);
    return store.patch((data) => ({ ...data, settings: { ...data.settings, codexExecutablePath: selected } }));
  });
  ipcMain.handle("codex:availability", async () => codexAvailability(await store.read()));
  ipcMain.handle("codex:run", async (event, request) => {
    if (codexPromptNeedsConfirmation(request.prompt) && !request.requiresConfirmation) {
      throw new Error("This Codex prompt can modify files or run project commands and requires confirmation.");
    }
    return runCodexSession(store, request, BrowserWindow.fromWebContents(event.sender) ?? undefined);
  });
  ipcMain.handle("codex:cancel", async (event, id: string) =>
    cancelCodexSession(store, id, BrowserWindow.fromWebContents(event.sender) ?? undefined)
  );
  ipcMain.handle("codex:templateSave", async (_event, template: CodexPromptTemplate) =>
    store.patch((data) => ({
      ...data,
      codexTemplates: data.codexTemplates.some((item) => item.id === template.id)
        ? data.codexTemplates.map((item) => item.id === template.id ? template : item)
        : [template, ...data.codexTemplates]
    }))
  );
  ipcMain.handle("codex:templateDelete", async (_event, id: string) =>
    store.patch((data) => ({ ...data, codexTemplates: data.codexTemplates.filter((item) => item.id !== id) }))
  );
  ipcMain.handle("git:status", async () => {
    const data = await store.read();
    if (!data.settings.defaultWorkingDirectory) throw new Error("Select a project folder first.");
    return gitStatus(data.settings.defaultWorkingDirectory);
  });
  ipcMain.handle("git:changedFiles", async () => {
    const data = await store.read();
    if (!data.settings.defaultWorkingDirectory) return [];
    return changedFiles(data.settings.defaultWorkingDirectory);
  });
  ipcMain.handle("git:isRepo", async () => {
    const data = await store.read();
    return !!data.settings.defaultWorkingDirectory && isGitRepository(data.settings.defaultWorkingDirectory);
  });
  ipcMain.handle("git:revert", async () => {
    const data = await store.read();
    if (!data.settings.defaultWorkingDirectory) throw new Error("Select a project folder first.");
    return revertChanges(data.settings.defaultWorkingDirectory);
  });

  ipcMain.handle("notes:save", async (_event, note: NoteItem) =>
    store.patch((data) => ({ ...data, notes: upsertById(data.notes, note) }))
  );
  ipcMain.handle("notes:delete", async (_event, id: string) =>
    store.patch((data) => ({ ...data, notes: data.notes.filter((note) => note.id !== id) }))
  );
  ipcMain.handle("reminders:save", async (_event, reminder: ReminderItem) => {
    const normalized = normalizeReminder(reminder);
    const next = await store.patch((data) => ({ ...data, reminders: upsertById(data.reminders, normalized) }));
    scheduleReminder(normalized);
    await tryReminderBackendSync(() => pushReminderToBackend(store, normalized));
    return next;
  });
  ipcMain.handle("reminders:toggleComplete", async (_event, id: string) => {
    clearReminderTimer(id);
    const next = await store.patch((data) => ({
      ...data,
      reminders: data.reminders.map((reminder) => {
        if (reminder.id !== id) return reminder;
        const completed = !reminder.completed;
        return { ...reminder, completed, notified: completed ? reminder.notified : false, dismissed: completed ? reminder.dismissed : false, discordNotificationStatus: completed ? reminder.discordNotificationStatus : "pending", discordNotificationError: completed ? reminder.discordNotificationError : undefined, updatedAt: new Date().toISOString() };
      })
    }));
    await scheduleAllReminders();
    const changed = next.reminders.find((reminder) => reminder.id === id);
    if (changed) await tryReminderBackendSync(() => patchReminderOnBackend(store, id, { completed: changed.completed, dismissed: changed.dismissed }));
    return next;
  });
  ipcMain.handle("reminders:complete", async (_event, id: string) => {
    clearReminderTimer(id);
    const next = await store.patch((data) => ({
      ...data,
      reminders: data.reminders.map((reminder) =>
        reminder.id === id ? { ...reminder, completed: true, updatedAt: new Date().toISOString() } : reminder
      )
    }));
    await tryReminderBackendSync(() => patchReminderOnBackend(store, id, { completed: true }));
    return next;
  });
  ipcMain.handle("reminders:dismiss", async (_event, id: string) => {
    clearReminderTimer(id);
    const next = await store.patch((data) => ({
      ...data,
      reminders: data.reminders.map((reminder) =>
        reminder.id === id ? { ...reminder, dismissed: true, dismissedAt: new Date().toISOString(), discordNotificationStatus: "dismissed", updatedAt: new Date().toISOString() } : reminder
      )
    }));
    await tryReminderBackendSync(() => patchReminderOnBackend(store, id, { dismissed: true, discordNotificationStatus: "dismissed" }));
    return next;
  });
  ipcMain.handle("reminders:retryDiscord", async (_event, id: string) => {
    const data = await store.read();
    const reminder = data.reminders.find((item) => item.id === id);
    if (!reminder) throw new Error("Reminder not found.");
    const pending = { ...reminder, notified: false, notifiedAt: undefined, discordNotificationStatus: "pending" as const, discordNotificationSentAt: undefined, discordNotificationError: undefined };
    await store.patch((draft) => ({ ...draft, reminders: draft.reminders.map((item) => item.id === id ? pending : item) }));
    await tryReminderBackendSync(() => retryReminderOnBackend(store, id));
    return store.read();
  });
  ipcMain.handle("reminders:delete", async (_event, id: string) => {
    clearReminderTimer(id);
    const next = await store.patch((data) => ({ ...data, reminders: data.reminders.filter((reminder) => reminder.id !== id) }));
    await tryReminderBackendSync(() => deleteReminderOnBackend(store, id));
    return next;
  });
  ipcMain.handle("reminders:testNotification", () => {
  showReminderNotification({ id: "test", text: "Notifications are working.", title: "EclipOS reminder test", notes: "You will see local reminders here when they are due.", dueAt: new Date().toISOString(), completed: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    return Notification.isSupported();
  });
  ipcMain.handle("entertainment:status", () => entertainmentSnapshot(store));
  ipcMain.handle("entertainment:recommendations", () => generateEntertainmentRecommendations(store));
  ipcMain.handle("entertainment:clear", () => clearEntertainmentHistory(store));
  ipcMain.handle("entertainment:watchingStatus", () => watchingStatus);
  ipcMain.handle("entertainment:previewDimming", async () => {
    const data = await store.read();
    const primary = screen.getPrimaryDisplay();
    const targets = screen.getAllDisplays().filter((display) => display.id !== primary.id && !data.settings.entertainment.excludedMonitorIds.includes(display.id));
    for (const display of targets) {
      const win = await createDimWindow(display, data.settings.entertainment);
      win.showInactive();
    }
    setTimeout(() => hideDimWindows(), 2500);
    return targets.map((display) => display.id);
  });

  ipcMain.handle("clipboard:copy", (_event, text: string) => clipboard.writeText(text));
  ipcMain.handle("clipboard:clear", () => store.patch((data) => ({ ...data, clipboard: data.clipboard.filter((item) => item.pinned) })));
  ipcMain.handle("clipboard:togglePin", (_event, id: string) =>
    store.patch((data) => ({ ...data, clipboard: data.clipboard.map((item) => (item.id === id ? { ...item, pinned: !item.pinned } : item)) }))
  );

  ipcMain.handle("system:stats", () => getSystemStats());
  ipcMain.handle("system:lightSnapshot", async () => {
    const data = await store.read();
    return getLightSystemSnapshot(data.settings.monitoring.maxHistoryPoints || data.settings.monitoring.historyLimit || 360);
  });
  ipcMain.handle("system:snapshot", async (_event, options?: SystemSnapshotOptions) => {
    const data = await store.read();
    const historyLimit = data.settings.monitoring.maxHistoryPoints || data.settings.monitoring.historyLimit;
    return getSystemSnapshot(historyLimit, options);
  });
  ipcMain.handle("system:performanceDiagnostics", () => getPerformanceDiagnostics());
  ipcMain.handle("system:killProcess", (_event, pid: number) => killProcess(pid));
  ipcMain.handle("system:openProcessLocation", (_event, pid: number) => openProcessLocation(pid));
  ipcMain.handle("system:analyzeStorage", (_event, root?: string) => analyzeStorage(root));
  ipcMain.handle("system:storageTargets", () => storageScanTargets());
  ipcMain.handle("system:storageScanStart", async (_event, options) => {
    const result = await startStorageScan(options);
    if (result.targetPath) await store.patch((data) => upsertStorageScanLocation(data, result.targetPath, result.targetType));
    return result;
  });
  ipcMain.handle("system:storageScanStatus", () => storageScanStatus());
  ipcMain.handle("system:storageScanCancel", () => cancelStorageScan());
  ipcMain.handle("system:storageScanPause", () => pauseStorageScan());
  ipcMain.handle("system:storageScanResume", () => resumeStorageScan());
  ipcMain.handle("system:storageLocationPin", (_event, target: string) =>
    store.patch((data) => ({
      ...data,
      storageScanLocations: data.storageScanLocations.map((item) => item.path === target ? { ...item, pinned: !item.pinned } : item)
    }))
  );
  ipcMain.handle("system:storageReportExport", () => exportStorageReport());
  ipcMain.handle("system:diskBenchmark", () => runDiskBenchmark());
  ipcMain.handle("system:stressStart", async (_event, options) => {
    const data = await store.read();
    return startStressTest(options, { cpuTempAlert: data.settings.monitoring.cpuTempAlert, gpuTempAlert: data.settings.monitoring.gpuTempAlert });
  });
  ipcMain.handle("system:stressStop", async () => {
    const session = stopStressTest();
    await saveStressResult(session.result);
    return session;
  });
  ipcMain.handle("system:stressStatus", async () => {
    const session = stressTestStatus();
    await saveStressResult(session.result);
    return session;
  });
  ipcMain.handle("system:stressExport", async () => {
    const data = await store.read();
    const file = path.join(app.getPath("documents"), `EclipOS-Stress-History-${Date.now()}.json`);
    await fs.promises.writeFile(file, JSON.stringify(data.stressTestHistory, null, 2), "utf8");
    return file;
  });
  ipcMain.handle("overlay:show", () => setOverlayVisible(true));
  ipcMain.handle("overlay:hide", () => setOverlayVisible(false));
  ipcMain.handle("overlay:toggle", async () => setOverlayVisible(!(overlayWindow?.isVisible() ?? false)));
}

app.whenReady().then(async () => {
  log("App ready", { version: app.getVersion(), packaged: app.isPackaged });
  wireIpc();
  await createWindow();
  createTray();
  await registerShortcut();
  await refreshOverlaySettings();
  startWatchingModePoller();
  await syncRemindersAndNotifyRenderer().catch((error) => log("Initial reminder sync failed", error instanceof Error ? error.message : String(error)));
  startReminderSyncPoller();
  await scheduleAllReminders();
  clipboardTimer = startClipboardWatcher(store);
  screen.on("display-added", () => { void repositionOverlayForDisplayChange("display-added"); repositionDimmersForDisplayChange("display-added"); });
  screen.on("display-removed", () => { void repositionOverlayForDisplayChange("display-removed"); repositionDimmersForDisplayChange("display-removed"); });
  screen.on("display-metrics-changed", () => { void repositionOverlayForDisplayChange("display-metrics-changed"); repositionDimmersForDisplayChange("display-metrics-changed"); });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  globalShortcut.unregisterAll();
  if (clipboardTimer) clearInterval(clipboardTimer);
  if (watchingModeTimer) clearInterval(watchingModeTimer);
  if (reminderSyncTimer) clearInterval(reminderSyncTimer);
  reminderTimers.forEach((timer) => clearTimeout(timer));
  overlayWindow?.destroy();
  for (const win of dimWindows.values()) win.destroy();
  tray?.destroy();
});

import { app, safeStorage } from "electron";
import fs from "node:fs/promises";
import path from "node:path";
import type { AiSettings, AppData, AppSettings, CodexPromptTemplate } from "../../shared/types.js";

const now = () => new Date().toISOString();

const defaultAiSettings: AiSettings = {
  model: "gpt-4.1-mini",
  previewContext: false,
  privacy: {
    hardwareStats: true,
    processNames: true,
    filePaths: false,
    storageScanSummaries: true,
    eventLogs: false,
    crashLogs: false
  }
};

const defaultSettings: AppSettings = {
  theme: "midnight",
  accent: "#2dd4bf",
  launchAtStartup: false,
  globalShortcut: "CommandOrControl+Shift+Space",
  indexedFolders: [],
  projectFolders: [],
  defaultWorkingDirectory: "",
  codexExecutablePath: "",
  monitoring: {
      refreshMs: 3000,
      historyLimit: 720,
      lowPowerMode: false,
      pauseWhenMinimized: true,
      disableBackgroundIndexing: false,
      maxHistoryPoints: 360,
      maxClipboardEntries: 80,
      maxProcessRefreshMs: 5000,
      cpuTempAlert: 85,
    gpuTempAlert: 85,
    ramAlertPercent: 90,
    storageAlertPercent: 90,
    networkAlertMbps: 100,
    enableAlerts: true,
    enableOverlay: false,
    overlayMode: "compact",
    overlayOpacity: 0.88,
    overlayRefreshMs: 1500,
    overlayClickThrough: true,
    overlayHotkey: "CommandOrControl+Shift+O",
    overlayPosition: { x: 80, y: 80 },
    overlayPositionPreset: "top-right",
    overlayFontSize: 13,
    overlaySpacing: 10,
    overlayTextColor: "#f2f5f8",
    overlayShadow: true,
    overlayDebug: false,
    overlayMetrics: {
      cpu: true,
      cpuTemp: true,
      gpu: true,
      gpuTemp: true,
      ram: true,
      vram: true,
      network: true,
      fps: true
    }
  },
  ai: defaultAiSettings,
  discord: {
    enabled: true,
    targetUserId: "140478632165507073",
    backendUrl: process.env.ECLIPOS_REMINDER_BACKEND_URL || "",
    syncEnabled: true
  },
  updates: {
    enabled: true,
    feedUrl: "",
    checkOnStartup: true
  },
  home: {
    compact: true,
    showTodayRail: true,
    widgets: {
      pinnedNotes: true,
      reminders: true,
      tasks: true,
      calendar: true,
      clipboard: true,
      codex: true,
      quickLaunch: true,
      recentFiles: true
    }
  },
  calendar: {
    googleClientId: "651189547797-31r9heos9mlpuov1rf47ika0s8no4d8n.apps.googleusercontent.com",
    calendarId: "primary",
    connectedEmail: "",
    googleSyncToken: "",
    lastSyncAt: "",
    lastSyncError: "",
    syncEnabled: false,
    googleCalendarEnabled: true,
    defaultDurationMinutes: 60
  },
  entertainment: {
    trackingEnabled: true,
    immersiveEnabled: true,
    autoDetect: true,
    monitorDimmingEnabled: true,
    dimAmount: 0.72,
    dimFadeMs: 450,
    onlyDimFullscreenPlayback: true,
    dimInactiveMonitorsOnly: true,
    keepOverlayMonitorUndimmed: false,
    excludedMonitorIds: [],
    dimDebug: false,
    suppressNotifications: true,
    hideOverlay: false,
    lowerOverlayOpacity: true,
    pauseBackgroundScans: true,
    reduceMonitoringRefresh: true,
    performanceMode: false,
    autoExit: true,
    allowedNotifications: ["critical reminders", "security alerts"],
    excludedApps: [],
    manualProfile: "off",
    appRules: [
      { pattern: "steamapps\\common", profile: "gaming", enabled: true },
      { pattern: "vlc", profile: "watching", enabled: true },
      { pattern: "plex", profile: "watching", enabled: true },
      { pattern: "jellyfin", profile: "watching", enabled: true },
      { pattern: "youtube|netflix|crunchyroll|hulu|disney|prime video", profile: "watching", enabled: true }
    ]
  }
};

const defaultTemplates = (): CodexPromptTemplate[] => [
  {
    id: crypto.randomUUID(),
    name: "Review this project",
    prompt: "Review this project for bugs, risky architecture, missing tests, and obvious improvements. Start with findings and include file references where possible.",
    requiresConfirmation: false,
    createdAt: now(),
    updatedAt: now()
  },
  {
    id: crypto.randomUUID(),
    name: "Fix broken app launch",
    prompt: "Diagnose and fix the broken app launch. Check build output paths, renderer loading, preload errors, packaged asset paths, and startup logs. Verify the app launches after the fix.",
    requiresConfirmation: true,
    createdAt: now(),
    updatedAt: now()
  },
  {
    id: crypto.randomUUID(),
    name: "Package Windows .exe",
    prompt: "Build and verify the Windows executable packaging. Ensure the app runs by double-clicking the .exe, does not rely on localhost, and stores data in the Windows app data directory.",
    requiresConfirmation: true,
    createdAt: now(),
    updatedAt: now()
  }
];

const defaultData = (): AppData => ({
  settings: defaultSettings,
  commands: [
    {
      id: crypto.randomUUID(),
      name: "Open GitHub",
      kind: "website",
      value: "https://github.com",
      favorite: true,
      createdAt: now(),
      updatedAt: now(),
      runCount: 0
    },
    {
      id: crypto.randomUUID(),
      name: "VPS uptime check",
      kind: "ssh",
      value: "ssh user@example.com uptime",
      favorite: false,
      createdAt: now(),
      updatedAt: now(),
      runCount: 0
    }
  ],
  notes: [
    {
      id: crypto.randomUUID(),
      title: "Welcome",
      body: "Pin local runbooks, snippets, and Codex prompts here.",
      tags: ["starter"],
      pinned: true,
      kind: "note",
      createdAt: now(),
      updatedAt: now()
    }
  ],
  reminders: [],
  tasks: [],
  calendarEvents: [],
  clipboard: [],
  fileIndex: [],
  codexTemplates: defaultTemplates(),
  codexSessions: [],
  projects: [],
  aiConversation: { messages: [], updatedAt: now() },
  storageScanLocations: [],
  stressTestHistory: [],
  entertainmentActivities: [],
  entertainmentRecommendations: []
});

export class JsonStore {
  private filePath = path.join(app.getPath("userData"), "eclipos-data.json");
  private legacyPath = path.join(app.getPath("appData"), "Local AI Assistant", "assistant-data.json");
  private remindersLegacyPath = path.join(app.getPath("appData"), "Reminders", "reminders.json");
  private openAiKeyPath = path.join(app.getPath("userData"), "openai-api-key.bin");
  private discordBackendTokenPath = path.join(app.getPath("userData"), "discord-reminder-backend-token.bin");
  private googleCalendarRefreshTokenPath = path.join(app.getPath("userData"), "google-calendar-refresh-token.bin");
  private data: AppData | null = null;

  async read(): Promise<AppData> {
    if (this.data) return this.data;
    try {
      let raw: string;
      try {
        raw = await fs.readFile(this.filePath, "utf8");
      } catch {
        raw = await fs.readFile(this.legacyPath, "utf8");
      }
      const parsed = JSON.parse(raw) as AppData;
      const reminders = parsed.reminders?.length ? parsed.reminders : await this.readLegacyReminders();
      this.data = {
        ...defaultData(),
        ...parsed,
        settings: {
          ...defaultSettings,
          ...parsed.settings,
          monitoring: { ...defaultSettings.monitoring, ...parsed.settings?.monitoring },
          ai: {
            ...defaultAiSettings,
            ...parsed.settings?.ai,
            privacy: { ...defaultAiSettings.privacy, ...parsed.settings?.ai?.privacy }
          },
          discord: {
            ...defaultSettings.discord,
            ...parsed.settings?.discord
          },
          updates: {
            ...defaultSettings.updates,
            ...parsed.settings?.updates
          },
          home: {
            ...defaultSettings.home,
            ...parsed.settings?.home,
            widgets: {
              ...defaultSettings.home.widgets,
              ...parsed.settings?.home?.widgets
            }
          },
          calendar: {
            ...defaultSettings.calendar,
            ...parsed.settings?.calendar
          },
          entertainment: {
            ...defaultSettings.entertainment,
            ...parsed.settings?.entertainment,
            appRules: parsed.settings?.entertainment?.appRules ?? defaultSettings.entertainment.appRules,
            excludedApps: parsed.settings?.entertainment?.excludedApps ?? []
          }
        },
        reminders,
        tasks: parsed.tasks ?? [],
        calendarEvents: parsed.calendarEvents ?? [],
        codexTemplates: parsed.codexTemplates?.length ? parsed.codexTemplates : defaultTemplates(),
        codexSessions: parsed.codexSessions ?? [],
        projects: parsed.projects ?? (parsed.settings?.projectFolders ?? []).map((projectPath) => ({
          path: projectPath,
          name: path.basename(projectPath),
          pinned: false,
          lastOpenedAt: new Date().toISOString()
        })),
        aiConversation: parsed.aiConversation ?? { messages: [], updatedAt: now() },
        storageScanLocations: parsed.storageScanLocations ?? [],
        stressTestHistory: parsed.stressTestHistory ?? [],
        entertainmentActivities: parsed.entertainmentActivities ?? [],
        entertainmentRecommendations: parsed.entertainmentRecommendations ?? []
      };
    } catch {
      this.data = defaultData();
      await this.write(this.data);
    }
    return this.data;
  }

  async write(next: AppData): Promise<AppData> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    this.data = next;
    await fs.writeFile(this.filePath, JSON.stringify(next, null, 2), "utf8");
    return next;
  }

  async patch(mutator: (data: AppData) => AppData | void): Promise<AppData> {
    const data = await this.read();
    const result = mutator(structuredClone(data)) ?? data;
    return this.write(result);
  }

  async clearApiKey(): Promise<void> {
    await fs.rm(path.join(app.getPath("userData"), "eclipos-secrets.bin"), { force: true });
    await fs.rm(this.openAiKeyPath, { force: true });
  }

  isSecureStorageAvailable(): boolean {
    return safeStorage.isEncryptionAvailable();
  }

  async hasOpenAiApiKey(): Promise<boolean> {
    const key = await this.getOpenAiApiKey();
    return key.length > 0;
  }

  async saveOpenAiApiKey(apiKey: string): Promise<void> {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      await this.clearApiKey();
      return;
    }
    await fs.mkdir(path.dirname(this.openAiKeyPath), { recursive: true });
    if (safeStorage.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(trimmed);
      await fs.writeFile(this.openAiKeyPath, JSON.stringify({ encrypted: true, value: encrypted.toString("base64") }), "utf8");
      return;
    }
    await fs.writeFile(this.openAiKeyPath, JSON.stringify({ encrypted: false, value: Buffer.from(trimmed, "utf8").toString("base64") }), "utf8");
  }

  async getOpenAiApiKey(): Promise<string> {
    try {
      const raw = await fs.readFile(this.openAiKeyPath, "utf8");
      const payload = JSON.parse(raw) as { encrypted: boolean; value: string };
      const bytes = Buffer.from(payload.value, "base64");
      if (payload.encrypted) return safeStorage.decryptString(bytes);
      return bytes.toString("utf8");
    } catch {
      return "";
    }
  }

  async hasDiscordBackendToken(): Promise<boolean> {
    return (await this.getDiscordBackendToken()).length > 0;
  }

  async saveDiscordBackendToken(token: string): Promise<void> {
    const trimmed = token.trim();
    if (!trimmed) {
      await fs.rm(this.discordBackendTokenPath, { force: true });
      return;
    }
    await fs.mkdir(path.dirname(this.discordBackendTokenPath), { recursive: true });
    if (safeStorage.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(trimmed);
      await fs.writeFile(this.discordBackendTokenPath, JSON.stringify({ encrypted: true, value: encrypted.toString("base64") }), "utf8");
      return;
    }
    await fs.writeFile(this.discordBackendTokenPath, JSON.stringify({ encrypted: false, value: Buffer.from(trimmed, "utf8").toString("base64") }), "utf8");
  }

  async getDiscordBackendToken(): Promise<string> {
    if (process.env.ECLIPOS_REMINDER_BACKEND_TOKEN?.trim()) return process.env.ECLIPOS_REMINDER_BACKEND_TOKEN.trim();
    try {
      const raw = await fs.readFile(this.discordBackendTokenPath, "utf8");
      const payload = JSON.parse(raw) as { encrypted: boolean; value: string };
      const bytes = Buffer.from(payload.value, "base64");
      if (payload.encrypted) return safeStorage.decryptString(bytes);
      return bytes.toString("utf8");
    } catch {
      return "";
    }
  }

  async hasGoogleCalendarRefreshToken(): Promise<boolean> {
    return (await this.getGoogleCalendarRefreshToken()).length > 0;
  }

  async saveGoogleCalendarRefreshToken(token: string): Promise<void> {
    const trimmed = token.trim();
    if (!trimmed) {
      await fs.rm(this.googleCalendarRefreshTokenPath, { force: true });
      return;
    }
    await fs.mkdir(path.dirname(this.googleCalendarRefreshTokenPath), { recursive: true });
    if (safeStorage.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(trimmed);
      await fs.writeFile(this.googleCalendarRefreshTokenPath, JSON.stringify({ encrypted: true, value: encrypted.toString("base64") }), "utf8");
      return;
    }
    await fs.writeFile(this.googleCalendarRefreshTokenPath, JSON.stringify({ encrypted: false, value: Buffer.from(trimmed, "utf8").toString("base64") }), "utf8");
  }

  async getGoogleCalendarRefreshToken(): Promise<string> {
    try {
      const raw = await fs.readFile(this.googleCalendarRefreshTokenPath, "utf8");
      const payload = JSON.parse(raw) as { encrypted: boolean; value: string };
      const bytes = Buffer.from(payload.value, "base64");
      if (payload.encrypted) return safeStorage.decryptString(bytes);
      return bytes.toString("utf8");
    } catch {
      return "";
    }
  }

  async clearGoogleCalendarRefreshToken(): Promise<void> {
    await fs.rm(this.googleCalendarRefreshTokenPath, { force: true });
  }

  private async readLegacyReminders(): Promise<AppData["reminders"]> {
    try {
      const raw = await fs.readFile(this.remindersLegacyPath, "utf8");
      const parsed = JSON.parse(raw.replace(/^\uFEFF/, ""));
      if (!Array.isArray(parsed.reminders)) return [];
      return parsed.reminders.map((reminder: any) => {
        const title = String(reminder.title || reminder.text || "").trim();
        return {
          id: String(reminder.id || crypto.randomUUID()),
          text: title,
          title,
          notes: String(reminder.notes || "").trim(),
          dueAt: String(reminder.dueAt || ""),
          completed: Boolean(reminder.completed),
          dismissed: Boolean(reminder.dismissed),
          notified: Boolean(reminder.notified),
          notifiedAt: reminder.notifiedAt || undefined,
          dismissedAt: reminder.dismissedAt || undefined,
          discordNotificationStatus: reminder.discordNotificationStatus || (reminder.notified ? "sent" : "pending"),
          discordNotificationSentAt: reminder.discordNotificationSentAt || reminder.notifiedAt || undefined,
          discordNotificationError: reminder.discordNotificationError || undefined,
          createdAt: reminder.createdAt || now(),
          updatedAt: reminder.updatedAt || now()
        };
      });
    } catch {
      return [];
    }
  }
}

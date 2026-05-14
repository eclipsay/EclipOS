import { contextBridge, ipcRenderer } from "electron";
import type { AiChatRequest, AiContextPreview, AiConversation, AiStatus, AiStorageRecommendation, AiStreamEvent, AppData, AppSettings, CodexPromptTemplate, CodexRunRequest, CodexSession, CommandItem, DiscordStatus, DiskBenchmarkResult, EntertainmentRecommendation, EntertainmentSnapshot, LightSystemSnapshot, MonitoringSettings, NoteItem, PerformanceDiagnostics, ReminderItem, StorageAnalysis, StorageScanOptions, StorageScanResult, StorageScanStatus, StorageScanTarget, StressTestOptions, StressTestSession, SystemSnapshot, SystemSnapshotOptions, UpdateCheckResult, WatchingModeStatus } from "../shared/types.js";

const api = {
  onOpenCommandPalette: (callback: () => void) => {
    ipcRenderer.on("open-command-palette", callback);
    return () => { ipcRenderer.removeListener("open-command-palette", callback); };
  },
  onCodexSession: (callback: (session: CodexSession) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, session: CodexSession) => callback(session);
    ipcRenderer.on("codex:session", listener);
    return () => { ipcRenderer.removeListener("codex:session", listener); };
  },
  onRemindersUpdated: (callback: (data: AppData) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, data: AppData) => callback(data);
    ipcRenderer.on("reminders:updated", listener);
    return () => { ipcRenderer.removeListener("reminders:updated", listener); };
  },
  onAiStream: (callback: (event: AiStreamEvent) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, streamEvent: AiStreamEvent) => callback(streamEvent);
    ipcRenderer.on("ai:stream", listener);
    return () => { ipcRenderer.removeListener("ai:stream", listener); };
  },
  onOverlaySettings: (callback: (settings: MonitoringSettings) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, settings: MonitoringSettings) => callback(settings);
    ipcRenderer.on("overlay:settings", listener);
    return () => { ipcRenderer.removeListener("overlay:settings", listener); };
  },
  data: {
    get: (): Promise<AppData> => ipcRenderer.invoke("data:get"),
    import: (data: AppData): Promise<AppData> => ipcRenderer.invoke("data:import", data),
    export: (): Promise<string> => ipcRenderer.invoke("data:export"),
    reset: (): Promise<AppData> => ipcRenderer.invoke("data:reset")
  },
  settings: {
    save: (settings: AppSettings, apiKey?: string): Promise<AppData> => ipcRenderer.invoke("settings:save", settings, apiKey)
  },
  updates: {
    check: (): Promise<UpdateCheckResult> => ipcRenderer.invoke("updates:check"),
    openDownload: (url?: string): Promise<boolean> => ipcRenderer.invoke("updates:openDownload", url)
  },
  ai: {
    status: (): Promise<AiStatus> => ipcRenderer.invoke("ai:status"),
    conversation: (): Promise<AiConversation> => ipcRenderer.invoke("ai:conversation"),
    saveKey: (apiKey: string): Promise<AiStatus> => ipcRenderer.invoke("ai:saveKey", apiKey),
    testKey: (apiKey?: string): Promise<boolean> => ipcRenderer.invoke("ai:testKey", apiKey),
    previewContext: (): Promise<AiContextPreview> => ipcRenderer.invoke("ai:previewContext"),
    send: (request: AiChatRequest): Promise<{ requestId: string }> => ipcRenderer.invoke("ai:send", request),
    cancel: (requestId: string): Promise<boolean> => ipcRenderer.invoke("ai:cancel", requestId),
    clearChat: (): Promise<AppData> => ipcRenderer.invoke("ai:clearChat"),
    exportChat: (): Promise<string> => ipcRenderer.invoke("ai:exportChat"),
    storageRecommendations: (): Promise<AiStorageRecommendation[]> => ipcRenderer.invoke("ai:storageRecommendations")
  },
  commands: {
    save: (command: CommandItem): Promise<AppData> => ipcRenderer.invoke("commands:save", command),
    delete: (id: string): Promise<AppData> => ipcRenderer.invoke("commands:delete", id),
    run: (id: string, allowDangerous?: boolean) => ipcRenderer.invoke("commands:run", id, allowDangerous)
  },
  files: {
    chooseFolders: (): Promise<string[]> => ipcRenderer.invoke("files:chooseFolders"),
    index: (folders: string[]): Promise<AppData> => ipcRenderer.invoke("files:index", folders),
    open: (path: string): Promise<string> => ipcRenderer.invoke("files:open", path),
    reveal: (path: string): Promise<void> => ipcRenderer.invoke("files:reveal", path)
  },
  folders: {
    openKnown: (kind: "app" | "data" | "logs"): Promise<string> => ipcRenderer.invoke("folders:openKnown", kind),
    selectProject: (): Promise<AppData> => ipcRenderer.invoke("folders:selectProject")
  },
  tools: {
    detectCodex: (): Promise<AppData> => ipcRenderer.invoke("tools:detectCodex"),
    selectCodex: (): Promise<AppData> => ipcRenderer.invoke("tools:selectCodex")
  },
  codex: {
    availability: () => ipcRenderer.invoke("codex:availability"),
    run: (request: CodexRunRequest): Promise<CodexSession> => ipcRenderer.invoke("codex:run", request),
    cancel: (id: string): Promise<CodexSession> => ipcRenderer.invoke("codex:cancel", id),
    saveTemplate: (template: CodexPromptTemplate): Promise<AppData> => ipcRenderer.invoke("codex:templateSave", template),
    deleteTemplate: (id: string): Promise<AppData> => ipcRenderer.invoke("codex:templateDelete", id)
  },
  projects: {
    select: (): Promise<AppData> => ipcRenderer.invoke("projects:select"),
    setManual: (path: string): Promise<AppData> => ipcRenderer.invoke("projects:setManual", path),
    pin: (path: string): Promise<AppData> => ipcRenderer.invoke("projects:pin", path),
    open: (): Promise<string> => ipcRenderer.invoke("projects:open"),
    openTerminal: (): Promise<void> => ipcRenderer.invoke("projects:openTerminal")
  },
  git: {
    status: (): Promise<string> => ipcRenderer.invoke("git:status"),
    changedFiles: (): Promise<string[]> => ipcRenderer.invoke("git:changedFiles"),
    isRepo: (): Promise<boolean> => ipcRenderer.invoke("git:isRepo"),
    revert: (): Promise<string> => ipcRenderer.invoke("git:revert")
  },
  notes: {
    save: (note: NoteItem): Promise<AppData> => ipcRenderer.invoke("notes:save", note),
    delete: (id: string): Promise<AppData> => ipcRenderer.invoke("notes:delete", id)
  },
  reminders: {
    save: (reminder: ReminderItem): Promise<AppData> => ipcRenderer.invoke("reminders:save", reminder),
    complete: (id: string): Promise<AppData> => ipcRenderer.invoke("reminders:complete", id),
    toggleComplete: (id: string): Promise<AppData> => ipcRenderer.invoke("reminders:toggleComplete", id),
    dismiss: (id: string): Promise<AppData> => ipcRenderer.invoke("reminders:dismiss", id),
    delete: (id: string): Promise<AppData> => ipcRenderer.invoke("reminders:delete", id),
    retryDiscord: (id: string): Promise<AppData> => ipcRenderer.invoke("reminders:retryDiscord", id),
    testNotification: (): Promise<boolean> => ipcRenderer.invoke("reminders:testNotification")
  },
  discord: {
    status: (): Promise<DiscordStatus> => ipcRenderer.invoke("discord:status"),
    saveToken: (token: string): Promise<DiscordStatus> => ipcRenderer.invoke("discord:saveToken", token),
    testDm: (token?: string): Promise<{ ok: boolean; error?: string; data: AppData }> => ipcRenderer.invoke("discord:testDm", token),
    sync: (): Promise<AppData> => ipcRenderer.invoke("discord:sync")
  },
  entertainment: {
    status: (): Promise<EntertainmentSnapshot> => ipcRenderer.invoke("entertainment:status"),
    recommendations: (): Promise<EntertainmentRecommendation[]> => ipcRenderer.invoke("entertainment:recommendations"),
    clear: (): Promise<AppData> => ipcRenderer.invoke("entertainment:clear"),
    watchingStatus: (): Promise<WatchingModeStatus> => ipcRenderer.invoke("entertainment:watchingStatus"),
    previewDimming: (): Promise<number[]> => ipcRenderer.invoke("entertainment:previewDimming")
  },
  clipboard: {
    copy: (text: string): Promise<void> => ipcRenderer.invoke("clipboard:copy", text),
    clear: (): Promise<AppData> => ipcRenderer.invoke("clipboard:clear"),
    togglePin: (id: string): Promise<AppData> => ipcRenderer.invoke("clipboard:togglePin", id)
  },
  system: {
    stats: () => ipcRenderer.invoke("system:stats"),
    lightSnapshot: (): Promise<LightSystemSnapshot> => ipcRenderer.invoke("system:lightSnapshot"),
    snapshot: (options?: SystemSnapshotOptions): Promise<SystemSnapshot> => ipcRenderer.invoke("system:snapshot", options),
    performanceDiagnostics: (): Promise<PerformanceDiagnostics> => ipcRenderer.invoke("system:performanceDiagnostics"),
    killProcess: (pid: number): Promise<boolean> => ipcRenderer.invoke("system:killProcess", pid),
    openProcessLocation: (pid: number): Promise<void> => ipcRenderer.invoke("system:openProcessLocation", pid),
    analyzeStorage: (root?: string): Promise<StorageAnalysis> => ipcRenderer.invoke("system:analyzeStorage", root),
    storageTargets: (): Promise<StorageScanTarget[]> => ipcRenderer.invoke("system:storageTargets"),
    startStorageScan: (options: StorageScanOptions): Promise<StorageScanResult> => ipcRenderer.invoke("system:storageScanStart", options),
    storageScanStatus: (): Promise<StorageScanStatus> => ipcRenderer.invoke("system:storageScanStatus"),
    cancelStorageScan: (): Promise<StorageScanResult | null> => ipcRenderer.invoke("system:storageScanCancel"),
    pauseStorageScan: (): Promise<StorageScanResult | null> => ipcRenderer.invoke("system:storageScanPause"),
    resumeStorageScan: (): Promise<StorageScanResult | null> => ipcRenderer.invoke("system:storageScanResume"),
    pinStorageLocation: (target: string): Promise<AppData> => ipcRenderer.invoke("system:storageLocationPin", target),
    exportStorageReport: (): Promise<string> => ipcRenderer.invoke("system:storageReportExport"),
    diskBenchmark: (): Promise<DiskBenchmarkResult> => ipcRenderer.invoke("system:diskBenchmark"),
    stressStart: (options: StressTestOptions): Promise<StressTestSession> => ipcRenderer.invoke("system:stressStart", options),
    stressStop: (): Promise<StressTestSession> => ipcRenderer.invoke("system:stressStop"),
    stressStatus: (): Promise<StressTestSession> => ipcRenderer.invoke("system:stressStatus"),
    stressExport: (): Promise<string> => ipcRenderer.invoke("system:stressExport")
  },
  overlay: {
    show: (): Promise<AppData> => ipcRenderer.invoke("overlay:show"),
    hide: (): Promise<AppData> => ipcRenderer.invoke("overlay:hide"),
    toggle: (): Promise<AppData> => ipcRenderer.invoke("overlay:toggle")
  },
};

console.info("[preload] NahkriinOS preload loaded");
contextBridge.exposeInMainWorld("assistant", api);

export type AssistantApi = typeof api;

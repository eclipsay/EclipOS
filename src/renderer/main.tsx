import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Battery,
  Bell,
  Bot,
  Bug,
  CalendarDays,
  CheckCircle2,
  CheckSquare,
  Clipboard,
  Command,
  Cpu,
  Download,
  Film,
  FileSearch,
  FileText,
  FolderOpen,
  Gamepad2,
  Gauge,
  GitBranch,
  HardDrive,
  Home,
  Info,
  LayoutDashboard,
  Lightbulb,
  Moon,
  Network,
  Notebook,
  Package,
  Play,
  Plus,
  RotateCcw,
  Save,
  Search,
  Settings,
  ShieldAlert,
  Sparkles,
  Star,
  Terminal,
  Thermometer,
  Timer,
  Trash2,
  Upload,
  Wand2,
  Wrench,
  Zap
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { AiChatMessage, AiContextPreview, AiStatus, AiStorageRecommendation, AppData, AppSettings, CodexAvailability, CodexPromptTemplate, CodexRunRequest, CodexSession, CommandItem, CommandKind, DiscordStatus, DiskBenchmarkResult, EntertainmentRecommendation, EntertainmentSnapshot, FileRecord, LightSystemSnapshot, MonitoringSettings, NoteItem, PerformanceDiagnostics, ProcessInfo, ReminderItem, StorageAnalysis, StorageScanItem, StorageScanResult, StorageScanTarget, StressTestKind, StressTestSession, SystemSnapshot, SystemStats, UpdateCheckResult, WatchingModeStatus } from "../shared/types";
import "highlight.js/styles/github-dark.css";
import "./styles.css";

const now = () => new Date().toISOString();
const uid = () => crypto.randomUUID();
console.info("[renderer] EclipOS renderer loaded");

const emptyData: AppData = {
  settings: {
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
    discord: {
      enabled: true,
      targetUserId: "140478632165507073",
      backendUrl: "",
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
        quickLaunch: true,
        recentFiles: true
      }
    },
    calendar: {
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
        { pattern: "vlc|plex|jellyfin", profile: "watching", enabled: true }
      ]
    },
    ai: {
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
    }
  },
  commands: [],
  notes: [],
  reminders: [],
  tasks: [],
  calendarEvents: [],
  clipboard: [],
  fileIndex: [],
  codexTemplates: [],
  codexSessions: [],
  projects: [],
  aiConversation: { messages: [], updatedAt: now() },
  storageScanLocations: [],
  stressTestHistory: [],
  entertainmentActivities: [],
  entertainmentRecommendations: []
};

const nav = [
  ["dashboard", Home, "Home"],
  ["entertainment", Gamepad2, "Entertainment"],
  ["assistant", Sparkles, "Assistant"],
  ["search", Search, "Search"],
  ["clipboard", Clipboard, "Clipboard"],
  ["reminders", Bell, "Reminders"],
  ["planner", CalendarDays, "Planner"],
  ["notes", Notebook, "Notes"],
  ["files", FileSearch, "Files"],
  ["focus", Timer, "Focus"],
  ["workspaces", LayoutDashboard, "Workspaces"],
  ["system", Activity, "System"],
  ["updates", Download, "Updates"],
  ["settings", Settings, "Settings"]
] as const;

function formatBytes(value: number) {
  if (!value) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  return `${(value / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function datetimeInputValue(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function reminderTitle(reminder: ReminderItem) {
  return reminder.title || reminder.text || "Reminder";
}

function reminderDueDate(reminder: ReminderItem) {
  const date = new Date(reminder.dueAt);
  return Number.isFinite(date.getTime()) ? date : null;
}

function reminderStatus(reminder: ReminderItem) {
  if (reminder.completed) return "completed";
  if (reminder.dismissed) return "dismissed";
  if (reminder.notified || reminder.notifiedAt) return "notified";
  const due = reminderDueDate(reminder);
  if (!due) return "invalid";
  const diff = due.getTime() - Date.now();
  if (diff < 0) return "overdue";
  if (diff <= 60 * 60_000) return "due soon";
  return "upcoming";
}

function reminderDueLabel(reminder: ReminderItem) {
  const due = reminderDueDate(reminder);
  return due ? `${formatDistanceToNow(due, { addSuffix: true })} - ${reminderStatus(reminder)}` : "Invalid date";
}

function nextReminders(reminders: ReminderItem[], limit = 6) {
  return [...reminders]
    .filter((reminder) => !reminder.completed && !reminder.dismissed)
    .sort((a, b) => (reminderDueDate(a)?.getTime() ?? Number.MAX_SAFE_INTEGER) - (reminderDueDate(b)?.getTime() ?? Number.MAX_SAFE_INTEGER))
    .slice(0, limit);
}

function nextTasks(tasks: any[], limit = 6) {
  return [...(tasks ?? [])]
    .filter((task) => !task.completed)
    .sort((a, b) => (a.dueAt || "").localeCompare(b.dueAt || "") || a.createdAt.localeCompare(b.createdAt))
    .slice(0, limit);
}

function upcomingEvents(events: any[], limit = 6) {
  return [...(events ?? [])]
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
    .filter((event) => new Date(event.endAt || event.startAt).getTime() >= Date.now() - 60 * 60_000)
    .slice(0, limit);
}

function eventDateLabel(event: any) {
  const start = new Date(event.startAt);
  const end = new Date(event.endAt || event.startAt);
  if (!Number.isFinite(start.getTime())) return "Invalid date";
  return `${start.toLocaleString()}${Number.isFinite(end.getTime()) ? ` - ${end.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : ""}`;
}

function plannerEventFromReminder(reminder: ReminderItem) {
  const due = reminderDueDate(reminder) ?? new Date(Date.now() + 60 * 60_000);
  return {
    id: `reminder-${reminder.id}`,
    title: reminderTitle(reminder),
    notes: reminder.notes || "",
    location: "",
    startAt: due.toISOString(),
    endAt: new Date(due.getTime() + 30 * 60_000).toISOString(),
    allDay: false,
    source: "reminder",
    reminderId: reminder.id,
    createdAt: reminder.createdAt,
    updatedAt: reminder.updatedAt
  };
}

function App() {
  const [data, setData] = useState<AppData>(emptyData);
  const [view, setView] = useState("dashboard");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [railCollapsed, setRailCollapsed] = useState(false);
  const [query, setQuery] = useState("");
  const [system, setSystem] = useState<SystemStats | null>(null);
  const [snapshot, setSnapshot] = useState<SystemSnapshot | null>(null);
  const [output, setOutput] = useState("Command output appears here.");
  const [error, setError] = useState("");
  const [update, setUpdate] = useState<UpdateCheckResult | null>(null);

  async function refresh() {
    setData(await window.assistant.data.get());
  }

  useEffect(() => {
    refresh().catch((err) => setError(String(err)));
    const stopCommandPalette = window.assistant.onOpenCommandPalette(() => setPaletteOpen(true));
    const stopReminders = window.assistant.onRemindersUpdated(setData);
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    const tick = () => {
      if (document.hidden && data.settings.monitoring.pauseWhenMinimized) return;
      return window.assistant.system.snapshot({
        includeProcesses: false,
        includeStartup: false,
        includeSpecs: false,
        writeHistory: view === "system"
      }).then((next) => {
      setSnapshot(next);
      setSystem({
        cpuUsage: next.cpu.usage,
        ramUsed: next.ram.used,
        ramTotal: next.ram.total,
        uptime: next.uptime,
        disks: next.disks.map((disk) => ({ name: disk.name, used: disk.used, total: disk.total })),
        networks: next.network.adapters,
        processes: next.processes.slice(0, 12).map((item) => ({ pid: item.pid, name: item.name, cpu: item.cpu, memory: item.memory }))
      });
    }).catch(() => window.assistant.system.stats().then(setSystem).catch(() => undefined));
    };
    tick();
    const intervalMs = data.settings.monitoring.lowPowerMode
      ? Math.max(5000, data.settings.monitoring.refreshMs || 3000)
      : Math.max(2000, data.settings.monitoring.refreshMs || 3000);
    const timer = setInterval(tick, intervalMs);
    return () => {
      stopCommandPalette();
      stopReminders();
      window.removeEventListener("keydown", onKey);
      clearInterval(timer);
    };
  }, [data.settings.monitoring.refreshMs, data.settings.monitoring.lowPowerMode, data.settings.monitoring.pauseWhenMinimized, view]);

  useEffect(() => {
    document.documentElement.dataset.theme = data.settings.theme;
    document.documentElement.style.setProperty("--accent", data.settings.accent);
  }, [data.settings]);

  useEffect(() => {
    if (!data.settings.updates.enabled || !data.settings.updates.checkOnStartup || !data.settings.updates.feedUrl.trim()) return;
    window.assistant.updates.check().then((result) => {
      if (result.available) setUpdate(result);
    }).catch(() => undefined);
  }, [data.settings.updates.enabled, data.settings.updates.checkOnStartup, data.settings.updates.feedUrl]);

  async function runCommand(command: CommandItem) {
    setError("");
    const needsConfirm = command.dangerous || /Remove-Item|rm\s+-rf|del\s+\/|shutdown|format/i.test(command.value);
    if (needsConfirm && !confirm(`Run dangerous command "${command.name}"?`)) return;
    try {
      const result = await window.assistant.commands.run(command.id, needsConfirm);
      setOutput([result.stdout, result.stderr].filter(Boolean).join("\n") || `Exited with ${result.code}`);
      await refresh();
      setPaletteOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  const recentCommands = [...data.commands].sort((a, b) => (b.lastRunAt ?? "").localeCompare(a.lastRunAt ?? "")).slice(0, 6);
  const pinnedNotes = data.notes.filter((note) => note.pinned).slice(0, 4);

  return (
    <div className={`app-shell ${railCollapsed ? "rail-collapsed" : ""}`}>
      <aside className="sidebar">
<div className="brand"><Sparkles size={20} /> EclipOS</div>
        <nav>
          {nav.map(([id, Icon, label]) => (
            <button key={id} className={view === id ? "active" : ""} onClick={() => setView(id)}>
              <Icon size={18} /> {label}
            </button>
          ))}
        </nav>
        <button className="palette-trigger" onClick={() => setPaletteOpen(true)}><Search size={16} /> Universal search</button>
      </aside>

      <main className="workspace">
        <header className="topbar">
<button className="command-input" onClick={() => setPaletteOpen(true)}><Search size={17} /> Search EclipOS...</button>
          <div className="topbar-actions">
            {data.settings.home?.showTodayRail !== false && <button className="rail-toggle" onClick={() => setRailCollapsed((value) => !value)}>{railCollapsed ? "Open sidebar" : "Collapse sidebar"}</button>}
            <div className="status-pill"><Moon size={15} /> {data.settings.theme} mode</div>
          </div>
        </header>
        {error && <div className="error">{error}</div>}
{update?.available && update.latest && <div className="update-banner"><div><strong>EclipOS {update.latest.version} is available</strong><span>{update.latest.releaseNotes || "A newer Windows build is ready to download."}</span></div><button onClick={() => window.assistant.updates.openDownload(update.latest?.downloadUrl)}><Download size={16} /> Download</button><button onClick={() => setUpdate(null)}>Later</button></div>}
        {view === "dashboard" && <DashboardHome data={data} system={system} snapshot={snapshot} recentCommands={recentCommands} pinnedNotes={pinnedNotes} runCommand={runCommand} setView={setView} setData={setData} />}
        {view === "assistant" && <PcAssistant snapshot={snapshot} setView={setView} />}
        {view === "search" && <SearchHub data={data} runCommand={runCommand} setView={setView} />}
        {view === "files" && <Files data={data} setData={setData} />}
        {view === "clipboard" && <ClipboardView data={data} setData={setData} />}
        {view === "reminders" && <RemindersView data={data} setData={setData} />}
        {view === "planner" && <PlannerView data={data} setData={setData} />}
        {view === "notes" && <Notes data={data} setData={setData} />}
        {view === "focus" && <FocusView data={data} setData={setData} />}
        {view === "entertainment" && <EntertainmentView data={data} setData={setData} />}
        {view === "workspaces" && <WorkspacesView data={data} setData={setData} />}
        {view === "system" && <SystemCenter snapshot={snapshot} settings={data.settings} data={data} setData={setData} />}
        {view === "updates" && <UpdatesView data={data} setData={setData} />}
        {view === "settings" && <SettingsView data={data} setData={setData} />}
      </main>

      {data.settings.home?.showTodayRail !== false && <aside className={`agent-rail ${railCollapsed ? "collapsed" : ""}`}><TodayRailCustom data={data} system={system} setView={setView} collapsed={railCollapsed} setCollapsed={setRailCollapsed} /></aside>}
      {paletteOpen && <CommandPalette data={data} query={query} setQuery={setQuery} close={() => setPaletteOpen(false)} runCommand={runCommand} setView={setView} />}
    </div>
  );
}

function Dashboard({ data, system, snapshot, recentCommands, pinnedNotes, runCommand, setView }: {
  data: AppData; system: SystemStats | null; snapshot: SystemSnapshot | null; recentCommands: CommandItem[]; pinnedNotes: NoteItem[];
  runCommand: (command: CommandItem) => void; setView: (view: string) => void;
}) {
  const ramPercent = snapshot ? Math.round((snapshot.ram.used / snapshot.ram.total) * 100) : 0;
  return (
    <section className="page dashboard">
      <div className="hero-row">
        <div>
<h1>Good day. EclipOS is ready when you are.</h1>
          <p>Your notes, clipboard, files, focus tools, workspaces, and Codex helper live in one calm place.</p>
        </div>
        <div className="quick-actions">
          <button onClick={() => setView("assistant")}><Sparkles size={16} /> Ask assistant</button>
          <button onClick={() => setView("search")}><Search size={16} /> Find anything</button>
          <button onClick={() => setView("focus")}><Timer size={16} /> Start focus</button>
          <button onClick={() => setView("notes")}><Notebook size={16} /> Quick note</button>
          <button onClick={() => setView("system")}><Activity size={16} /> PC health</button>
        </div>
      </div>
      <div className="stat-grid">
        <Stat title="Focus" value="25 min" />
        <Stat title="PC health" value={snapshot ? `${snapshot.healthScore}%` : "Loading"} />
        <Stat title="Memory" value={snapshot ? `${ramPercent}% RAM` : `${data.clipboard.length} clips`} />
        <Stat title="Network" value={snapshot ? `${formatBytes(snapshot.network.rxBps)}/s down` : `${system?.cpuUsage ?? 0}% CPU`} />
      </div>
      {!data.settings.defaultWorkingDirectory && (
<Panel title="Welcome to EclipOS">
          <div className="onboarding-steps">
            <span>1. Choose a theme in Settings</span>
            <span>2. Add favorite folders or projects</span>
            <span>3. Optionally connect Codex</span>
            <span>4. Start from Home each day</span>
          </div>
          <div className="quick-actions"><button onClick={() => setView("workspaces")}><FolderOpen size={16} /> Add workspace</button><button onClick={() => setView("settings")}><Settings size={16} /> Choose theme</button></div>
        </Panel>
      )}
      <div className="columns">
        <Panel title="Pinned Notes">{pinnedNotes.length ? pinnedNotes.map((note) => <Row key={note.id} title={note.title} meta={note.tags.join(", ") || "Pinned note"} />) : <Empty text="Pin a note and it will stay close at hand." />}</Panel>
<Panel title="Reminders">{nextReminders(data.reminders, 5).map((reminder) => <Row key={reminder.id} title={reminder.title || reminder.text} meta={reminderDueLabel(reminder)} action={<button onClick={() => setView("reminders")}><Bell size={15} /></button>} />)} {!nextReminders(data.reminders, 5).length && <Empty text="Add a reminder and EclipOS will keep it nearby." />}</Panel>
<Panel title="Recent Clipboard">{data.clipboard.slice(0, 5).map((item) => <Row key={item.id} title={item.text.slice(0, 80)} meta={formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })} action={<button onClick={() => window.assistant.clipboard.copy(item.text)}><Clipboard size={15} /></button>} />)} {!data.clipboard.length && <Empty text="Copy text anywhere and EclipOS will remember useful snippets." />}</Panel>
      </div>
      <div className="columns">
        <Panel title="Codex Dev Agent">{data.codexSessions.slice(0, 3).map((session) => <Row key={session.id} title={session.title} meta={`${session.status} · ${session.projectFolder}`} />)} {!data.codexSessions.length && <Empty text="Codex is ready when you need help with a project." />}<button onClick={() => setView("codex")}><Bot size={16} /> Open Codex</button></Panel>
        <Panel title="Quick Launch">{recentCommands.length ? recentCommands.slice(0, 4).map((command) => <Row key={command.id} title={command.name} meta={command.kind} action={<button onClick={() => runCommand(command)}><Play size={15} /></button>} />) : <Empty text="Add websites, folders, apps, or scripts to launch them instantly." />}</Panel>
        <Panel title="Recent Files">{data.fileIndex.slice(0, 4).map((file) => <Row key={file.id} title={file.name} meta={file.path} action={<button onClick={() => window.assistant.files.open(file.path)}><FolderOpen size={15} /></button>} />)} {!data.fileIndex.length && <Empty text="Index a folder to make file search useful." />}</Panel>
      </div>
    </section>
  );
}

function TodayRail({ data, system, setView }: { data: AppData; system: SystemStats | null; setView: (view: string) => void }) {
  return (
    <section className="today-rail">
      <div>
        <h2>Today</h2>
        <p>A quieter place for the things you touch often.</p>
      </div>
      <Panel title="Next Focus">
        <div className="focus-ring">25</div>
        <button onClick={() => setView("focus")}><Timer size={16} /> Start timer</button>
      </Panel>
      <Panel title="Tiny Status">
        <Row title="CPU" meta={`${system?.cpuUsage ?? 0}%`} />
        <Row title="Memory" meta={system ? `${formatBytes(system.ramUsed)} used` : "Loading"} />
      </Panel>
      <Panel title="Reminders">
        {nextReminders(data.reminders, 3).map((reminder) => <Row key={reminder.id} title={reminderTitle(reminder)} meta={reminderDueLabel(reminder)} />)}
        {!nextReminders(data.reminders, 3).length && <Empty text="Nothing due soon." />}
        <button onClick={() => setView("reminders")}><Bell size={16} /> Open reminders</button>
      </Panel>
      <Panel title="Codex">
        <Row title={data.settings.defaultWorkingDirectory ? "Project selected" : "No project yet"} meta={data.settings.defaultWorkingDirectory || "Choose a workspace when needed"} />
        <button onClick={() => setView("codex")}><Bot size={16} /> Open Codex</button>
      </Panel>
    </section>
  );
}

function DashboardHome({ data, system, snapshot, recentCommands, pinnedNotes, runCommand, setView, setData }: {
  data: AppData; system: SystemStats | null; snapshot: SystemSnapshot | null; recentCommands: CommandItem[]; pinnedNotes: NoteItem[];
  runCommand: (command: CommandItem) => void; setView: (view: string) => void; setData: (data: AppData) => void;
}) {
  const ramPercent = snapshot ? Math.round((snapshot.ram.used / snapshot.ram.total) * 100) : 0;
  const widgets = data.settings.home?.widgets ?? {};
  const tasks = nextTasks(data.tasks ?? [], 5);
  const events = upcomingEvents(data.calendarEvents ?? [], 4);
  const reminderCount = nextReminders(data.reminders, 6).length;
  async function saveHomeSettings(nextHome: any) {
    setData(await window.assistant.settings.save({ ...data.settings, home: nextHome }));
  }
  return (
    <section className={`page dashboard ${data.settings.home?.compact ? "compact-home" : ""}`}>
      <div className="hero-row">
        <div className="hero-copy">
          <h1>Good day. EclipOS is ready when you are.</h1>
          <p>Your notes, planner, reminders, files, focus tools, and workspaces stay in one calm place.</p>
        </div>
        <div className="quick-actions">
          <button onClick={() => setView("assistant")}><Sparkles size={16} /> Ask assistant</button>
          <button onClick={() => setView("planner")}><CalendarDays size={16} /> Planner</button>
          <button onClick={() => setView("search")}><Search size={16} /> Find anything</button>
          <button onClick={() => setView("focus")}><Timer size={16} /> Start focus</button>
          <button onClick={() => setView("system")}><Activity size={16} /> PC health</button>
        </div>
      </div>
      <div className="stat-grid">
        <Stat title="Focus" value="25 min" />
        <Stat title="PC health" value={snapshot ? `${snapshot.healthScore}%` : "Loading"} />
        <Stat title="Memory" value={snapshot ? `${ramPercent}% RAM` : `${data.clipboard.length} clips`} />
        <Stat title="Tasks" value={`${(data.tasks ?? []).filter((task: any) => !task.completed).length} open`} />
        <Stat title="Reminders" value={`${reminderCount} active`} />
        <Stat title="Calendar" value={`${events.length} upcoming`} />
      </div>
      {!data.settings.defaultWorkingDirectory && (
        <Panel title="Welcome to EclipOS">
          <div className="welcome-panel">
            <p>Start simple. Add a workspace, connect Google Calendar, and keep reminders close to your planner.</p>
            <div className="onboarding-steps">
              <span>Choose a theme</span>
              <span>Add a workspace</span>
              <span>Connect calendar</span>
              <span>Use Home daily</span>
            </div>
            <div className="quick-actions"><button onClick={() => setView("workspaces")}><FolderOpen size={16} /> Add workspace</button><button onClick={() => setView("settings")}><Settings size={16} /> Customize Home</button></div>
          </div>
        </Panel>
      )}
      <div className="home-grid">
        {widgets.pinnedNotes !== false && <Panel title="Pinned Notes">{pinnedNotes.length ? pinnedNotes.map((note) => <Row key={note.id} title={note.title} meta={note.tags.join(", ") || "Pinned note"} />) : <Empty text="Pin a note and it will stay close at hand." />}</Panel>}
        {widgets.reminders !== false && <Panel title="Reminders">{nextReminders(data.reminders, 5).map((reminder) => <Row key={reminder.id} title={reminder.title || reminder.text} meta={reminderDueLabel(reminder)} action={<button onClick={() => setView("reminders")}><Bell size={15} /></button>} />)} {!nextReminders(data.reminders, 5).length && <Empty text="Add a reminder and EclipOS will keep it nearby." />}</Panel>}
        {widgets.tasks !== false && <Panel title="Tasks">{tasks.map((task) => <Row key={task.id} title={task.title} meta={task.dueAt ? `Due ${new Date(task.dueAt).toLocaleString()}` : "No due date"} action={<button onClick={async () => setData(await window.assistant.tasks.toggleComplete(task.id))}><CheckCircle2 size={15} /></button>} />)} {!tasks.length && <Empty text="Add a task from Planner or ask the assistant to track one." />}</Panel>}
        {widgets.calendar !== false && <Panel title="Calendar">{events.map((event) => <Row key={event.id} title={event.title} meta={eventDateLabel(event)} action={<button onClick={() => setView("planner")}><CalendarDays size={15} /></button>} />)} {!events.length && <Empty text="Upcoming events will appear here." />}</Panel>}
        {widgets.clipboard !== false && <Panel title="Recent Clipboard">{data.clipboard.slice(0, 5).map((item) => <Row key={item.id} title={item.text.slice(0, 80)} meta={formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })} action={<button onClick={() => window.assistant.clipboard.copy(item.text)}><Clipboard size={15} /></button>} />)} {!data.clipboard.length && <Empty text="Copy text anywhere and EclipOS will remember useful snippets." />}</Panel>}
      </div>
      <div className="home-grid">
        {widgets.quickLaunch !== false && <Panel title="Quick Launch">{recentCommands.length ? recentCommands.slice(0, 4).map((command) => <Row key={command.id} title={command.name} meta={command.kind} action={<button onClick={() => runCommand(command)}><Play size={15} /></button>} />) : <Empty text="Add websites, folders, apps, or scripts to launch them instantly." />}</Panel>}
        {widgets.recentFiles !== false && <Panel title="Recent Files">{data.fileIndex.slice(0, 4).map((file) => <Row key={file.id} title={file.name} meta={file.path} action={<button onClick={() => window.assistant.files.open(file.path)}><FolderOpen size={15} /></button>} />)} {!data.fileIndex.length && <Empty text="Index a folder to make file search useful." />}</Panel>}
        <Panel title="Customize Home">
          <div className="form">
            <label><input type="checkbox" checked={data.settings.home?.compact !== false} onChange={(e) => saveHomeSettings({ ...(data.settings.home ?? {}), compact: e.target.checked, widgets })} /> Compact Home mode</label>
            <label><input type="checkbox" checked={data.settings.home?.showTodayRail !== false} onChange={(e) => saveHomeSettings({ ...(data.settings.home ?? {}), showTodayRail: e.target.checked, widgets })} /> Show Today rail</label>
            {Object.entries(widgets).filter(([key]) => key !== "codex").map(([key, value]) => <label key={key}><input type="checkbox" checked={Boolean(value)} onChange={(e) => saveHomeSettings({ ...(data.settings.home ?? {}), widgets: { ...widgets, [key]: e.target.checked } })} /> {key}</label>)}
          </div>
        </Panel>
      </div>
    </section>
  );
}

function TodayRailCustom({ data, system, setView, collapsed, setCollapsed }: { data: AppData; system: SystemStats | null; setView: (view: string) => void; collapsed: boolean; setCollapsed: React.Dispatch<React.SetStateAction<boolean>> }) {
  return (
    <section className="today-rail">
      <div className="rail-header">
        <h2>Today</h2>
        <button className="rail-toggle mini" onClick={() => setCollapsed((value) => !value)}>{collapsed ? "Open" : "Hide"}</button>
      </div>
      {!collapsed && <p>A quieter place for the things you touch often.</p>}
      {collapsed ? <div className="collapsed-rail-actions"><button onClick={() => setView("reminders")}><Bell size={16} /></button><button onClick={() => setView("planner")}><CalendarDays size={16} /></button><button onClick={() => setView("assistant")}><Sparkles size={16} /></button></div> : <>
      <Panel title="Next Focus">
        <div className="focus-ring">25</div>
        <button onClick={() => setView("focus")}><Timer size={16} /> Start timer</button>
      </Panel>
      <Panel title="Tiny Status">
        <Row title="CPU" meta={`${system?.cpuUsage ?? 0}%`} />
        <Row title="Memory" meta={system ? `${formatBytes(system.ramUsed)} used` : "Loading"} />
      </Panel>
      <Panel title="Reminders">
        {nextReminders(data.reminders, 3).map((reminder) => <Row key={reminder.id} title={reminderTitle(reminder)} meta={reminderDueLabel(reminder)} />)}
        {!nextReminders(data.reminders, 3).length && <Empty text="Nothing due soon." />}
        <button onClick={() => setView("reminders")}><Bell size={16} /> Open reminders</button>
      </Panel>
      <Panel title="Tasks">
        {nextTasks(data.tasks ?? [], 3).map((task) => <Row key={task.id} title={task.title} meta={task.dueAt ? new Date(task.dueAt).toLocaleString() : "No due date"} />)}
        {!nextTasks(data.tasks ?? [], 3).length && <Empty text="No open tasks." />}
        <button onClick={() => setView("planner")}><CheckSquare size={16} /> Open planner</button>
      </Panel>
      <Panel title="Calendar">
        {upcomingEvents(data.calendarEvents ?? [], 2).map((event) => <Row key={event.id} title={event.title} meta={eventDateLabel(event)} />)}
        {!upcomingEvents(data.calendarEvents ?? [], 2).length && <Empty text="No upcoming events." />}
      </Panel>
      </>}
    </section>
  );
}

function PcAssistant({ snapshot, setView }: { snapshot: SystemSnapshot | null; setView: (view: string) => void }) {
  const [mode, setMode] = useState<"simple" | "advanced">("simple");
  const [input, setInput] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [activeRequest, setActiveRequest] = useState("");
  const [draftAssistant, setDraftAssistant] = useState("");
  const [sources, setSources] = useState<string[]>([]);
  const [preview, setPreview] = useState<AiContextPreview | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    window.assistant.ai.status().then(setStatus).catch((err: unknown) => setError(String(err)));
    window.assistant.ai.conversation().then((chat) => setMessages(chat.messages)).catch(() => undefined);
    const stop = window.assistant.onAiStream((event) => {
      if (event.kind === "start") {
        setActiveRequest(event.requestId);
        setDraftAssistant("");
        setError("");
      }
      if (event.kind === "sources") setSources(event.sources ?? []);
      if (event.kind === "delta") setDraftAssistant((text) => text + (event.delta ?? ""));
      if (event.kind === "done") {
        if (event.message) setMessages((rows) => [...rows.filter((row) => row.id !== event.message?.id), event.message!]);
        setDraftAssistant("");
        setActiveRequest("");
      }
      if (event.kind === "error") {
        setError(event.error ?? "The AI response failed.");
        if (event.message) setMessages((rows) => [...rows, event.message!]);
        setDraftAssistant("");
        setActiveRequest("");
      }
    });
    return stop;
  }, []);

  const promptChips = ["Plan my day", "Draft a message", "Set a reminder for tomorrow", "Explain high RAM usage", "Analyze storage"];

  async function saveKey(test = false) {
    try {
      setError("");
      const next = await window.assistant.ai.saveKey(apiKey);
      setStatus(next);
      if (test) await window.assistant.ai.testKey(apiKey);
      setApiKey("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function ask(question: string) {
    if (!status?.configured) {
      setError("Add an OpenAI API key before using the assistant.");
      return;
    }
    const userMessage: AiChatMessage = { id: uid(), role: "user", content: question, createdAt: now() };
    setMessages((rows) => [...rows, userMessage]);
    setInput("");
    setPreview(null);
    try {
      await window.assistant.ai.send({ message: question, mode });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  function regenerate(message: AiChatMessage) {
    const index = messages.findIndex((row) => row.id === message.id);
    const previousUser = messages.slice(0, index).reverse().find((row) => row.role === "user");
    if (previousUser) void ask(`Regenerate your previous answer for this question, with clearer Markdown formatting:\n\n${previousUser.content}`);
  }

  function summarizeShorter(message: AiChatMessage) {
    void ask(`Summarize this answer shorter. Keep headings, bullets, risk level, and data used:\n\n${message.content}`);
  }

  async function clearChat() {
    const next = await window.assistant.ai.clearChat();
    setMessages(next.aiConversation.messages);
  }

  async function showPreview() {
    setPreview(await window.assistant.ai.previewContext());
  }

  return (
    <section className="page assistant-page">
      <div className="hero-row">
        <div>
          <h1>AI Assistant</h1>
          <p>General chat, writing help, planning, and PC-aware answers when you need them.</p>
        </div>
        <div className="quick-actions">
          <button onClick={() => setMode(mode === "simple" ? "advanced" : "simple")}><Info size={16} /> {mode === "simple" ? "Simple" : "Advanced"} mode</button>
          <button onClick={showPreview}><ShieldAlert size={16} /> Preview context</button>
          {activeRequest && <button className="danger" onClick={() => window.assistant.ai.cancel(activeRequest)}><RotateCcw size={16} /> Stop</button>}
        </div>
      </div>

      {!status?.configured && (
        <Panel title="Connect OpenAI">
          <div className="form">
<p>The assistant uses the OpenAI API for real answers. EclipOS will not generate fake canned AI responses without a key.</p>
            <input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="OpenAI API key" />
            <div className="quick-actions">
              <button onClick={() => saveKey(false)} disabled={!apiKey.trim()}><Save size={16} /> Save key</button>
              <button onClick={() => saveKey(true)} disabled={!apiKey.trim()}><CheckCircle2 size={16} /> Save and test</button>
            </div>
            <small>Keys are stored by the main process using the Windows credential-protected Electron safe storage layer when available. The key is never shown again or logged.</small>
          </div>
        </Panel>
      )}

      {error && <div className="error">{error}</div>}
      {status && <div className="source-chips"><span>{status.configured ? "OpenAI connected" : "OpenAI not configured"}</span><span>{status.secureStorage ? "OS secure storage available" : "Secure storage unavailable"}</span><span>{status.model}</span></div>}
      {preview && <Panel title="Context Preview"><pre className="mini-pre">{JSON.stringify(preview, null, 2)}</pre></Panel>}

      <div className="assistant-grid">
        <Panel title="Conversation">
          <div className="suggestion-chips">{promptChips.map((prompt) => <button key={prompt} onClick={() => ask(prompt)}>{prompt}</button>)}</div>
          <div className="assistant-chat compact-chat">
            {!messages.length && <Empty text="Ask anything you want. EclipOS can also use local PC context for diagnostics, storage cleanup, reminders, and system questions." />}
            {messages.map((message) => <AssistantBubble key={message.id} message={message} onRegenerate={regenerate} onSummarize={summarizeShorter} />)}
            {draftAssistant && <AssistantBubble message={{ id: "draft", role: "assistant", content: draftAssistant, createdAt: now(), sources }} streaming />}
          </div>
          {activeRequest && <small>Thinking...</small>}
          <div className="assistant-input"><input value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => event.key === "Enter" && input.trim() && ask(input.trim())} placeholder="Ask anything..." disabled={!status?.configured || !!activeRequest} /><button onClick={() => input.trim() && ask(input.trim())} disabled={!status?.configured || !!activeRequest}><Sparkles size={16} /> Ask</button></div>
          <div className="quick-actions compact-actions"><button onClick={clearChat}>Clear</button><button onClick={async () => setError(`Exported chat: ${await window.assistant.ai.exportChat()}`)}>Export</button></div>
        </Panel>

        <div className="assistant-side">
          <Panel title="Live PC Context">
            {snapshot ? <>
              <Row title="PC health" meta={`${snapshot.healthLabel} · ${snapshot.healthScore}/100`} />
              <Row title="CPU" meta={`${snapshot.cpu.usage}%${snapshot.cpu.temperature ? ` · ${snapshot.cpu.temperature}C` : ""}`} />
              <Row title="Memory" meta={`${Math.round((snapshot.ram.used / snapshot.ram.total) * 100)}% used · ${formatBytes(snapshot.ram.used)} of ${formatBytes(snapshot.ram.total)}`} />
              <Row title="Startup apps" meta={`${snapshot.startup.length} visible entries`} />
            </> : <Empty text="Live diagnostics are loading." />}
          </Panel>
          <Panel title="Storage AI">
            <p>Storage recommendations are generated by OpenAI from the latest Storage Scanner cache, with Windows protected locations excluded by default.</p>
            <button onClick={() => ask("Analyze my latest storage scan and explain what is safe to review.")}><HardDrive size={16} /> Analyze storage</button>
            <button onClick={() => setView("system")}><FolderOpen size={16} /> Open Storage Scanner</button>
          </Panel>
        </div>
      </div>
    </section>
  );
}

function AssistantBubble({ message, streaming = false, onRegenerate, onSummarize }: { message: AiChatMessage; streaming?: boolean; onRegenerate?: (message: AiChatMessage) => void; onSummarize?: (message: AiChatMessage) => void }) {
  return <div className={`assistant-bubble ${message.role} ${message.error ? "error-bubble" : ""}`}>
    <MarkdownMessage content={message.content} />
    {message.sources?.length ? <div className="assistant-actions source-row">{message.sources.map((source) => <span key={source}>{source}</span>)}</div> : null}
    {message.role === "assistant" && !streaming ? <div className="message-tools compact-actions"><button onClick={() => window.assistant.clipboard.copy(message.content)}>Copy</button><button onClick={() => onRegenerate?.(message)}>Redo</button><button onClick={() => onSummarize?.(message)}>Shorten</button></div> : null}
  </div>;
}

function MarkdownMessage({ content }: { content: string }) {
  return <div className="markdown-body">
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      components={{
        a: ({ href, children }) => <a href={href} target="_blank" rel="noreferrer">{children}</a>,
        blockquote: ({ children }) => <blockquote className={classifyCallout(children)}>{children}</blockquote>,
        table: ({ children }) => <div className="table-wrap"><table>{children}</table></div>,
        pre: ({ children }) => <>{children}</>,
        code: ({ className, children, ...props }: any) => {
          const text = String(children ?? "").replace(/\n$/, "");
          const isInline = !className;
          if (isInline) return <code className="inline-code" {...props}>{children}</code>;
          return <div className="code-shell"><button onClick={() => window.assistant.clipboard.copy(text)}>Copy</button><pre><code className={className} {...props}>{children}</code></pre></div>;
        }
      }}
    >{content}</ReactMarkdown>
  </div>;
}

function classifyCallout(children: React.ReactNode) {
  const text = reactText(children).toLowerCase();
  if (text.includes("warning") || text.includes("risk") || text.includes("careful")) return "callout warning";
  if (text.includes("safe") || text.includes("recommend")) return "callout recommendation";
  return "callout";
}

function reactText(node: React.ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(reactText).join(" ");
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) return reactText(node.props.children);
  return "";
}

function RecommendationCard({ item }: { item: AiStorageRecommendation }) {
  return <div className={`insight-card ${item.priority}`}><span>{item.category}</span><strong>{item.title}</strong><p>{item.explanation}</p><small>{formatBytes(item.estimatedReclaimableBytes)} estimated · {item.risk}</small>{item.sourcePaths.length ? <div className="assistant-actions">{item.sourcePaths.slice(0, 3).map((source) => <span key={source}>{source}</span>)}</div> : null}</div>;
}

function SearchHub({ data, runCommand, setView }: { data: AppData; runCommand: (command: CommandItem) => void; setView: (view: string) => void }) {
  const [q, setQ] = useState("");
  const needle = q.toLowerCase();
  const commands = data.commands.filter((item) => `${item.name} ${item.value}`.toLowerCase().includes(needle)).slice(0, 5);
  const notes = data.notes.filter((item) => `${item.title} ${item.body}`.toLowerCase().includes(needle)).slice(0, 5);
  const files = data.fileIndex.filter((item) => `${item.name} ${item.path}`.toLowerCase().includes(needle)).slice(0, 5);
  const clips = data.clipboard.filter((item) => item.text.toLowerCase().includes(needle)).slice(0, 5);
  return (
    <section className="page">
      <div className="hero-row"><div><h1>Find anything fast.</h1><p>Search notes, files, clipboard, commands, workspaces, and settings.</p></div><button onClick={() => setView("settings")}><Settings size={16} /> Settings</button></div>
      <input className="big-search" autoFocus value={q} onChange={(event) => setQ(event.target.value)} placeholder="Type to search your day..." />
      <div className="columns">
        <Panel title="Launch">{commands.map((command) => <Row key={command.id} title={command.name} meta={command.value} action={<button onClick={() => runCommand(command)}><Play size={15} /></button>} />)} {!commands.length && <Empty text="No matching launchers yet." />}</Panel>
        <Panel title="Notes">{notes.map((note) => <Row key={note.id} title={note.title} meta={note.body.slice(0, 80)} />)} {!notes.length && <Empty text="No matching notes." />}</Panel>
        <Panel title="Files">{files.map((file) => <Row key={file.id} title={file.name} meta={file.path} action={<button onClick={() => window.assistant.files.open(file.path)}><FolderOpen size={15} /></button>} />)} {!files.length && <Empty text="No matching indexed files." />}</Panel>
      </div>
      <Panel title="Clipboard">{clips.map((clip) => <Row key={clip.id} title={clip.text.slice(0, 100)} meta={formatDistanceToNow(new Date(clip.createdAt), { addSuffix: true })} action={<button onClick={() => window.assistant.clipboard.copy(clip.text)}><Clipboard size={15} /></button>} />)} {!clips.length && <Empty text="No matching clipboard snippets." />}</Panel>
    </section>
  );
}

function Commands({ data, setData, runCommand }: { data: AppData; setData: (data: AppData) => void; runCommand: (command: CommandItem) => void }) {
  const [editing, setEditing] = useState<CommandItem | null>(null);
  const commands = data.commands.filter((command) => command.kind !== "script" && command.kind !== "ssh");
  return <CommandEditor title="Commands" kinds={["app", "website", "file", "folder"]} commands={commands} editing={editing} setEditing={setEditing} setData={setData} runCommand={runCommand} />;
}

function Scripts({ data, setData, runCommand, output }: { data: AppData; setData: (data: AppData) => void; runCommand: (command: CommandItem) => void; output: string }) {
  const [editing, setEditing] = useState<CommandItem | null>(null);
  const commands = data.commands.filter((command) => command.kind === "script" || command.kind === "ssh");
  return (
    <section className="page">
      <CommandEditor title="Script Launcher" kinds={["script", "ssh"]} commands={commands} editing={editing} setEditing={setEditing} setData={setData} runCommand={runCommand} />
      <pre className="terminal-output">{output}</pre>
    </section>
  );
}

function CommandEditor({ title, kinds, commands, editing, setEditing, setData, runCommand }: {
  title: string; kinds: CommandKind[]; commands: CommandItem[]; editing: CommandItem | null;
  setEditing: (command: CommandItem | null) => void; setData: (data: AppData) => void; runCommand: (command: CommandItem) => void;
}) {
  const draft = editing ?? { id: uid(), name: "", kind: kinds[0], value: "", favorite: false, dangerous: false, createdAt: now(), updatedAt: now(), runCount: 0 };
  async function save() {
    setData(await window.assistant.commands.save({ ...draft, updatedAt: now() }));
    setEditing(null);
  }
  return (
    <section className="page">
      <div className="section-header"><h2>{title}</h2><button onClick={() => setEditing({ ...draft, id: uid(), name: "", value: "" })}><Plus size={16} /> Add</button></div>
      <div className="editor-grid">
        <Panel title="Saved">
          {commands.map((command) => <Row key={command.id} title={command.name} meta={`${command.kind} · ${command.value}`} action={<><button onClick={() => setEditing(command)}><Save size={15} /></button><button onClick={() => runCommand(command)}><Play size={15} /></button><button onClick={async () => setData(await window.assistant.commands.delete(command.id))}><Trash2 size={15} /></button></>} />)}
          {!commands.length && <Empty text="Create a shortcut for an app, website, file, folder, shell command, or SSH task." />}
        </Panel>
        <Panel title="Editor">
          <div className="form">
            <input value={draft.name} onChange={(e) => setEditing({ ...draft, name: e.target.value })} placeholder="Name" />
            <select value={draft.kind} onChange={(e) => setEditing({ ...draft, kind: e.target.value as CommandKind })}>{kinds.map((kind) => <option key={kind}>{kind}</option>)}</select>
            <input value={draft.value} onChange={(e) => setEditing({ ...draft, value: e.target.value })} placeholder="Path, URL, or command" />
            <input value={draft.args ?? ""} onChange={(e) => setEditing({ ...draft, args: e.target.value })} placeholder="Optional arguments" />
            <label><input type="checkbox" checked={draft.favorite} onChange={(e) => setEditing({ ...draft, favorite: e.target.checked })} /> Favorite</label>
            <label><input type="checkbox" checked={!!draft.dangerous} onChange={(e) => setEditing({ ...draft, dangerous: e.target.checked })} /> Requires destructive-action confirmation</label>
            <button onClick={save} disabled={!draft.name || !draft.value}><Save size={16} /> Save command</button>
          </div>
        </Panel>
      </div>
    </section>
  );
}

function Files({ data, setData }: { data: AppData; setData: (data: AppData) => void }) {
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const files = data.fileIndex.filter((file) => (type === "all" || file.type === type || file.extension === type) && `${file.name} ${file.path}`.toLowerCase().includes(q.toLowerCase())).slice(0, 100);
  async function chooseAndIndex() {
    const folders = await window.assistant.files.chooseFolders();
    if (folders.length) setData(await window.assistant.files.index(folders));
  }
  return (
    <section className="page">
      <div className="section-header"><h2>Local File Search</h2><button onClick={chooseAndIndex}><FolderOpen size={16} /> Choose indexed folders</button></div>
      <div className="filters"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search files and folders" /><select value={type} onChange={(e) => setType(e.target.value)}><option value="all">All types</option><option value="file">Files</option><option value="folder">Folders</option><option value="ts">TS</option><option value="md">Markdown</option></select></div>
      <Panel title={`${files.length} results`}>
        {files.map((file) => <FileRow key={file.id} file={file} />)}
        {!data.settings.indexedFolders.length && <Empty text="Pick folders to index. The app asks explicitly before scanning any location." />}
      </Panel>
    </section>
  );
}

function FileRow({ file }: { file: FileRecord }) {
  return <Row title={file.name} meta={`${file.type} · ${file.path} · ${new Date(file.modifiedAt).toLocaleString()}`} action={<><button onClick={() => window.assistant.files.open(file.path)}><Play size={15} /></button><button onClick={() => window.assistant.files.reveal(file.path)}><FolderOpen size={15} /></button></>} />;
}

const codexActions: Array<{ title: string; prompt: string; icon: React.ElementType; requiresConfirmation: boolean }> = [
  { title: "Review this project", icon: GitBranch, requiresConfirmation: false, prompt: "Review this project for bugs, regressions, risky architecture, and missing tests. Start with findings and include file references." },
  { title: "Fix broken app launch", icon: Wrench, requiresConfirmation: true, prompt: "Diagnose and fix the broken app launch. Check renderer entry point, packaged asset paths, preload errors, startup logs, and verify the app launches." },
  { title: "Add feature", icon: Plus, requiresConfirmation: true, prompt: "Add the requested feature. First inspect the codebase, then implement, verify, and summarize changed files." },
  { title: "Refactor selected files", icon: FileText, requiresConfirmation: true, prompt: "Refactor the selected files while preserving behavior. Keep the change scoped and run appropriate checks." },
  { title: "Explain selected file", icon: FileSearch, requiresConfirmation: false, prompt: "Explain the selected file, including responsibilities, important functions, dependencies, and risks." },
  { title: "Generate tests", icon: ShieldAlert, requiresConfirmation: true, prompt: "Generate focused tests for the current project. Run them if possible and report any failures." },
  { title: "Debug error log", icon: Bug, requiresConfirmation: true, prompt: "Debug the provided error log. Find the likely root cause, implement a fix if appropriate, and verify." },
  { title: "Package Windows .exe", icon: Package, requiresConfirmation: true, prompt: "Build and verify the Windows .exe packaging. Ensure packaged files load correctly, no localhost dependency exists, and the app launches by double-clicking." }
];

function CodexAgent({ data, setData, setError, compact = false }: { data: AppData; setData: React.Dispatch<React.SetStateAction<AppData>>; setError: (error: string) => void; compact?: boolean }) {
  const [availability, setAvailability] = useState<CodexAvailability | null>(null);
  const [prompt, setPrompt] = useState("");
  const [title, setTitle] = useState("Custom Codex task");
  const [manualProject, setManualProject] = useState("");
  const [gitBefore, setGitBefore] = useState("");
  const [changed, setChanged] = useState<string[]>([]);
  const latest = data.codexSessions[0];
  const active = data.codexSessions.find((session) => session.status === "active");
  const selectedProject = data.settings.defaultWorkingDirectory;
  const canRun = !!availability?.available && !!availability.projectValid && !active;

  async function refreshCodex() {
    setAvailability(await window.assistant.codex.availability());
    window.assistant.git.status().then(setGitBefore).catch((err: unknown) => setGitBefore(String(err)));
    window.assistant.git.changedFiles().then(setChanged).catch(() => setChanged([]));
  }

  useEffect(() => {
    refreshCodex().catch((err) => setError(String(err)));
  }, [data.settings.defaultWorkingDirectory, data.settings.codexExecutablePath]);

  async function chooseProject() {
    setError("");
    try {
      const next = await window.assistant.projects.select();
      setData(next);
      setManualProject(next.settings.defaultWorkingDirectory);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function setManualPath() {
    setError("");
    try {
      setData(await window.assistant.projects.setManual(manualProject));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function run(request: CodexRunRequest) {
    setError("");
    if (!availability?.available) {
      setError("Codex CLI was not found. Install it with npm install -g @openai/codex or select the executable in Settings.");
      return;
    }
    if (!availability.projectValid) {
      setError("Select a valid project folder before running Codex.");
      return;
    }
    if (active && !request.allowConcurrent) {
      setError("A Codex session is already running for this project. Stop it before starting another task.");
      return;
    }
    const confirmed = !request.requiresConfirmation || confirm("Codex may modify files, install packages, delete files, or execute scripts for this task. Continue?");
    if (!confirmed) return;
    const cwdConfirmed = confirm(`Codex will run from this working directory:\n\n${availability.projectFolder}\n\nContinue?`);
    if (!cwdConfirmed) return;
    try {
      await window.assistant.codex.run(request);
      await refreshCodex();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function cancelActive() {
    if (!active) return;
    setData((current) => ({
      ...current,
      codexSessions: current.codexSessions.map((session) => session.id === active.id ? { ...session, status: "cancelled" } : session)
    }));
    try {
      await window.assistant.codex.cancel(active.id);
      await refreshCodex();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function saveTemplate() {
    if (!title.trim() || !prompt.trim()) return;
    const template: CodexPromptTemplate = {
      id: uid(),
      name: title,
      prompt,
      requiresConfirmation: true,
      createdAt: now(),
      updatedAt: now()
    };
    setData(await window.assistant.codex.saveTemplate(template));
  }

  async function revert() {
    if (!confirm("Revert all uncommitted Git changes in the selected project? This cannot be undone.")) return;
    setGitBefore(await window.assistant.git.revert());
    setChanged(await window.assistant.git.changedFiles());
  }

  const body = (
    <>
      <div className="codex-status">
        <span className={availability?.available ? "dot ok" : "dot fail"} />
        <div>
          <strong>{availability?.available ? "Codex ready" : "Codex setup required"}</strong>
          <span>{availability?.executablePath || "Install with: npm install -g @openai/codex"}</span>
          <span>Project: {availability?.projectFolder || "No project selected"}</span>
          {availability?.error && <span className="bad-text">{availability.error}</span>}
        </div>
      </div>
      {!availability?.available && <div className="setup-box">Install Codex with <code>npm install -g @openai/codex</code>, or use Settings to select the Codex executable manually.</div>}
      {!availability?.projectValid && <div className="setup-box">Select a project folder before running Codex. The folder can be on any drive, including D:, E:, external drives, or network paths.</div>}
      <Panel title="Selected Project">
        {selectedProject ? <Row title={selectedProject} meta={availability?.projectValid ? "Valid working directory for Codex" : "Missing or inaccessible"} action={<><button onClick={chooseProject}><FolderOpen size={15} /></button><button onClick={() => window.assistant.projects.open()} disabled={!availability?.projectValid}><FileText size={15} /></button><button onClick={() => window.assistant.projects.openTerminal()} disabled={!availability?.projectValid}><Terminal size={15} /></button></>} /> : <Empty text="No project selected. Codex actions are disabled until you choose a project folder." />}
        <div className="quick-actions">
          <button onClick={chooseProject}><FolderOpen size={16} /> {selectedProject ? "Change Project" : "Select Project Folder"}</button>
          <button onClick={async () => setData(await window.assistant.tools.detectCodex())}>Detect Codex</button>
          <button onClick={() => run({ title: "Basic Codex test", prompt: "Reply with one short sentence confirming the selected project working directory. Do not modify files.", requiresConfirmation: false })} disabled={!canRun}>Run basic Codex test</button>
        </div>
        {!compact && <div className="form inline-form"><input value={manualProject} onChange={(event) => setManualProject(event.target.value)} placeholder="Manual project path, e.g. E:\Projects\My App" /><button onClick={setManualPath} disabled={!manualProject.trim()}>Use path</button></div>}
      </Panel>
      {!compact && data.projects.length > 0 && <Panel title="Recent Projects">{data.projects.slice().sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.lastOpenedAt.localeCompare(a.lastOpenedAt)).slice(0, 8).map((project) => <Row key={project.path} title={project.name} meta={project.path} action={<><button onClick={async () => setData(await window.assistant.projects.setManual(project.path))}><FolderOpen size={15} /></button><button onClick={async () => setData(await window.assistant.projects.pin(project.path))}><Star size={15} fill={project.pinned ? "currentColor" : "none"} /></button></>} />)}</Panel>}
      <div className="action-grid">
        {codexActions.map(({ title, prompt, icon: Icon, requiresConfirmation }) => (
          <button key={title} onClick={() => run({ title, prompt, requiresConfirmation })} disabled={!canRun}><Icon size={16} /> {title}</button>
        ))}
      </div>
      {!compact && (
        <div className="editor-grid">
          <Panel title="Custom Codex Prompt">
            <div className="form">
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title" />
              <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Ask Codex to work in the selected project folder" />
              <div className="quick-actions">
                <button onClick={() => run({ title, prompt, requiresConfirmation: true })} disabled={!prompt.trim() || !canRun}><Play size={16} /> Run with confirmation</button>
                <button onClick={saveTemplate} disabled={!prompt.trim()}><Save size={16} /> Save template</button>
              </div>
            </div>
          </Panel>
          <Panel title="Reusable Templates">
            {data.codexTemplates.map((template) => <Row key={template.id} title={template.name} meta={template.prompt} action={<><button disabled={!canRun} onClick={() => run({ title: template.name, prompt: template.prompt, requiresConfirmation: template.requiresConfirmation })}><Play size={15} /></button><button onClick={async () => setData(await window.assistant.codex.deleteTemplate(template.id))}><Trash2 size={15} /></button></>} />)}
          </Panel>
        </div>
      )}
      <div className="quick-actions">{active && <button className="danger" onClick={cancelActive}><RotateCcw size={16} /> Stop active Codex session</button>}<span className="status-pill">cwd: {selectedProject || "none"}</span></div>
      <div className={compact ? "terminal-output compact-output" : "terminal-output"}>{latest ? `Status: ${latest.status}\nWorking directory: ${latest.projectFolder}\n\n${latest.output || "(waiting for output...)"}` : "Codex output appears here after you start a session."}</div>
      {!compact && (
        <div className="columns">
          <Panel title="Sessions">
            {data.codexSessions.length ? data.codexSessions.map((session) => <Row key={session.id} title={session.title} meta={`${session.status} · ${new Date(session.startedAt).toLocaleString()} · ${session.projectFolder}`} action={session.status === "active" ? <button onClick={() => window.assistant.codex.cancel(session.id)}><RotateCcw size={15} /></button> : undefined} />) : <Empty text="No Codex sessions yet." />}
          </Panel>
          <Panel title="Git Status Before/Current">
            <pre className="mini-pre">{gitBefore}</pre>
            <button className="danger" onClick={revert}><RotateCcw size={16} /> Revert changes</button>
          </Panel>
          <Panel title="Changed Files">
            {changed.length ? changed.map((file) => <Row key={file} title={file} meta="Modified in selected project" />) : <Empty text="No changed files detected." />}
          </Panel>
        </div>
      )}
    </>
  );

  return <section className={compact ? "codex-panel compact" : "page codex-panel"}><div className="section-header"><h2>Codex Dev Agent</h2><span className="status-pill">{data.codexSessions.filter((session) => session.status === "active").length} active</span></div>{body}</section>;
}

function ClipboardView({ data, setData }: { data: AppData; setData: (data: AppData) => void }) {
  const [q, setQ] = useState("");
  const items = data.clipboard.filter((item) => item.text.toLowerCase().includes(q.toLowerCase()));
  return <section className="page"><div className="section-header"><h2>Clipboard</h2><button onClick={async () => setData(await window.assistant.clipboard.clear())}><Trash2 size={16} /> Clear unpinned</button></div><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search clipboard history" /> <Panel title="History">{items.map((item) => <Row key={item.id} title={item.text.slice(0, 100)} meta={formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })} action={<><button onClick={async () => setData(await window.assistant.clipboard.togglePin(item.id))}><Star size={15} fill={item.pinned ? "currentColor" : "none"} /></button><button onClick={() => window.assistant.clipboard.copy(item.text)}><Clipboard size={15} /></button></>} />)} {!items.length && <Empty text="Clipboard history appears here, except sensitive-looking content." />}</Panel></section>;
}

function DiscordReminderBackendPanel({ data, setData }: { data: AppData; setData: React.Dispatch<React.SetStateAction<AppData>> }) {
  const [settings, setSettings] = useState<AppSettings>(data.settings);
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<DiscordStatus | null>(null);
  const [message, setMessage] = useState("");
  useEffect(() => setSettings(data.settings), [data.settings]);
  useEffect(() => {
    window.assistant.discord.status().then(setStatus).catch((error) => setMessage(error instanceof Error ? error.message : String(error)));
  }, []);
  async function saveBackend() {
    try {
      const next = await window.assistant.settings.save(settings);
      setData(next);
      if (token.trim()) await window.assistant.discord.saveToken(token);
      setToken("");
      setStatus(await window.assistant.discord.status());
      setMessage("Discord reminder backend settings saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }
  async function testDm() {
    const result = await window.assistant.discord.testDm(token || undefined);
    setData(result.data);
    setStatus(await window.assistant.discord.status());
    setMessage(result.ok ? "Test DM sent from the VPS bot." : `Test DM failed: ${result.error}`);
  }
  async function syncNow() {
    try {
      const next = await window.assistant.discord.sync();
      setData(next);
      setStatus(await window.assistant.discord.status());
      setMessage("Reminders synced with the VPS backend.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }
  return (
    <Panel title="Discord Reminder Delivery">
      <div className="form">
        <Row title={status?.configured ? "VPS backend connected" : "VPS backend needs setup"} meta={`DM target: ${settings.discord.targetUserId || "140478632165507073"}`} />
        <label><input type="checkbox" checked={settings.discord.enabled} onChange={(event) => setSettings({ ...settings, discord: { ...settings.discord, enabled: event.target.checked } })} /> Enable Discord reminder DMs</label>
        <label><input type="checkbox" checked={settings.discord.syncEnabled} onChange={(event) => setSettings({ ...settings, discord: { ...settings.discord, syncEnabled: event.target.checked } })} /> Sync reminders with VPS</label>
        <input value={settings.discord.backendUrl} onChange={(event) => setSettings({ ...settings, discord: { ...settings.discord, backendUrl: event.target.value } })} placeholder="Backend URL, e.g. http://15.204.119.230/reminders" />
        <input type="password" value={token} onChange={(event) => setToken(event.target.value)} placeholder="Backend API token from BOT_API_TOKEN" />
        <input value={settings.discord.targetUserId} onChange={(event) => setSettings({ ...settings, discord: { ...settings.discord, targetUserId: event.target.value } })} placeholder="Discord user ID" />
        <div className="quick-actions"><button onClick={saveBackend}><Save size={16} /> Save backend</button><button onClick={testDm}><Bell size={16} /> Test DM</button><button onClick={syncNow}><RotateCcw size={16} /> Sync now</button></div>
        {message && <small>{message}</small>}
        <small>The Discord bot token stays on the VPS. This app only stores the backend URL and API token.</small>
      </div>
    </Panel>
  );
}

function RemindersView({ data, setData }: { data: AppData; setData: React.Dispatch<React.SetStateAction<AppData>> }) {
  const [filter, setFilter] = useState("upcoming");
  const [sort, setSort] = useState("time");
  const [viewMode, setViewMode] = useState<"list" | "calendar" | "timeline">("list");
  const [draft, setDraft] = useState<ReminderItem>(() => createReminderDraft());
  const [relativeAmount, setRelativeAmount] = useState("");
  const [relativeUnit, setRelativeUnit] = useState("hours");
  const [dueLocal, setDueLocal] = useState(datetimeInputValue(new Date(Date.now() + 60 * 60_000)));

  function createFromRelative() {
    const amount = Number(relativeAmount);
    if (!Number.isInteger(amount) || amount <= 0) return null;
    const date = new Date();
    if (relativeUnit === "seconds") date.setSeconds(date.getSeconds() + amount);
    if (relativeUnit === "minutes") date.setMinutes(date.getMinutes() + amount);
    if (relativeUnit === "hours") date.setHours(date.getHours() + amount);
    if (relativeUnit === "days") date.setDate(date.getDate() + amount);
    if (relativeUnit === "weeks") date.setDate(date.getDate() + amount * 7);
    if (relativeUnit === "months") date.setMonth(date.getMonth() + amount);
    return date;
  }

  async function save() {
    const title = reminderTitle(draft).trim();
    const due = createFromRelative() ?? new Date(dueLocal);
    if (!title || Number.isNaN(due.getTime())) return;
    const reminder: ReminderItem = { ...draft, text: title, title, dueAt: due.toISOString(), notified: false, dismissed: false, notifiedAt: undefined, dismissedAt: undefined, discordNotificationStatus: "pending", discordNotificationSentAt: undefined, discordNotificationError: undefined, updatedAt: now() };
    await window.assistant.reminders.save(reminder);
    setData(await window.assistant.calendar.save(plannerEventFromReminder(reminder)));
    setDraft(createReminderDraft());
    setRelativeAmount("");
    setDueLocal(datetimeInputValue(new Date(Date.now() + 60 * 60_000)));
  }

  function edit(reminder: ReminderItem) {
    setDraft({ ...reminder, title: reminderTitle(reminder), notes: reminder.notes ?? "" });
    setRelativeAmount("");
    const due = reminderDueDate(reminder) ?? new Date(Date.now() + 60 * 60_000);
    setDueLocal(datetimeInputValue(due));
  }

  const counts = reminderCounts(data.reminders);
  const reminders = sortReminders(filterReminders(data.reminders, filter), sort);

  return (
    <section className="page reminders-page">
      <div className="hero-row">
        <div><h1>Reminders</h1><p>Local reminders, quick scheduling, and calm views for what is due today and later.</p></div>
        <div className="quick-actions"><button onClick={() => window.assistant.reminders.testNotification()}><Bell size={16} /> Test notification</button><button onClick={() => setDraft(createReminderDraft())}><Plus size={16} /> New</button></div>
      </div>
      <div className="reminder-summary compact-stats">
        {(["today", "upcoming", "overdue", "completed", "dismissed", "all"] as const).map((key) => <button key={key} className={filter === key ? "active" : ""} onClick={() => setFilter(key)}><strong>{counts[key]}</strong><span>{key}</span></button>)}
      </div>
      <DiscordReminderBackendPanel data={data} setData={setData} />
      <div className="reminder-layout">
        <Panel title={draft.id && data.reminders.some((item) => item.id === draft.id) ? "Edit Reminder" : "Add Reminder"}>
          <div className="reminder-form-grid">
            <input value={draft.title ?? draft.text} onChange={(event) => setDraft({ ...draft, title: event.target.value, text: event.target.value })} placeholder="Reminder title" />
            <input type="datetime-local" value={dueLocal} min={datetimeInputValue(new Date())} onChange={(event) => setDueLocal(event.target.value)} />
            <div className="relative-fields"><input value={relativeAmount} onChange={(event) => setRelativeAmount(event.target.value)} placeholder="In..." /><select value={relativeUnit} onChange={(event) => setRelativeUnit(event.target.value)}><option>seconds</option><option>minutes</option><option>hours</option><option>days</option><option>weeks</option><option>months</option></select></div>
            <input value={draft.notes ?? ""} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} placeholder="Optional notes" />
            <button onClick={save} disabled={!reminderTitle(draft).trim()}><Save size={16} /> Save reminder</button>
          </div>
        </Panel>
        <Panel title="Planner Link">
          <Row title="Planner mirror" meta="Every saved reminder also creates a planner event so it can be sent to Google Calendar." />
          <Row title="Google Calendar" meta="Open Planner to review the mirrored event and send it to Google Calendar." />
          <button onClick={() => window.assistant.calendar.openGoogle(plannerEventFromReminder({ ...draft, dueAt: new Date(dueLocal).toISOString(), title: reminderTitle(draft), text: reminderTitle(draft) } as ReminderItem))}><CalendarDays size={16} /> Preview in Google Calendar</button>
        </Panel>
      </div>
      <div className="section-header">
        <div className="tab-strip compact-tabs">{(["list", "calendar", "timeline"] as const).map((mode) => <button key={mode} className={viewMode === mode ? "active" : ""} onClick={() => setViewMode(mode)}>{mode}</button>)}</div>
        <select value={sort} onChange={(event) => setSort(event.target.value)}><option value="time">Sort by time</option><option value="created">Sort by created</option><option value="title">Sort by title</option></select>
      </div>
      {viewMode === "list" && <Panel title={`Showing ${reminders.length} reminders`}>{reminders.map((reminder) => <ReminderRow key={reminder.id} reminder={reminder} setData={setData} edit={edit} />)} {!reminders.length && <Empty text="No reminders match this view." />}</Panel>}
      {viewMode === "calendar" && <ReminderCalendar reminders={reminders} setData={setData} edit={edit} />}
      {viewMode === "timeline" && <ReminderTimeline reminders={reminders} />}
    </section>
  );
}

function createReminderDraft(): ReminderItem {
  return { id: uid(), text: "", title: "", notes: "", dueAt: new Date(Date.now() + 60 * 60_000).toISOString(), completed: false, dismissed: false, notified: false, discordNotificationStatus: "pending", createdAt: now(), updatedAt: now() };
}

function reminderCounts(reminders: ReminderItem[]) {
  return reminders.reduce((counts, reminder) => {
    const status = reminderStatus(reminder);
    counts.all++;
    if (status === "completed") counts.completed++;
    if (status === "dismissed") counts.dismissed++;
    if (status === "overdue") counts.overdue++;
    if ((status === "upcoming" || status === "due soon" || status === "notified") && !reminder.completed && !reminder.dismissed) counts.upcoming++;
    const due = reminderDueDate(reminder);
    if (due && due.toDateString() === new Date().toDateString() && !reminder.completed && !reminder.dismissed) counts.today++;
    return counts;
  }, { all: 0, today: 0, upcoming: 0, overdue: 0, completed: 0, dismissed: 0 });
}

function filterReminders(reminders: ReminderItem[], filter: string) {
  return reminders.filter((reminder) => {
    const status = reminderStatus(reminder);
    const due = reminderDueDate(reminder);
    if (filter === "all") return true;
    if (filter === "today") return !!due && due.toDateString() === new Date().toDateString() && !reminder.completed && !reminder.dismissed;
    if (filter === "upcoming") return ["upcoming", "due soon", "notified"].includes(status) && !reminder.completed && !reminder.dismissed;
    return status === filter;
  });
}

function sortReminders(reminders: ReminderItem[], sort: string) {
  return [...reminders].sort((a, b) => {
    if (sort === "created") return b.createdAt.localeCompare(a.createdAt);
    if (sort === "title") return reminderTitle(a).localeCompare(reminderTitle(b));
    return (reminderDueDate(a)?.getTime() ?? Number.MAX_SAFE_INTEGER) - (reminderDueDate(b)?.getTime() ?? Number.MAX_SAFE_INTEGER);
  });
}

function ReminderRow({ reminder, setData, edit }: { reminder: ReminderItem; setData: React.Dispatch<React.SetStateAction<AppData>>; edit: (reminder: ReminderItem) => void }) {
  const status = reminderStatus(reminder);
  const discordStatus = reminder.discordNotificationStatus ?? (reminder.notified ? "sent" : "pending");
  async function removeReminder() {
    await window.assistant.reminders.delete(reminder.id);
    setData(await window.assistant.calendar.delete(`reminder-${reminder.id}`));
  }
  return <div className="reminder-row-card"><button className={reminder.completed ? "check completed" : "check"} onClick={async () => setData(await window.assistant.reminders.toggleComplete(reminder.id))}>{reminder.completed ? "OK" : ""}</button><div><strong>{reminderTitle(reminder)}</strong><span>{reminder.notes || "No notes"}</span>{reminder.discordNotificationError && <span className="bad-text">{reminder.discordNotificationError}</span>}</div><time>{reminderDueLabel(reminder)}</time><span className={`reminder-status ${status.replace(" ", "-")}`}>{status}</span><span className={`reminder-status ${discordStatus}`}>Discord {discordStatus}</span><div className="row-actions"><button onClick={() => edit(reminder)}><Save size={15} /></button><button onClick={() => window.assistant.calendar.openGoogle(plannerEventFromReminder(reminder))}><CalendarDays size={15} /></button>{discordStatus === "failed" && <button onClick={async () => setData(await window.assistant.reminders.retryDiscord(reminder.id))}><RotateCcw size={15} /></button>}<button onClick={async () => setData(await window.assistant.reminders.dismiss(reminder.id))} disabled={reminder.completed || reminder.dismissed}><CheckCircle2 size={15} /></button><button onClick={removeReminder}><Trash2 size={15} /></button></div></div>;
}

function ReminderCalendar({ reminders, setData, edit }: { reminders: ReminderItem[]; setData: React.Dispatch<React.SetStateAction<AppData>>; edit: (reminder: ReminderItem) => void }) {
  const groups = reminders.reduce((map, reminder) => {
    const due = reminderDueDate(reminder);
    const key = due ? due.toDateString() : "Invalid date";
    map.set(key, [...(map.get(key) ?? []), reminder]);
    return map;
  }, new Map<string, ReminderItem[]>());
  return <div className="columns">{[...groups.entries()].map(([day, rows]) => <Panel key={day} title={day}>{rows.map((reminder) => <ReminderRow key={reminder.id} reminder={reminder} setData={setData} edit={edit} />)}</Panel>)}</div>;
}

function ReminderTimeline({ reminders }: { reminders: ReminderItem[] }) {
  return <Panel title="Timeline">{reminders.map((reminder) => <div className="timeline-item" key={reminder.id}><div className="timeline-marker" /><div className="timeline-content"><div className="timeline-topline"><strong>{reminderTitle(reminder)}</strong><span className={`reminder-status ${reminderStatus(reminder).replace(" ", "-")}`}>{reminderStatus(reminder)}</span></div><p>{reminder.notes || "No notes"}</p><small>{reminderDueLabel(reminder)}</small></div></div>)} {!reminders.length && <Empty text="No timeline items yet." />}</Panel>;
}

function PlannerView({ data, setData }: { data: AppData; setData: (data: AppData) => void }) {
  const [taskDraft, setTaskDraft] = useState<any>({ id: uid(), title: "", notes: "", dueAt: "", completed: false, priority: "medium", status: "open", createdAt: now(), updatedAt: now() });
  const [eventDraft, setEventDraft] = useState<any>({
    id: uid(),
    title: "",
    notes: "",
    location: "",
    startAt: new Date(Date.now() + 60 * 60_000).toISOString(),
    endAt: new Date(Date.now() + (60 + (data.settings.calendar?.defaultDurationMinutes || 60)) * 60_000).toISOString(),
    allDay: false,
    createdAt: now(),
    updatedAt: now()
  });
  const tasks = nextTasks(data.tasks ?? [], 50);
  const events = upcomingEvents(data.calendarEvents ?? [], 50);
  const reminders = nextReminders(data.reminders ?? [], 50);

  async function saveTask() {
    if (!taskDraft.title.trim()) return;
    setData(await window.assistant.tasks.save({ ...taskDraft, updatedAt: now() }));
    setTaskDraft({ id: uid(), title: "", notes: "", dueAt: "", completed: false, priority: "medium", status: "open", createdAt: now(), updatedAt: now() });
  }

  async function saveEvent() {
    if (!eventDraft.title.trim()) return;
    setData(await window.assistant.calendar.save({ ...eventDraft, updatedAt: now() }));
    const start = new Date(Date.now() + 60 * 60_000);
    const end = new Date(start.getTime() + (data.settings.calendar?.defaultDurationMinutes || 60) * 60_000);
    setEventDraft({ id: uid(), title: "", notes: "", location: "", startAt: start.toISOString(), endAt: end.toISOString(), allDay: false, createdAt: now(), updatedAt: now() });
  }

  return <section className="page planner-page">
    <div className="hero-row">
      <div><h1>Planner</h1><p>Tasks, events, and reminder mirrors that can flow into Google Calendar.</p></div>
      <div className="quick-actions"><button onClick={() => window.assistant.calendar.openGoogle({ title: "New EclipOS event", startAt: eventDraft.startAt, endAt: eventDraft.endAt, notes: eventDraft.notes, location: eventDraft.location })}><CalendarDays size={16} /> Open Google Calendar</button></div>
    </div>
    <div className="editor-grid">
      <Panel title="Add Task">
        <div className="form">
          <input value={taskDraft.title} onChange={(e) => setTaskDraft({ ...taskDraft, title: e.target.value })} placeholder="Task title" />
          <input value={taskDraft.notes} onChange={(e) => setTaskDraft({ ...taskDraft, notes: e.target.value })} placeholder="Notes" />
          <input type="datetime-local" value={taskDraft.dueAt ? datetimeInputValue(new Date(taskDraft.dueAt)) : ""} onChange={(e) => setTaskDraft({ ...taskDraft, dueAt: e.target.value ? new Date(e.target.value).toISOString() : "" })} />
          <button onClick={saveTask}><Save size={16} /> Save task</button>
        </div>
      </Panel>
      <Panel title="Add Calendar Event">
        <div className="form">
          <input value={eventDraft.title} onChange={(e) => setEventDraft({ ...eventDraft, title: e.target.value })} placeholder="Event title" />
          <input value={eventDraft.location} onChange={(e) => setEventDraft({ ...eventDraft, location: e.target.value })} placeholder="Location or call link" />
          <input value={eventDraft.notes} onChange={(e) => setEventDraft({ ...eventDraft, notes: e.target.value })} placeholder="Notes" />
          <input type="datetime-local" value={datetimeInputValue(new Date(eventDraft.startAt))} onChange={(e) => setEventDraft({ ...eventDraft, startAt: new Date(e.target.value).toISOString() })} />
          <input type="datetime-local" value={datetimeInputValue(new Date(eventDraft.endAt))} onChange={(e) => setEventDraft({ ...eventDraft, endAt: new Date(e.target.value).toISOString() })} />
          <div className="quick-actions"><button onClick={saveEvent}><Save size={16} /> Save event</button><button onClick={() => window.assistant.calendar.openGoogle(eventDraft)}><CalendarDays size={16} /> Send to Google Calendar</button></div>
        </div>
      </Panel>
    </div>
    <div className="columns wide-columns">
      <Panel title="Open Tasks">{tasks.map((task) => <Row key={task.id} title={task.title} meta={task.dueAt ? `Due ${new Date(task.dueAt).toLocaleString()}` : "No due date"} action={<><button onClick={async () => setData(await window.assistant.tasks.toggleComplete(task.id))}><CheckCircle2 size={15} /></button><button onClick={async () => setData(await window.assistant.tasks.delete(task.id))}><Trash2 size={15} /></button></>} />)} {!tasks.length && <Empty text="No tasks yet. Ask the assistant to create one or add one here." />}</Panel>
      <Panel title="Upcoming Events">{events.map((event) => <Row key={event.id} title={event.title} meta={eventDateLabel(event)} action={<><button onClick={() => window.assistant.calendar.openGoogle(event)}><CalendarDays size={15} /></button><button onClick={async () => setData(await window.assistant.calendar.delete(event.id))}><Trash2 size={15} /></button></>} />)} {!events.length && <Empty text="No upcoming events yet." />}</Panel>
    </div>
    <Panel title="Reminder Mirror">
      {reminders.map((reminder) => <Row key={reminder.id} title={reminderTitle(reminder)} meta={reminderDueLabel(reminder)} action={<button onClick={() => window.assistant.calendar.openGoogle(plannerEventFromReminder(reminder))}><CalendarDays size={15} /></button>} />)}
      {!reminders.length && <Empty text="Saved reminders appear here automatically and can be sent to Google Calendar." />}
    </Panel>
    <div className="columns">
      <Panel title="Google Calendar How-To">
        <Row title="1. Create the event here" meta="Add the title, time, notes, and location in Planner." />
        <Row title="2. Send it to Google Calendar" meta="Use Send to Google Calendar or Open Google Calendar." />
        <Row title="3. Sign in if needed" meta="Google opens in your browser and pre-fills the event draft." />
        <Row title="4. Save it in Google" meta="Review the details and click Save in Google Calendar." />
      </Panel>
      <Panel title="Assistant Actions">
        <Row title="Task requests" meta='Try: "Add a task to renew my license next Tuesday."' />
        <Row title="Reminder requests" meta='Try: "Remind me tomorrow at 3 PM to call the bank."' />
        <Row title="Calendar requests" meta='Try: "Put a meeting on my calendar Friday at 1 PM for payroll review."' />
      </Panel>
    </div>
  </section>;
}

function Notes({ data, setData }: { data: AppData; setData: (data: AppData) => void }) {
  const [draft, setDraft] = useState<NoteItem>({ id: uid(), title: "", body: "", tags: [], pinned: false, kind: "note", createdAt: now(), updatedAt: now() });
  const [q, setQ] = useState("");
  const notes = data.notes.filter((note) => `${note.title} ${note.body} ${note.tags.join(" ")}`.toLowerCase().includes(q.toLowerCase()));
  async function save() {
    setData(await window.assistant.notes.save({ ...draft, tags: draft.tags.filter(Boolean), updatedAt: now() }));
    setDraft({ ...draft, id: uid(), title: "", body: "", tags: [], pinned: false });
  }
  return <section className="page"><div className="section-header"><h2>Notes & Snippets</h2><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search notes" /></div><div className="editor-grid"><Panel title="Saved">{notes.map((note) => <Row key={note.id} title={note.title} meta={`${note.kind} · ${note.tags.join(", ")}`} action={<><button onClick={() => setDraft(note)}><Save size={15} /></button><button onClick={async () => setData(await window.assistant.notes.delete(note.id))}><Trash2 size={15} /></button></>} />)} {!notes.length && <Empty text="Save notes, markdown, code snippets, and runbook fragments." />}</Panel><Panel title="Editor"><div className="form"><input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Title" /><select value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as "note" | "snippet" })}><option value="note">note</option><option value="snippet">snippet</option></select><input value={draft.tags.join(",")} onChange={(e) => setDraft({ ...draft, tags: e.target.value.split(",").map((tag) => tag.trim()) })} placeholder="tags, comma separated" /><textarea value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} placeholder="Markdown or code snippet" /><label><input type="checkbox" checked={draft.pinned} onChange={(e) => setDraft({ ...draft, pinned: e.target.checked })} /> Pin</label><button onClick={save} disabled={!draft.title}><Save size={16} /> Save note</button><div className="preview"><strong>Preview</strong><p>{draft.body || "Markdown preview appears here."}</p></div></div></Panel></div></section>;
}

function Monitor({ stats }: { stats: SystemStats | null }) {
  return <section className="page"><h2>System Monitor</h2><div className="stat-grid"><Stat title="CPU" value={`${stats?.cpuUsage ?? 0}%`} /><Stat title="RAM" value={stats ? `${formatBytes(stats.ramUsed)} used` : "Loading"} /><Stat title="Uptime" value={stats ? `${Math.floor(stats.uptime / 3600)}h` : "Loading"} /><Stat title="Network" value={stats?.networks.length ? "Online" : "Offline"} /></div><Panel title="Processes">{stats?.processes.map((process) => <Row key={process.pid} title={process.name} meta={`PID ${process.pid} · ${formatBytes(process.memory)}`} />) ?? <Empty text="Loading process list." />}</Panel></section>;
}

function SystemCenter({ snapshot, settings, data, setData }: { snapshot: SystemSnapshot | null; settings: AppSettings; data: AppData; setData: (data: AppData) => void }) {
  const [tab, setTab] = useState("health");
  const [detailSnapshot, setDetailSnapshot] = useState<SystemSnapshot | null>(null);
  const [processQuery, setProcessQuery] = useState("");
  const [selectedProcess, setSelectedProcess] = useState<ProcessInfo | null>(null);
  const [storage, setStorage] = useState<StorageAnalysis | null>(null);
  const [bench, setBench] = useState<DiskBenchmarkResult | null>(null);
  const [busy, setBusy] = useState("");
  const activeSnapshot = detailSnapshot ?? snapshot;
  const ramPercent = snapshot ? Math.round((snapshot.ram.used / snapshot.ram.total) * 100) : 0;
  const processes = (activeSnapshot?.processes ?? []).filter((item) => `${item.name} ${item.pid} ${item.path}`.toLowerCase().includes(processQuery.toLowerCase()));

  useEffect(() => {
    if (!["processes", "startup", "specs"].includes(tab)) {
      setDetailSnapshot(null);
      return;
    }
    let mounted = true;
    const tick = () => window.assistant.system.snapshot({
      includeProcesses: tab === "processes",
      includeStartup: tab === "startup",
      includeSpecs: tab === "specs",
      writeHistory: false
    }).then((next) => {
      if (mounted) setDetailSnapshot(next);
    }).catch(() => undefined);
    tick();
    const timer = setInterval(tick, Math.max(3000, settings.monitoring.maxProcessRefreshMs || 5000));
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [tab, settings.monitoring.maxProcessRefreshMs]);

  async function killSelected() {
    if (!selectedProcess || !confirm(`End ${selectedProcess.name} (${selectedProcess.pid})? Unsaved work in that app may be lost.`)) return;
    await window.assistant.system.killProcess(selectedProcess.pid);
    setSelectedProcess(null);
  }

  async function analyzeStorage() {
    setBusy("storage");
    try {
      setStorage(await window.assistant.system.analyzeStorage(settings.defaultWorkingDirectory || undefined));
    } finally {
      setBusy("");
    }
  }

  async function runBenchmark() {
    if (!confirm("Run a short 32 MB disk speed test in the Windows temp folder?")) return;
    setBusy("benchmark");
    try {
      setBench(await window.assistant.system.diskBenchmark());
    } finally {
      setBusy("");
    }
  }

  return (
    <section className="page system-page">
      <div className="hero-row">
        <div>
          <h1>PC health, without the noise.</h1>
          <p>Live hardware insight, cleaner process control, storage awareness, and diagnostics for your daily machine.</p>
        </div>
        <div className="health-orb"><strong>{snapshot ? snapshot.healthScore : "--"}</strong><span>{snapshot?.healthLabel ?? "Reading"}</span></div>
      </div>
      <div className="tab-strip">{["health", "live", "scanner", "processes", "startup", "storage", "network", "specs", "stress", "performance", "tools"].map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item === "scanner" ? "Storage Scanner" : item === "stress" ? "Stress Tests" : item === "performance" ? "Performance" : item}</button>)}</div>
      {!snapshot && <Panel title="Waking up sensors"><div className="skeleton-grid"><span /><span /><span /></div></Panel>}

      {snapshot && tab === "health" && <>
        <div className="stat-grid">
          <Stat title="CPU" value={`${snapshot.cpu.usage}%${snapshot.cpu.temperature ? ` / ${snapshot.cpu.temperature}C` : ""}`} />
          <Stat title="GPU" value={snapshot.gpu.usage === null ? "Limited" : `${snapshot.gpu.usage}%${snapshot.gpu.temperature ? ` / ${snapshot.gpu.temperature}C` : ""}`} />
          <Stat title="Memory" value={`${ramPercent}% used`} />
          <Stat title="Uptime" value={`${Math.floor(snapshot.uptime / 3600)}h ${Math.floor((snapshot.uptime % 3600) / 60)}m`} />
        </div>
        <div className="columns">
          <Panel title="Health Signals">{snapshot.alerts.length ? snapshot.alerts.map((alert) => <Row key={alert} title="Needs attention" meta={alert} action={<AlertTriangle size={16} />} />) : <Empty text="No active health warnings. Temperatures, memory, and storage look comfortable." />}</Panel>
          <Panel title="Trend"><MiniChart points={snapshot.history.map((item) => item.cpuUsage)} label="CPU" /><MiniChart points={snapshot.history.map((item) => item.ramUsage)} label="Memory" /></Panel>
          <Panel title="Quick Utilities"><button onClick={() => window.assistant.overlay.toggle().then(setData)}><Gauge size={16} /> Toggle overlay</button><button onClick={() => setTab("storage")}><HardDrive size={16} /> Analyze storage</button><button onClick={() => setTab("processes")}><Activity size={16} /> View processes</button></Panel>
        </div>
      </>}

      {snapshot && tab === "live" && <div className="columns wide-columns">
        <Panel title="Processor"><SensorCard icon={<Cpu size={18} />} label={snapshot.cpu.model} value={`${snapshot.cpu.usage}%`} sub={`${snapshot.cpu.cores} cores${snapshot.cpu.clockMHz ? ` - ${snapshot.cpu.clockMHz} MHz` : ""}`} /><MiniChart points={snapshot.history.map((item) => item.cpuUsage)} label="CPU usage" /><div className="core-grid">{snapshot.cpu.perCore.map((core, index) => <div key={index}><span>Core {index + 1}</span><meter min={0} max={100} value={core} /></div>)}</div></Panel>
        <Panel title="Graphics"><SensorCard icon={<Gauge size={18} />} label={snapshot.gpu.model} value={snapshot.gpu.usage === null ? "Unavailable" : `${snapshot.gpu.usage}%`} sub={snapshot.gpu.vramTotal ? `${formatBytes(snapshot.gpu.vramUsed ?? 0)} / ${formatBytes(snapshot.gpu.vramTotal)} VRAM` : "Usage requires NVIDIA SMI or vendor sensors"} /><MiniChart points={snapshot.history.map((item) => item.gpuTemp ?? 0)} label="GPU temp" /></Panel>
        <Panel title="Memory & Storage"><SensorCard icon={<HardDrive size={18} />} label="RAM" value={`${ramPercent}%`} sub={`${formatBytes(snapshot.ram.used)} / ${formatBytes(snapshot.ram.total)}${snapshot.ram.speedMHz ? ` - ${snapshot.ram.speedMHz} MHz` : ""}`} />{snapshot.disks.map((disk) => <Row key={disk.name} title={`${disk.name} ${disk.label}`} meta={`${formatBytes(disk.used)} / ${formatBytes(disk.total)} - R ${formatBytes(disk.readBps)}/s W ${formatBytes(disk.writeBps)}/s`} />)}</Panel>
      </div>}

      {activeSnapshot && tab === "processes" && <div className="editor-grid">
        <Panel title="Running Apps & Processes"><input value={processQuery} onChange={(event) => setProcessQuery(event.target.value)} placeholder="Search process name, PID, or path" />{processes.slice(0, 40).map((item) => <Row key={item.pid} title={item.name} meta={`PID ${item.pid} - ${formatBytes(item.memory)}${item.heavy ? " - high usage" : ""}`} action={<button onClick={() => setSelectedProcess(item)}><Info size={15} /></button>} />)}</Panel>
        <Panel title="Process Details">{selectedProcess ? <div className="form"><SensorCard icon={<Activity size={18} />} label={selectedProcess.name} value={formatBytes(selectedProcess.memory)} sub={`PID ${selectedProcess.pid}`} /><small>{selectedProcess.safeHint}</small><pre className="mini-pre">{selectedProcess.commandLine || selectedProcess.path || "Windows did not expose command-line details for this process."}</pre><button onClick={() => window.assistant.system.openProcessLocation(selectedProcess.pid)} disabled={!selectedProcess.path}><FolderOpen size={16} /> Open location</button><button className="danger" onClick={killSelected}><Trash2 size={16} /> End process</button></div> : <Empty text="Pick a process to see details and safe actions." />}</Panel>
      </div>}

{activeSnapshot && tab === "startup" && <Panel title="Startup Apps">{activeSnapshot.startup.map((item) => <Row key={item.id} title={item.name} meta={`${item.impact} impact - ${item.source}`} action={<button disabled>{item.enabled ? "On" : "Off"}</button>} />)}{!activeSnapshot.startup.length && <Empty text="No startup entries found in the standard Windows Run locations." />}<small>Startup enable/disable is view-only for now so EclipOS does not edit registry entries without a fuller undo path.</small></Panel>}

      {snapshot && tab === "storage" && <div className="columns"><Panel title="Drive Overview">{snapshot.disks.map((disk) => <Row key={disk.name} title={`${disk.name} ${disk.label}`} meta={`${Math.round((disk.used / disk.total) * 100)}% used - ${formatBytes(disk.total - disk.used)} free`} />)}</Panel><Panel title="Storage Scan"><button onClick={analyzeStorage} disabled={busy === "storage"}><Search size={16} /> {busy === "storage" ? "Scanning..." : "Scan project or home folder"}</button>{storage && <><Row title="Scanned" meta={`${storage.scanned} items in ${storage.root}`} /><Row title="Temp files" meta={formatBytes(storage.tempBytes)} />{storage.recommendations.map((rec) => <Row key={rec} title="Suggestion" meta={rec} />)}</>}</Panel><Panel title="Largest Items">{storage?.largest.slice(0, 12).map((item) => <Row key={item.path} title={item.name} meta={`${formatBytes(item.size)} - ${item.path}`} />) ?? <Empty text="Run a scan to see large folders and files." />}</Panel></div>}

      {tab === "scanner" && <StorageScanner data={data} setData={setData} />}

      {snapshot && tab === "network" && <div className="columns"><Panel title="Bandwidth"><SensorCard icon={<Download size={18} />} label="Download" value={`${formatBytes(snapshot.network.rxBps)}/s`} sub="Live adapter total" /><SensorCard icon={<Upload size={18} />} label="Upload" value={`${formatBytes(snapshot.network.txBps)}/s`} sub="Live adapter total" /><MiniChart points={snapshot.history.map((item) => Math.round(item.networkRxBps / 1024))} label="Download KB/s" /></Panel><Panel title="Adapters">{snapshot.network.adapters.map((adapter) => <Row key={`${adapter.name}-${adapter.address}`} title={adapter.name} meta={`${adapter.address} - ${adapter.family}`} />)}</Panel><Panel title="Connection Quality"><Row title="External IP" meta={snapshot.network.externalIp} /><Row title="Latency" meta={snapshot.network.latencyMs === null ? "Not measured yet" : `${snapshot.network.latencyMs} ms`} /><Empty text="Per-app network usage needs Windows ETW integration and is not enabled in this MVP." /></Panel></div>}

      {activeSnapshot && tab === "specs" && <div className="columns"><Panel title="Core Specs"><Row title="CPU" meta={activeSnapshot.specs.cpu} /><Row title="GPU" meta={activeSnapshot.specs.gpu} /><Row title="RAM" meta={activeSnapshot.specs.ram} /><Row title="Motherboard" meta={activeSnapshot.specs.motherboard} /><Row title="BIOS" meta={activeSnapshot.specs.bios} /></Panel><Panel title="Devices">{[...activeSnapshot.specs.storage, ...activeSnapshot.specs.network].slice(0, 12).map((item) => <Row key={item} title={item} meta="Detected device" />)}</Panel><Panel title="Diagnostics"><button onClick={() => window.assistant.clipboard.copy(JSON.stringify(activeSnapshot.specs, null, 2))}><Clipboard size={16} /> Copy system specs</button><button onClick={() => navigator.clipboard.writeText(JSON.stringify(activeSnapshot, null, 2))}><FileText size={16} /> Copy diagnostics report</button></Panel></div>}

      {tab === "stress" && <StressTests data={data} setData={setData} />}

      {tab === "performance" && <PerformanceDiagnosticsView />}

      {snapshot && tab === "tools" && <div className="columns"><Panel title="Disk Speed Test"><p>A short temp-folder read/write check. It avoids stress testing and deletes its test file afterward.</p><button onClick={runBenchmark} disabled={busy === "benchmark"}><Zap size={16} /> {busy === "benchmark" ? "Running..." : "Run disk test"}</button>{bench && <Row title="Result" meta={`Write ${bench.writeMbps} MB/s - Read ${bench.readMbps} MB/s`} />}</Panel><Panel title="Performance Overlay"><button onClick={() => window.assistant.overlay.toggle().then(setData)}><Gauge size={16} /> Toggle overlay</button><Row title="Mode" meta={`${settings.monitoring.overlayMode} · ${Math.round(settings.monitoring.overlayOpacity * 100)}% opacity`} /><Row title="Hotkey" meta={settings.monitoring.overlayHotkey} /></Panel><Panel title="Stress Tests"><button onClick={() => setTab("stress")}><Zap size={16} /> Open Stress Tests</button><small>Tests are manual, time-limited, and include emergency stop plus temperature auto-stop.</small></Panel></div>}
    </section>
  );
}

function SensorCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) {
  return <div className="sensor-card"><div>{icon}<span>{label}</span></div><strong>{value}</strong><small>{sub}</small></div>;
}

function PerformanceDiagnosticsView() {
  const [diagnostics, setDiagnostics] = useState<PerformanceDiagnostics | null>(null);
  useEffect(() => {
    let mounted = true;
    const tick = () => window.assistant.system.performanceDiagnostics().then((next) => {
      if (mounted) setDiagnostics(next);
    }).catch(() => undefined);
    tick();
    const timer = setInterval(tick, 2000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);
  if (!diagnostics) return <Panel title="Performance Diagnostics"><div className="skeleton-grid"><span /><span /><span /></div></Panel>;
  return <div className="columns">
<Panel title="EclipOS Impact">
      <Stat title="CPU" value={`${diagnostics.process.cpuPercent}%`} />
      <Stat title="Memory" value={formatBytes(diagnostics.process.memoryRss)} />
      <Row title="Heap" meta={formatBytes(diagnostics.process.heapUsed)} />
      <Row title="Uptime" meta={`${Math.round(diagnostics.process.uptimeSeconds / 60)} minutes`} />
    </Panel>
    <Panel title="Active Pollers">
      {diagnostics.pollers.map((poller) => <Row key={poller.name} title={poller.name} meta={`${poller.active ? "active" : "paused"}${poller.intervalMs ? ` - ${poller.intervalMs}ms` : ""}${poller.note ? ` - ${poller.note}` : ""}`} />)}
    </Panel>
    <Panel title="Sensor Cache">
      <Row title="Overlay" meta={`${diagnostics.overlay.refreshMs}ms${diagnostics.overlay.lowPowerMode ? " - low power" : ""}`} />
      <Row title="Light metrics cache" meta={diagnostics.cache.lightSnapshotAgeMs === null ? "empty" : `${diagnostics.cache.lightSnapshotAgeMs}ms old`} />
      <Row title="GPU cache" meta={diagnostics.cache.gpuAgeMs === null ? "empty" : `${diagnostics.cache.gpuAgeMs}ms old`} />
      <Row title="Network cache" meta={diagnostics.cache.networkAgeMs === null ? "empty" : `${diagnostics.cache.networkAgeMs}ms old`} />
      <Row title="Storage scanner" meta={`${diagnostics.storage.lastScanStatus}${diagnostics.storage.lastScanTarget ? ` - ${diagnostics.storage.lastScanTarget}` : ""}`} />
    </Panel>
  </div>;
}

function StressTests({ data, setData }: { data: AppData; setData: (data: AppData) => void }) {
  const [kind, setKind] = useState<StressTestKind>("cpu");
  const [duration, setDuration] = useState(30);
  const [memoryPercent, setMemoryPercent] = useState(15);
  const [session, setSession] = useState<StressTestSession | null>(null);
  const [message, setMessage] = useState("");
  useEffect(() => {
    const tick = () => window.assistant.system.stressStatus().then(setSession).catch(() => undefined);
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);
  async function start() {
    const label = kind === "cpu" ? "CPU Stability Test" : kind === "memory" ? "Memory Pressure Test" : kind === "disk" ? "Disk Speed Test" : "GPU Stability Test";
    if (kind === "gpu") {
      setMessage("GPU stress testing is disabled until a safe supported method is available.");
      return;
    }
    if (!confirm(`${label} may increase heat, fan speed, and power usage. Start for ${duration} seconds?`)) return;
    setMessage("");
    setSession(await window.assistant.system.stressStart({ kind, durationSeconds: duration, memoryPercent }));
  }
  async function stop() {
    setSession(await window.assistant.system.stressStop());
    setData(await window.assistant.data.get());
  }
  const active = !!session?.active;
  const current = session?.result;
  return <div className="stress-page">
    <div className="hero-row"><div><h2>Stress Tests</h2><p>Safe, short checks for stability and speed. Nothing starts automatically, and every test can be stopped.</p></div><button className="danger" onClick={stop} disabled={!active}><RotateCcw size={16} /> Emergency stop</button></div>
    {message && <div className="error">{message}</div>}
    <div className="columns">
      <Panel title="Choose Test"><div className="form">
        <select value={kind} onChange={(event) => setKind(event.target.value as StressTestKind)}><option value="cpu">CPU Stability Test</option><option value="memory">Memory Pressure Test</option><option value="disk">Disk Speed Test</option><option value="gpu">GPU Stability Test (disabled)</option></select>
        <label>Duration<select value={duration} onChange={(event) => setDuration(Number(event.target.value))}><option value={15}>15 seconds</option><option value={30}>30 seconds</option><option value={60}>1 minute</option><option value={180}>3 minutes</option></select></label>
        {kind === "memory" && <label>Memory pressure<input type="number" min={5} max={35} value={memoryPercent} onChange={(event) => setMemoryPercent(Number(event.target.value))} /></label>}
        <button onClick={start} disabled={active || kind === "gpu"}><Play size={16} /> Start test</button>
        <small>Auto-stop uses your configured temperature thresholds. RAM allocation is capped conservatively, and disk tests use temporary files that are removed afterward.</small>
      </div></Panel>
      <Panel title="Live Test"><SensorCard icon={<Activity size={18} />} label={current?.name ?? "No active test"} value={active ? `${session?.progress ?? 0}%` : current?.status ?? "Ready"} sub={current?.summary ?? "Pick a test to begin"} /><MiniChart points={[session?.live.cpuUsage ?? 0, session?.live.ramUsage ?? 0]} label="Live load" />{session && <><Row title="CPU" meta={`${session.live.cpuUsage}%${session.live.cpuTemp ? ` · ${session.live.cpuTemp}C` : " · temp unavailable"}`} /><Row title="Memory" meta={`${session.live.ramUsage}% used`} /><Row title="GPU temp" meta={session.live.gpuTemp ? `${session.live.gpuTemp}C` : "Unavailable"} /></>}</Panel>
      <Panel title="Last Result">{current ? <><Row title={current.name} meta={`${current.status} · ${current.durationSeconds}s`} /><Row title="Average / Peak" meta={`${current.averageUsage}% avg · ${current.peakUsage}% peak`} /><Row title="Temperature" meta={current.peakTemperature ? `${current.averageTemperature}C avg · ${current.peakTemperature}C peak` : "Unavailable"} />{current.warnings.map((warning) => <Row key={warning} title="Warning" meta={warning} />)}</> : <Empty text="Results appear after a test finishes." />}</Panel>
    </div>
    <Panel title="History"><div className="quick-actions"><button onClick={async () => setMessage(`Exported stress history: ${await window.assistant.system.stressExport()}`)}><FileText size={16} /> Export history</button></div>{data.stressTestHistory.slice(0, 10).map((item) => <Row key={item.id} title={item.name} meta={`${item.status} · ${new Date(item.startedAt).toLocaleString()} · avg ${item.averageUsage}% peak ${item.peakUsage}%`} />)} {!data.stressTestHistory.length && <Empty text="No saved stress test history yet." />}</Panel>
  </div>;
}

function StorageScanner({ data, setData }: { data: AppData; setData: (data: AppData) => void }) {
  const [targets, setTargets] = useState<StorageScanTarget[]>([]);
  const [scanMode, setScanMode] = useState<"drive" | "folder">("folder");
  const [selectedPath, setSelectedPath] = useState("");
  const [includeProtected, setIncludeProtected] = useState(false);
  const [safeOnly, setSafeOnly] = useState(true);
  const [minSize, setMinSize] = useState(100);
  const [fileType, setFileType] = useState("all");
  const [modifiedAfter, setModifiedAfter] = useState("");
  const [scan, setScan] = useState<StorageScanResult | null>(null);
  const [aiRecommendations, setAiRecommendations] = useState<AiStorageRecommendation[]>([]);
  const [aiBusy, setAiBusy] = useState(false);
  const [viewMode, setViewMode] = useState<"treemap" | "bars" | "types">("treemap");
  const [message, setMessage] = useState("");

  useEffect(() => {
    window.assistant.system.storageTargets().then((rows) => {
      setTargets(rows);
      const favorite = data.storageScanLocations.find((item) => item.pinned)?.path;
      const downloads = rows.find((row) => row.kind === "common" && row.label === "Downloads")?.path;
      setSelectedPath(favorite || downloads || rows[0]?.path || "");
      setScanMode((favorite && /^[a-z]:\\?$/i.test(favorite)) || rows[0]?.kind === "drive" ? "drive" : "folder");
    }).catch((error) => setMessage(String(error)));
    window.assistant.system.storageScanStatus().then((status) => setScan(status.result ?? status.cached)).catch(() => undefined);
  }, []);

  useEffect(() => {
    const timer = setInterval(async () => {
      const status = await window.assistant.system.storageScanStatus().catch(() => null);
      if (status?.result || status?.cached) setScan(status.result ?? status.cached);
    }, 1200);
    return () => clearInterval(timer);
  }, []);

  async function addFolder() {
    const folders = await window.assistant.files.chooseFolders();
    if (!folders.length) return;
    const next = folders.map((folder) => ({ path: folder, label: folder.split(/[\\/]/).filter(Boolean).pop() || folder, kind: "folder" as const }));
    setTargets((rows) => [...rows, ...next.filter((item) => !rows.some((row) => row.path.toLowerCase() === item.path.toLowerCase()))]);
    setScanMode("folder");
    setSelectedPath(folders[0]);
  }

  async function startScan() {
    if (!selectedPath) {
      setMessage("Choose a drive or folder to scan.");
      return;
    }
if (includeProtected && !confirm("Show protected/system files? These are hidden by default because they are required by Windows or apps. EclipOS will still not recommend deleting them.")) {
      setIncludeProtected(false);
      return;
    }
    setMessage("");
    setScan(await window.assistant.system.startStorageScan({
      targets: [selectedPath],
      targetType: scanMode,
      includeProtected,
      minSizeBytes: minSize * 1024 ** 2,
      fileType,
      modifiedAfter,
      safeOnly
    }));
  }

  async function cancelScan() {
    setScan(await window.assistant.system.cancelStorageScan());
  }

  async function togglePause() {
    setScan(scan?.status === "paused" ? await window.assistant.system.resumeStorageScan() : await window.assistant.system.pauseStorageScan());
  }

  async function generateAiRecommendations() {
    setAiBusy(true);
    setMessage("");
    try {
      setAiRecommendations(await window.assistant.ai.storageRecommendations());
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setAiBusy(false);
    }
  }

  const active = scan?.status === "running" || scan?.status === "paused";
  const drives = targets.filter((target) => target.kind === "drive");
  const recentLocations = data.storageScanLocations.slice().sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.lastScannedAt.localeCompare(a.lastScannedAt));
  const selectedTarget = targets.find((target) => target.path === selectedPath) ?? recentLocations.find((target) => target.path === selectedPath);
  const types = scan?.typeBreakdown.map((type) => type.type) ?? [];
  const filteredFiles = (scan?.largestFiles ?? []).filter((item) => !safeOnly || item.safety === "safe").filter((item) => fileType === "all" || item.extension === fileType);
  const filteredFolders = (scan?.largestFolders ?? []).filter((item) => !safeOnly || item.safety === "safe");
  const shownTreemap = (scan?.treemap.length ? scan.treemap : filteredFolders).slice(0, 18);
  const reclaimable = aiRecommendations.reduce((sum, item) => sum + item.estimatedReclaimableBytes, 0);
  const storageScore = scan ? Math.max(35, 100 - Math.min(55, Math.round((reclaimable / Math.max(scan.scannedBytes, 1)) * 100))) : 0;

  return (
    <div className="storage-scanner">
      <div className="hero-row">
        <div>
          <h2>Storage Scanner</h2>
          <p>Scan a full drive or one folder. Results stay focused on the selected target while Windows system locations stay hidden by default.</p>
        </div>
        <div className="quick-actions">
          <button onClick={() => setScanMode("drive")} className={scanMode === "drive" ? "active" : ""}><HardDrive size={16} /> Scan Full Drive</button>
          <button onClick={addFolder} className={scanMode === "folder" ? "active" : ""}><FolderOpen size={16} /> Scan Specific Folder</button>
          <button onClick={startScan} disabled={active}><Search size={16} /> {active ? "Scanning" : "Start scan"}</button>
          <button onClick={togglePause} disabled={!active}>{scan?.status === "paused" ? "Resume" : "Pause"}</button>
          <button className="danger" onClick={cancelScan} disabled={!active}><RotateCcw size={16} /> Cancel</button>
        </div>
      </div>

      {message && <div className="error">{message}</div>}

      <div className="scanner-layout">
        <Panel title="Scan Target">
          <div className="target-mode-card" onDragOver={(event) => event.preventDefault()} onDrop={(event) => {
            event.preventDefault();
            const dropped = Array.from(event.dataTransfer.files).map((file) => (file as File & { path?: string }).path).find(Boolean);
            if (dropped) {
              setScanMode("folder");
              setSelectedPath(dropped);
            }
          }}>
            <span>{scanMode === "drive" ? "Full drive" : "Specific folder"}</span>
            <strong>{selectedTarget?.label || selectedPath || "No target selected"}</strong>
            <small>{selectedPath || "Choose a drive or folder. You can also drag a folder here."}</small>
          </div>
          {scanMode === "drive" ? <select value={selectedPath} onChange={(event) => setSelectedPath(event.target.value)}>{drives.map((drive) => <option key={drive.path} value={drive.path}>{drive.label} - {drive.path}</option>)}</select> : <button onClick={addFolder}><FolderOpen size={16} /> Choose folder with Windows picker</button>}
          <div className="form inline-form">
            <select value={selectedPath} onChange={(event) => {
              const next = event.target.value;
              setSelectedPath(next);
              const recent = recentLocations.find((item) => item.path === next);
              if (recent) setScanMode(recent.kind);
            }}>
              <option value="">Recent scan locations</option>
              {recentLocations.map((item) => <option key={item.path} value={item.path}>{item.pinned ? "★ " : ""}{item.label} - {item.path}</option>)}
            </select>
            <button disabled={!selectedPath} onClick={async () => setData(await window.assistant.system.pinStorageLocation(selectedPath))}><Star size={15} fill={recentLocations.find((item) => item.path === selectedPath)?.pinned ? "currentColor" : "none"} /></button>
          </div>
          <small>Folders can be on C:, D:, E:, external drives, network folders, or paths with spaces.</small>
        </Panel>
        <Panel title="Filters & Safety">
          <div className="form">
            <label>Minimum size (MB)<input type="number" min="0" value={minSize} onChange={(event) => setMinSize(Number(event.target.value))} /></label>
            <label>File type<select value={fileType} onChange={(event) => setFileType(event.target.value)}><option value="all">All types</option>{types.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
            <label>Modified after<input type="date" value={modifiedAfter} onChange={(event) => setModifiedAfter(event.target.value)} /></label>
            <label><input type="checkbox" checked={safeOnly} onChange={(event) => setSafeOnly(event.target.checked)} /> Safe-to-review only</label>
            <label><input type="checkbox" checked={includeProtected} onChange={(event) => event.target.checked ? confirm("Protected/system files are hidden to keep cleanup safe. Show them for inspection only?") && setIncludeProtected(true) : setIncludeProtected(false)} /> Show protected/system files</label>
          </div>
        </Panel>
        <Panel title="Scan Progress">
          <SensorCard icon={<HardDrive size={18} />} label={scan?.status ?? "Ready"} value={scan ? formatBytes(scan.scannedBytes) : "No scan yet"} sub={scan ? `${scan.targetType === "drive" ? "Full drive" : "Folder"} scan · ${scan.scannedFiles} files · ${scan.scannedFolders} folders` : "Choose a target and start a scan"} />
          {scan && <Row title="Scanned path" meta={scan.targetPath || scan.roots[0]} action={<button onClick={() => window.assistant.files.open(scan.targetPath || scan.roots[0])}><FolderOpen size={15} /></button>} />}
          <div className="scan-path">{scan?.currentPath ?? "Protected Windows folders are excluded automatically."}</div>
          {scan?.finishedAt && <Row title="Last scan" meta={`${new Date(scan.finishedAt).toLocaleString()} · ${scan.roots.join(", ")}`} />}
        </Panel>
      </div>

      {scan && (
        <>
          <div className="ai-storage-panel">
            <div className="storage-score"><strong>{storageScore}</strong><span>Storage health</span></div>
            <div>
              <h2>AI Storage Recommendations</h2>
<p>{aiRecommendations.length ? `OpenAI found ${aiRecommendations.length} review categories and about ${formatBytes(reclaimable)} worth inspecting. Nothing is deleted automatically.` : "Generate recommendations with OpenAI after a scan. EclipOS sends a summarized scan, not the full file tree."}</p>
              <div className="quick-actions"><button onClick={generateAiRecommendations} disabled={aiBusy}><Sparkles size={15} /> {aiBusy ? "Analyzing..." : "Generate with OpenAI"}</button></div>
              <div className="insight-grid">{aiRecommendations.slice(0, 6).map((item) => <RecommendationCard key={item.id} item={item} />)}</div>
            </div>
          </div>
          <div className="tab-strip compact-tabs">
            <button className={viewMode === "treemap" ? "active" : ""} onClick={() => setViewMode("treemap")}>Treemap</button>
            <button className={viewMode === "bars" ? "active" : ""} onClick={() => setViewMode("bars")}>Bars</button>
            <button className={viewMode === "types" ? "active" : ""} onClick={() => setViewMode("types")}>File types</button>
            <button onClick={async () => setMessage(`Exported report: ${await window.assistant.system.exportStorageReport()}`)}><FileText size={15} /> Export report</button>
          </div>
          {viewMode === "treemap" && <Treemap items={shownTreemap} />}
          {viewMode === "bars" && <BarBreakdown items={filteredFolders.slice(0, 16)} />}
          {viewMode === "types" && <TypeBreakdown rows={scan.typeBreakdown} />}
          <div className="columns">
            <Panel title="Largest Folders">{filteredFolders.slice(0, 14).map((item) => <StorageRow key={item.path} item={item} />)} {!filteredFolders.length && <Empty text="No matching folders yet. Try lowering the minimum size or scanning another location." />}</Panel>
            <Panel title="Largest Files">{filteredFiles.slice(0, 14).map((item) => <StorageRow key={item.path} item={item} />)} {!filteredFiles.length && <Empty text="No matching files yet." />}</Panel>
            <Panel title="Skipped Protected Locations">{scan.skipped.slice(0, 20).map((item) => <Row key={item.path} title={item.protected ? "Protected" : "Skipped"} meta={`${item.path} · ${item.reason}`} />)} {!scan.skipped.length && <Empty text="No skipped locations were reported." />}</Panel>
          </div>
          <Panel title="Smart Cleanup Suggestions">{scan.suggestions.map((suggestion) => <Row key={suggestion} title="Review" meta={suggestion} />)}</Panel>
          <Panel title="Review Workflow"><div className="quick-actions"><button onClick={() => setSafeOnly(true)}>Safe cleanup only</button><button onClick={() => window.assistant.clipboard.copy(JSON.stringify(aiRecommendations, null, 2))}>Copy recommendation report</button><button disabled>Move to archive folder</button></div><small>Archive moving is intentionally disabled until a dedicated confirmation and undo flow is added. Use Open location and Copy path to review files first.</small></Panel>
        </>
      )}
    </div>
  );
}

function StorageRow({ item }: { item: StorageScanResult["largestFiles"][number] }) {
  const badge = item.safety === "safe" ? "Safe to review" : item.safety === "careful" ? "Be careful" : "System/protected";
  return <Row title={item.name} meta={`${formatBytes(item.size)} · ${item.fileCount} files · ${item.percent}% · ${new Date(item.modifiedAt).toLocaleDateString()} · ${badge} · ${item.path}`} action={<><button onClick={() => window.assistant.files.reveal(item.path)}><FolderOpen size={15} /></button><button onClick={() => window.assistant.clipboard.copy(item.path)}><Clipboard size={15} /></button></>} />;
}

function Treemap({ items }: { items: StorageScanItem[] }) {
  return <div className="treemap">{items.map((item, index) => <button key={item.path} className={`tree-tile ${item.safety}`} style={{ flexBasis: `${Math.max(12, item.percent)}%`, minHeight: `${70 + Math.min(90, item.percent * 2)}px` }} onClick={() => window.assistant.files.reveal(item.path)}><strong>{item.name || `Item ${index + 1}`}</strong><span>{formatBytes(item.size)} · {item.percent}%</span></button>)}</div>;
}

function BarBreakdown({ items }: { items: StorageScanItem[] }) {
  const max = Math.max(1, ...items.map((item) => item.size));
  return <Panel title="Largest Folder Bars">{items.map((item) => <div className="bar-row" key={item.path}><span>{item.name}</span><div><i style={{ width: `${Math.max(3, (item.size / max) * 100)}%` }} /></div><strong>{formatBytes(item.size)}</strong></div>)}</Panel>;
}

function TypeBreakdown({ rows }: { rows: StorageScanResult["typeBreakdown"] }) {
  return <div className="columns">{rows.slice(0, 12).map((row) => <div className="stat" key={row.type}><span>{row.type}</span><strong>{formatBytes(row.size)}</strong><small>{row.count} files · {row.percent}%</small></div>)}</div>;
}

function MiniChart({ points, label }: { points: number[]; label: string }) {
  const clean = points.slice(-48).map((point) => Number.isFinite(point) ? point : 0);
  const max = Math.max(1, ...clean);
  const pathData = clean.map((point, index) => `${index === 0 ? "M" : "L"} ${(index / Math.max(1, clean.length - 1)) * 100} ${42 - (point / max) * 38}`).join(" ");
  return <div className="mini-chart"><span>{label}</span><svg viewBox="0 0 100 44" preserveAspectRatio="none"><path d={pathData} /></svg></div>;
}

function FocusView({ data, setData }: { data: AppData; setData: React.Dispatch<React.SetStateAction<AppData>> }) {
  const [minutes, setMinutes] = useState(25);
  const [running, setRunning] = useState(false);
  const [goal, setGoal] = useState("");
  const [reminderText, setReminderText] = useState("");
  const [dueAt, setDueAt] = useState(() => datetimeInputValue(new Date(Date.now() + 30 * 60_000)));
  const reminders = [...data.reminders]
    .filter((reminder) => !reminder.completed)
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt))
    .slice(0, 6);

  async function saveReminder() {
    const text = reminderText.trim();
    const dueTime = new Date(dueAt);
    if (!text || Number.isNaN(dueTime.getTime())) return;
    const reminder: ReminderItem = {
      id: uid(),
      text,
      title: text,
      notes: "",
      dueAt: dueTime.toISOString(),
      completed: false,
      dismissed: false,
      notified: false,
      createdAt: now(),
      updatedAt: now()
    };
    setData(await window.assistant.reminders.save(reminder));
    setReminderText("");
    setDueAt(datetimeInputValue(new Date(Date.now() + 30 * 60_000)));
  }

  return (
    <section className="page">
      <div className="hero-row">
<div><h1>Focus gently.</h1><p>Set one intention, start a timer, and let EclipOS keep the rest nearby.</p></div>
        <button onClick={() => setRunning(!running)}><Timer size={16} /> {running ? "Pause" : "Start"} focus</button>
      </div>
      <div className="columns">
        <Panel title="Focus Timer">
          <div className="focus-large">{minutes}</div>
          <input type="range" min="5" max="90" step="5" value={minutes} onChange={(event) => setMinutes(Number(event.target.value))} />
          <p>{running ? "Timer running. Stay with the one thing." : "Choose a duration and press Start."}</p>
        </Panel>
        <Panel title="Daily Goal">
          <textarea value={goal} onChange={(event) => setGoal(event.target.value)} placeholder="What would make today feel complete?" />
          <button><TargetIcon /> Save goal</button>
        </Panel>
        <Panel title="Quick Reminder">
          <div className="form">
<input value={reminderText} onChange={(event) => setReminderText(event.target.value)} placeholder="What should EclipOS remind you about?" />
            <input type="datetime-local" value={dueAt} min={datetimeInputValue(new Date())} onChange={(event) => setDueAt(event.target.value)} />
            <button onClick={saveReminder} disabled={!reminderText.trim()}><Bell size={16} /> Schedule reminder</button>
          </div>
          {reminders.map((reminder) => (
            <Row
              key={reminder.id}
              title={reminderTitle(reminder)}
              meta={`${formatDistanceToNow(new Date(reminder.dueAt), { addSuffix: true })}${reminder.notifiedAt ? " - notified" : ""}`}
              action={<><button onClick={async () => setData(await window.assistant.reminders.toggleComplete(reminder.id))}><CheckCircle2 size={15} /></button><button onClick={async () => setData(await window.assistant.reminders.delete(reminder.id))}><Trash2 size={15} /></button></>}
            />
          ))}
{!reminders.length && <Empty text="Schedule a local reminder and EclipOS will notify you when it is due." />}
        </Panel>
      </div>
    </section>
  );
}

function WorkspacesView({ data, setData }: { data: AppData; setData: React.Dispatch<React.SetStateAction<AppData>> }) {
  const [manual, setManual] = useState("");
  return (
    <section className="page">
      <div className="hero-row">
        <div><h1>Your places, one click away.</h1><p>Keep favorite folders and projects ready, no matter which drive they live on.</p></div>
        <button onClick={async () => setData(await window.assistant.projects.select())}><FolderOpen size={16} /> Add workspace</button>
      </div>
      <div className="form inline-form"><input value={manual} onChange={(event) => setManual(event.target.value)} placeholder="Manual path, including D:, E:, external, or network folders" /><button onClick={async () => setData(await window.assistant.projects.setManual(manual))} disabled={!manual.trim()}>Add</button></div>
      <Panel title="Recent & Favorite Workspaces">
        {data.projects.map((project) => <Row key={project.path} title={project.name} meta={project.path} action={<><button onClick={async () => setData(await window.assistant.projects.setManual(project.path))}><FolderOpen size={15} /></button><button onClick={async () => setData(await window.assistant.projects.pin(project.path))}><Star size={15} fill={project.pinned ? "currentColor" : "none"} /></button></>} />)}
        {!data.projects.length && <Empty text="Add a folder or project to make it part of your daily workspace." />}
      </Panel>
    </section>
  );
}

function UtilitiesView({ stats, output }: { stats: SystemStats | null; output: string }) {
  return (
    <section className="page">
      <div className="hero-row"><div><h1>Small utilities, close by.</h1><p>Lightweight system awareness and shortcuts without the server-room mood.</p></div></div>
      <div className="stat-grid">
        <Stat title="CPU" value={`${stats?.cpuUsage ?? 0}%`} />
        <Stat title="Memory" value={stats ? `${formatBytes(stats.ramUsed)} used` : "Loading"} />
        <Stat title="Storage" value={stats?.disks[0] ? `${formatBytes(stats.disks[0].used)} used` : "Unavailable"} />
        <Stat title="Network" value={stats?.networks.length ? "Online" : "Offline"} />
      </div>
      <div className="columns">
        <Panel title="Helpful Folders">
          <button onClick={() => window.assistant.folders.openKnown("app")}>Open app folder</button>
          <button onClick={() => window.assistant.folders.openKnown("data")}>Open data folder</button>
          <button onClick={() => window.assistant.folders.openKnown("logs")}>Open logs folder</button>
        </Panel>
        <Panel title="Last Script Output"><pre className="mini-pre">{output}</pre></Panel>
        <Panel title="Processes">{stats?.processes.slice(0, 6).map((process) => <Row key={process.pid} title={process.name} meta={formatBytes(process.memory)} />) ?? <Empty text="Loading..." />}</Panel>
      </div>
    </section>
  );
}

function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function EntertainmentView({ data, setData }: { data: AppData; setData: (data: AppData) => void }) {
  const [snapshot, setSnapshot] = useState<EntertainmentSnapshot | null>(null);
  const [watchingStatus, setWatchingStatus] = useState<WatchingModeStatus | null>(null);
  const [recommendations, setRecommendations] = useState<EntertainmentRecommendation[]>(data.entertainmentRecommendations);
  const [settings, setSettings] = useState<AppSettings>(data.settings);
  const [message, setMessage] = useState("");
  useEffect(() => setSettings(data.settings), [data.settings]);
  useEffect(() => {
    let cancelled = false;
    const tick = () => {
      window.assistant.entertainment.status().then((next) => !cancelled && setSnapshot(next)).catch(() => undefined);
      window.assistant.entertainment.watchingStatus().then((next) => !cancelled && setWatchingStatus(next)).catch(() => undefined);
    };
    tick();
    const timer = setInterval(tick, 7000);
    return () => { cancelled = true; clearInterval(timer); };
  }, []);
  async function save(nextSettings = settings) {
    setData(await window.assistant.settings.save(nextSettings));
    setMessage("Entertainment settings saved.");
  }
  async function setManual(profile: AppSettings["entertainment"]["manualProfile"]) {
    const next = { ...settings, entertainment: { ...settings.entertainment, manualProfile: profile } };
    setSettings(next);
    await save(next);
    setSnapshot(await window.assistant.entertainment.status());
  }
  async function generatePicks() {
    try {
      const rows = await window.assistant.entertainment.recommendations();
      setRecommendations(rows);
      setData(await window.assistant.data.get());
      setMessage(rows.some((item) => item.source === "openai") ? "AI recommendations updated." : "Local recommendations updated. Add an OpenAI key for smarter picks.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    }
  }
  const recent = snapshot?.recent ?? data.entertainmentActivities;
  const active = snapshot?.activeSession;
return <section className="page entertainment-page"><div className="hero-row"><div><h2>Play & Watch</h2><p>EclipOS can quiet distractions, track your sessions locally, and help pick what to play or watch next.</p></div><div className="quick-actions"><button onClick={() => setManual(snapshot?.active ? "off" : "gaming")}><Gamepad2 size={16} /> {snapshot?.active ? "Exit Immersive" : "Gaming Mode"}</button><button onClick={() => setManual("watching")}><Film size={16} /> Watching Mode</button><button onClick={generatePicks}><Sparkles size={16} /> Tonight's Picks</button></div></div>{message && <div className="source-chips"><span>{message}</span></div>}<div className="entertainment-hero"><div><span>{watchingStatus?.active ? "Cinema Dimming Active" : snapshot?.active ? "Immersive Mode Active" : "Ready"}</span><strong>{watchingStatus?.active ? `Watching on ${watchingStatus.playbackDisplayLabel}` : snapshot?.profile === "off" || !snapshot ? "No media detected" : `${snapshot.profile} profile`}</strong><p>{watchingStatus?.active ? `${watchingStatus.app}: ${watchingStatus.title || "Fullscreen playback"} - dimming ${watchingStatus.dimmedDisplayIds.length} monitor${watchingStatus.dimmedDisplayIds.length === 1 ? "" : "s"}` : snapshot?.reason ?? "EclipOS is watching for games, media players, and streaming windows."}</p></div><div className="quick-actions"><button onClick={() => setManual("focus")}>Focus</button><button onClick={() => setManual("streaming")}>Streaming</button><button onClick={() => setManual("off")}>Off</button></div></div><div className="stat-grid"><Stat title="Game time" value={formatDuration(snapshot?.totals.gameSeconds ?? 0)} /><Stat title="Watch time" value={formatDuration(snapshot?.totals.watchSeconds ?? 0)} /><Stat title="This week" value={formatDuration(snapshot?.totals.thisWeekSeconds ?? 0)} /><Stat title="Sessions" value={String(snapshot?.totals.sessions ?? 0)} /></div><div className="columns wide-columns"><Panel title="Watching Mode"><Row title={watchingStatus?.active ? "Active" : "Inactive"} meta={watchingStatus?.reason ?? "Waiting for fullscreen playback"} /><Row title="Playback monitor" meta={watchingStatus?.playbackDisplayLabel || "Not detected"} /><Row title="Fullscreen" meta={watchingStatus?.fullscreen ? "Yes" : "No"} /><Row title="Dimmed monitors" meta={watchingStatus?.dimmedDisplayIds.length ? watchingStatus.dimmedDisplayIds.join(", ") : "None"} action={<button onClick={() => window.assistant.entertainment.previewDimming()}><Gauge size={15} /></button>} /></Panel><Panel title="Now Detected">{active && <Row title={active.title} meta={`${active.profile} - ${formatDuration(active.durationSeconds)} - ${active.appName}`} />}{snapshot?.detected.slice(0, 5).map((item) => <Row key={`${item.pid}-${item.title}`} title={item.title} meta={`${item.kind} - ${item.reason} - ${item.confidence}%`} />)}{!snapshot?.detected.length && <Empty text="Launch a game, media player, or streaming page and EclipOS will detect it." />}</Panel><Panel title="Cinema Settings"><div className="form"><label><input type="checkbox" checked={settings.entertainment.monitorDimmingEnabled} onChange={(e) => setSettings({ ...settings, entertainment: { ...settings.entertainment, monitorDimmingEnabled: e.target.checked } })} /> Dim other monitors during Watching Mode</label><label><input type="checkbox" checked={settings.entertainment.onlyDimFullscreenPlayback} onChange={(e) => setSettings({ ...settings, entertainment: { ...settings.entertainment, onlyDimFullscreenPlayback: e.target.checked } })} /> Only dim during fullscreen playback</label><label><input type="checkbox" checked={settings.entertainment.keepOverlayMonitorUndimmed} onChange={(e) => setSettings({ ...settings, entertainment: { ...settings.entertainment, keepOverlayMonitorUndimmed: e.target.checked } })} /> Keep overlay monitor undimmed</label><label>Dim amount {Math.round(settings.entertainment.dimAmount * 100)}%<input type="range" min="0.2" max="0.92" step="0.02" value={settings.entertainment.dimAmount} onChange={(e) => setSettings({ ...settings, entertainment: { ...settings.entertainment, dimAmount: Number(e.target.value) } })} /></label><label>Fade duration<input type="number" min="0" max="3000" step="50" value={settings.entertainment.dimFadeMs} onChange={(e) => setSettings({ ...settings, entertainment: { ...settings.entertainment, dimFadeMs: Number(e.target.value) } })} /></label><label><input type="checkbox" checked={settings.entertainment.dimDebug} onChange={(e) => setSettings({ ...settings, entertainment: { ...settings.entertainment, dimDebug: e.target.checked } })} /> Dimming debug logs</label><button onClick={() => window.assistant.entertainment.previewDimming()}><Gauge size={16} /> Preview dimming</button><button onClick={() => save()}><Save size={16} /> Save cinema settings</button></div></Panel></div><div className="columns wide-columns"><Panel title="Tonight's Picks"><div className="recommendation-grid">{recommendations.slice(0, 6).map((item) => <div className="recommendation-card" key={item.id}><span>{item.category} - {item.confidence}</span><strong>{item.title}</strong><p>{item.explanation}</p><small>{item.source === "openai" ? "OpenAI recommendation" : "Local insight"}</small></div>)}</div>{!recommendations.length && <Empty text="Generate picks after a little play/watch history, or ask the assistant what to play tonight." />}</Panel><Panel title="Privacy & Controls"><div className="form"><label><input type="checkbox" checked={settings.entertainment.trackingEnabled} onChange={(e) => setSettings({ ...settings, entertainment: { ...settings.entertainment, trackingEnabled: e.target.checked } })} /> Track sessions locally</label><label><input type="checkbox" checked={settings.entertainment.immersiveEnabled} onChange={(e) => setSettings({ ...settings, entertainment: { ...settings.entertainment, immersiveEnabled: e.target.checked } })} /> Enable immersive mode</label><label><input type="checkbox" checked={settings.entertainment.autoDetect} onChange={(e) => setSettings({ ...settings, entertainment: { ...settings.entertainment, autoDetect: e.target.checked } })} /> Auto-detect games/media</label><label><input type="checkbox" checked={settings.entertainment.suppressNotifications} onChange={(e) => setSettings({ ...settings, entertainment: { ...settings.entertainment, suppressNotifications: e.target.checked } })} /> Suppress non-critical notifications</label><label><input type="checkbox" checked={settings.entertainment.pauseBackgroundScans} onChange={(e) => setSettings({ ...settings, entertainment: { ...settings.entertainment, pauseBackgroundScans: e.target.checked } })} /> Pause scans/indexing</label><input value={settings.entertainment.excludedApps.join(", ")} onChange={(e) => setSettings({ ...settings, entertainment: { ...settings.entertainment, excludedApps: e.target.value.split(",").map((item) => item.trim()).filter(Boolean) } })} placeholder="Excluded apps, comma separated" /><button onClick={() => save()}><Save size={16} /> Save entertainment settings</button><button className="danger" onClick={async () => confirm("Clear entertainment history?") && setData(await window.assistant.entertainment.clear())}><Trash2 size={16} /> Clear history</button></div></Panel><Panel title="Recent Activity"><div className="activity-timeline">{recent.slice(0, 8).map((item) => <div className="timeline-item" key={item.id}><div><strong>{item.title}</strong><span>{item.kind} - {formatDuration(item.durationSeconds)} - {new Date(item.startedAt).toLocaleString()}</span></div><small>{item.profile}</small></div>)}</div>{!recent.length && <Empty text="Your local play/watch history will appear here." />}</Panel></div></section>;
}

function TargetIcon() {
  return <Lightbulb size={16} />;
}

function UpdatesView({ data, setData }: { data: AppData; setData: (data: AppData) => void }) {
  const [settings, setSettings] = useState<AppSettings>(data.settings);
  const [result, setResult] = useState<UpdateCheckResult | null>(null);
  const [message, setMessage] = useState("");
  useEffect(() => setSettings(data.settings), [data.settings]);
  async function save() {
    setData(await window.assistant.settings.save(settings));
    setMessage("Update settings saved.");
  }
  async function check() {
    const next = await window.assistant.updates.check();
    setResult(next);
setMessage(next.error ? next.error : next.available ? `EclipOS ${next.latest?.version} is available.` : "EclipOS is up to date.");
    setData(await window.assistant.data.get());
  }
  const latest = result?.latest;
return <section className="page"><div className="section-header"><h2>Updates</h2><button onClick={check}><Download size={16} /> Check now</button></div>{message && <div className={result?.error ? "error" : "source-chips"}><span>{message}</span></div>}<div className="editor-grid"><Panel title="Update Feed"><div className="form"><label><input type="checkbox" checked={settings.updates.enabled} onChange={(event) => setSettings({ ...settings, updates: { ...settings.updates, enabled: event.target.checked } })} /> Enable update checks</label><label><input type="checkbox" checked={settings.updates.checkOnStartup} onChange={(event) => setSettings({ ...settings, updates: { ...settings.updates, checkOnStartup: event.target.checked } })} /> Check when EclipOS starts</label><input value={settings.updates.feedUrl} onChange={(event) => setSettings({ ...settings, updates: { ...settings.updates, feedUrl: event.target.value } })} placeholder="https://downloads.example.com/latest.json" /><Row title="Current version" meta={result?.currentVersion ?? "Packaged app version"} /><Row title="Last checked" meta={settings.updates.lastCheckedAt ? new Date(settings.updates.lastCheckedAt).toLocaleString() : "Never"} /><button onClick={save}><Save size={16} /> Save update settings</button><small>Use the public latest.json URL from your VPS. EclipOS only checks for updates and opens downloads; it does not force-install them.</small></div></Panel><Panel title="Latest Release">{latest ? <div className="form"><Row title={`EclipOS ${latest.version}`} meta={`Published ${new Date(latest.publishedAt).toLocaleString()} - ${formatBytes(latest.fileSize)}`} /><p>{latest.releaseNotes || "No release notes were provided."}</p>{latest.sha256 && <pre className="mini-pre">SHA256: {latest.sha256}</pre>}<button onClick={() => window.assistant.updates.openDownload(latest.downloadUrl)}><Download size={16} /> Download installer</button>{latest.portableUrl && <button onClick={() => window.assistant.updates.openDownload(latest.portableUrl)}><Package size={16} /> Download portable</button>}</div> : <Empty text="Save your VPS update feed URL, then check for the latest release." />}</Panel><Panel title="Publishing Reminder"><Row title="Build locally" meta="npm run release" /><Row title="Upload to VPS" meta="Set VPS_HOST, then npm run deploy:vps" /><Row title="Stable URLs" meta="/download/latest and /latest.json" /></Panel></div></section>;
}

function SettingsView({ data, setData }: { data: AppData; setData: (data: AppData) => void }) {
  const [settings, setSettings] = useState<AppSettings>(data.settings);
  const [apiKey, setApiKey] = useState("");
  const [discordBackendToken, setDiscordBackendToken] = useState("");
  const [googleClientSecret, setGoogleClientSecret] = useState("");
  const [aiStatus, setAiStatus] = useState<AiStatus | null>(null);
  const [discord, setDiscord] = useState<DiscordStatus | null>(null);
  const [googleCalendar, setGoogleCalendar] = useState<any>(null);
  const [notice, setNotice] = useState("");
  useEffect(() => setSettings(data.settings), [data.settings]);
  useEffect(() => {
    window.assistant.ai.status().then(setAiStatus).catch(() => undefined);
    window.assistant.discord.status().then(setDiscord).catch(() => undefined);
    window.assistant.googleCalendar.status().then(setGoogleCalendar).catch(() => undefined);
  }, []);
  async function save() {
    try {
      setData(await window.assistant.settings.save(settings, apiKey || undefined));
      if (discordBackendToken.trim()) setDiscord(await window.assistant.discord.saveToken(discordBackendToken));
      setAiStatus(await window.assistant.ai.status());
      setDiscord(await window.assistant.discord.status());
      setGoogleCalendar(await window.assistant.googleCalendar.status());
      setApiKey("");
      setDiscordBackendToken("");
      setNotice("Settings saved.");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : String(err));
    }
  }
  async function testKey() {
    try {
      await window.assistant.ai.testKey(apiKey || undefined);
      setAiStatus(await window.assistant.ai.status());
      setNotice("OpenAI API key test succeeded.");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : String(err));
    }
  }
  async function testDiscord() {
    const result = await window.assistant.discord.testDm(discordBackendToken || undefined);
    setData(result.data);
    setDiscord(await window.assistant.discord.status());
    setNotice(result.ok ? "Discord DM test succeeded." : `Discord DM failed: ${result.error}`);
  }
  async function syncDiscord() {
    const next = await window.assistant.discord.sync();
    setData(next);
    setDiscord(await window.assistant.discord.status());
    setNotice("Reminders synced with the VPS backend.");
  }
  async function connectGoogle() {
    try {
      await saveCalendarSettings();
      setGoogleCalendar(await window.assistant.googleCalendar.connect());
      setData(await window.assistant.data.get());
      setNotice("Google Calendar connected.");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : String(err));
    }
  }
  async function saveCalendarSettings() {
    try {
      const next = await window.assistant.settings.save(settings, apiKey || undefined);
      if (googleClientSecret.trim()) {
        setGoogleCalendar(await window.assistant.googleCalendar.saveSecret(googleClientSecret));
        setGoogleClientSecret("");
      }
      setData(next);
      setSettings(next.settings);
      setGoogleCalendar(await window.assistant.googleCalendar.status());
      setNotice("Calendar settings saved.");
      return next;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setNotice(message);
      throw new Error(message);
    }
  }
  async function disconnectGoogle() {
    try {
      setGoogleCalendar(await window.assistant.googleCalendar.disconnect());
      setData(await window.assistant.data.get());
      setNotice("Google Calendar disconnected.");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : String(err));
    }
  }
  async function syncGoogle() {
    try {
      await saveCalendarSettings();
      setData(await window.assistant.googleCalendar.sync());
      setGoogleCalendar(await window.assistant.googleCalendar.status());
      setNotice("Google Calendar sync finished.");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : String(err));
    }
  }
  async function importData() {
    const raw = prompt("Paste exported JSON");
    if (raw) setData(await window.assistant.data.import(JSON.parse(raw)));
  }
  const setPrivacy = (key: keyof AppSettings["ai"]["privacy"], value: boolean) => setSettings({ ...settings, ai: { ...settings.ai, privacy: { ...settings.ai.privacy, [key]: value } } });
  return <section className="page">
    <h2>Settings</h2>
    {notice && <div className="source-chips"><span>{notice}</span></div>}
    <div className="editor-grid">
      <Panel title="Appearance & Startup">
        <div className="form">
          <select value={settings.theme} onChange={(e) => setSettings({ ...settings, theme: e.target.value as AppSettings["theme"] })}><option value="midnight">Midnight blue</option><option value="dark">Graphite dark</option><option value="oled">OLED black</option><option value="light">Light</option><option value="system">System</option></select>
          <input type="color" value={settings.accent} onChange={(e) => setSettings({ ...settings, accent: e.target.value })} />
          <input value={settings.globalShortcut} onChange={(e) => setSettings({ ...settings, globalShortcut: e.target.value })} />
          <label><input type="checkbox" checked={settings.launchAtStartup} onChange={(e) => setSettings({ ...settings, launchAtStartup: e.target.checked })} /> Open EclipOS at startup</label>
          <button onClick={save}><Save size={16} /> Save settings</button>
        </div>
      </Panel>
      <Panel title="Google Calendar">
        <div className="form">
          <Row title={googleCalendar?.connected ? "Google Calendar connected" : "Google Calendar disconnected"} meta={googleCalendar?.connectedEmail || "Not connected yet"} />
          <input value={settings.calendar.googleClientId} onChange={(e) => setSettings({ ...settings, calendar: { ...settings.calendar, googleClientId: e.target.value } })} placeholder="Google Desktop App Client ID" />
          <input type="password" value={googleClientSecret} onChange={(e) => setGoogleClientSecret(e.target.value)} placeholder={googleCalendar?.hasClientSecret ? "Google Client Secret saved securely - paste to replace" : "Google Client Secret"} />
          <label><input type="checkbox" checked={settings.calendar.syncEnabled} onChange={(e) => setSettings({ ...settings, calendar: { ...settings.calendar, syncEnabled: e.target.checked } })} /> Enable sync</label>
          <label>Default event length (minutes)<input type="number" min="15" step="15" value={settings.calendar.defaultDurationMinutes} onChange={(e) => setSettings({ ...settings, calendar: { ...settings.calendar, defaultDurationMinutes: Number(e.target.value) } })} /></label>
          <Row title="Last sync" meta={googleCalendar?.lastSyncAt ? `${new Date(googleCalendar.lastSyncAt).toLocaleString()}${googleCalendar.lastSyncError ? ` - ${googleCalendar.lastSyncError}` : ""}` : "Never"} />
          <div className="quick-actions">
            <button onClick={saveCalendarSettings}><Save size={16} /> Save calendar settings</button>
            <button onClick={connectGoogle}><CalendarDays size={16} /> Connect</button>
            <button onClick={syncGoogle}><RotateCcw size={16} /> Sync now</button>
            <button className="danger" onClick={disconnectGoogle}><Trash2 size={16} /> Disconnect</button>
          </div>
          <small>First version uses Google OAuth for a desktop app and stores the refresh token securely on this PC. Calendar events sync with your local Planner items.</small>
        </div>
      </Panel>
      <Panel title="Discord Reminder Backend">
        <div className="form">
          <Row title={discord?.configured ? "VPS reminder backend connected" : "VPS reminder backend not configured"} meta={`Target user ${settings.discord.targetUserId || "140478632165507073"} - ${discord?.secureStorage ? "OS secure storage" : "local encrypted storage unavailable"}`} />
          <label><input type="checkbox" checked={settings.discord.enabled} onChange={(e) => setSettings({ ...settings, discord: { ...settings.discord, enabled: e.target.checked } })} /> Enable Discord reminder DMs</label>
          <label><input type="checkbox" checked={settings.discord.syncEnabled} onChange={(e) => setSettings({ ...settings, discord: { ...settings.discord, syncEnabled: e.target.checked } })} /> Sync reminders with VPS</label>
          <input value={settings.discord.backendUrl} onChange={(e) => setSettings({ ...settings, discord: { ...settings.discord, backendUrl: e.target.value } })} placeholder="https://your-vps.example.com/reminders" />
          <input value={settings.discord.targetUserId} onChange={(e) => setSettings({ ...settings, discord: { ...settings.discord, targetUserId: e.target.value } })} placeholder="Discord user ID" />
          <input type="password" value={discordBackendToken} onChange={(e) => setDiscordBackendToken(e.target.value)} placeholder="Paste VPS backend API token" />
          <Row title="Last sync" meta={discord?.lastSyncAt ? `${discord.lastSyncStatus} - ${new Date(discord.lastSyncAt).toLocaleString()}${discord.lastSyncError ? ` - ${discord.lastSyncError}` : ""}` : "Never"} />
          <Row title="Last DM test" meta={discord?.lastTestAt ? `${discord.lastTestStatus} - ${new Date(discord.lastTestAt).toLocaleString()}${discord.lastTestError ? ` - ${discord.lastTestError}` : ""}` : "Never"} />
          <button onClick={testDiscord}><Bell size={16} /> Test Discord DM</button>
          <button onClick={syncDiscord}><RotateCcw size={16} /> Sync now</button>
          <button onClick={save}><Save size={16} /> Save Discord settings</button>
          <small>The desktop app stores only the VPS backend API token. The Discord bot token stays on the VPS in its .env file and is never needed on this PC.</small>
        </div>
      </Panel>
      <Panel title="OpenAI Assistant">
        <div className="form">
          <Row title={aiStatus?.configured ? "OpenAI connected" : "OpenAI disconnected"} meta={`${aiStatus?.model ?? settings.ai.model} - ${aiStatus?.secureStorage ? "OS secure storage" : "local encrypted storage unavailable"}`} />
          <input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="Paste a new OpenAI API key" />
          <input value={settings.ai.model} onChange={(event) => setSettings({ ...settings, ai: { ...settings.ai, model: event.target.value } })} placeholder="OpenAI model, e.g. gpt-4.1-mini" />
          <label><input type="checkbox" checked={settings.ai.previewContext} onChange={(event) => setSettings({ ...settings, ai: { ...settings.ai, previewContext: event.target.checked } })} /> Preview context before sending</label>
          <button onClick={testKey}><CheckCircle2 size={16} /> Test API key</button>
          <button onClick={save}><Save size={16} /> Save OpenAI settings</button>
        </div>
      </Panel>
      <Panel title="Home Customization">
        <div className="form">
          <label><input type="checkbox" checked={settings.home.compact} onChange={(e) => setSettings({ ...settings, home: { ...settings.home, compact: e.target.checked } })} /> Compact Home mode</label>
          <label><input type="checkbox" checked={settings.home.showTodayRail} onChange={(e) => setSettings({ ...settings, home: { ...settings.home, showTodayRail: e.target.checked } })} /> Show Today rail</label>
          {Object.entries(settings.home.widgets).filter(([key]) => key !== "codex").map(([key, value]) => <label key={key}><input type="checkbox" checked={Boolean(value)} onChange={(e) => setSettings({ ...settings, home: { ...settings.home, widgets: { ...settings.home.widgets, [key]: e.target.checked } } })} /> {key}</label>)}
          <button onClick={save}><Save size={16} /> Save Home settings</button>
        </div>
      </Panel>
      <Panel title="AI Privacy">
        <div className="form">
          <label><input type="checkbox" checked={settings.ai.privacy.hardwareStats} onChange={(e) => setPrivacy("hardwareStats", e.target.checked)} /> Include hardware stats</label>
          <label><input type="checkbox" checked={settings.ai.privacy.processNames} onChange={(e) => setPrivacy("processNames", e.target.checked)} /> Include process names</label>
          <label><input type="checkbox" checked={settings.ai.privacy.filePaths} onChange={(e) => setPrivacy("filePaths", e.target.checked)} /> Include file paths</label>
          <label><input type="checkbox" checked={settings.ai.privacy.storageScanSummaries} onChange={(e) => setPrivacy("storageScanSummaries", e.target.checked)} /> Include storage scan summaries</label>
          <button onClick={save}><Save size={16} /> Save privacy</button>
        </div>
      </Panel>
      <Panel title="Workspaces">
        <div className="form">
          <input value={settings.defaultWorkingDirectory} onChange={(e) => setSettings({ ...settings, defaultWorkingDirectory: e.target.value })} placeholder="Selected workspace, e.g. E:\\Projects\\My App" />
          <button onClick={async () => setData(await window.assistant.projects.select())}><FolderOpen size={16} /> Select workspace folder</button>
          <button onClick={save}><Save size={16} /> Save paths</button>
        </div>
      </Panel>
      <Panel title="Monitoring">
        <div className="form">
          <label>Refresh rate<input type="number" min="1500" step="500" value={settings.monitoring.refreshMs} onChange={(e) => setSettings({ ...settings, monitoring: { ...settings.monitoring, refreshMs: Number(e.target.value) } })} /></label>
          <label><input type="checkbox" checked={settings.monitoring.enableAlerts} onChange={(e) => setSettings({ ...settings, monitoring: { ...settings.monitoring, enableAlerts: e.target.checked } })} /> Enable health alerts</label>
          <label><input type="checkbox" checked={settings.monitoring.pauseWhenMinimized} onChange={(e) => setSettings({ ...settings, monitoring: { ...settings.monitoring, pauseWhenMinimized: e.target.checked } })} /> Pause when minimized</label>
          <label><input type="checkbox" checked={settings.monitoring.disableBackgroundIndexing} onChange={(e) => setSettings({ ...settings, monitoring: { ...settings.monitoring, disableBackgroundIndexing: e.target.checked } })} /> Disable background indexing</label>
          <button onClick={save}><Save size={16} /> Save monitoring</button>
        </div>
      </Panel>
      <Panel title="Performance Overlay">
        <div className="form">
          <label><input type="checkbox" checked={settings.monitoring.enableOverlay} onChange={(e) => setSettings({ ...settings, monitoring: { ...settings.monitoring, enableOverlay: e.target.checked } })} /> Enable overlay</label>
          <label><input type="checkbox" checked={settings.monitoring.lowPowerMode} onChange={(e) => setSettings({ ...settings, monitoring: { ...settings.monitoring, lowPowerMode: e.target.checked } })} /> Low-power mode</label>
          <label>Opacity<input type="range" min="0.35" max="1" step="0.05" value={settings.monitoring.overlayOpacity} onChange={(e) => setSettings({ ...settings, monitoring: { ...settings.monitoring, overlayOpacity: Number(e.target.value) } })} /></label>
          <label>Refresh ms<input type="number" min="750" step="250" value={settings.monitoring.overlayRefreshMs} onChange={(e) => setSettings({ ...settings, monitoring: { ...settings.monitoring, overlayRefreshMs: Number(e.target.value) } })} /></label>
          <button onClick={save}><Save size={16} /> Save overlay</button>
        </div>
      </Panel>
      <Panel title="EclipOS Data">
        <div className="form">
          <button onClick={() => window.assistant.folders.openKnown("app")}>Open app folder</button>
          <button onClick={() => window.assistant.folders.openKnown("data")}>Open data folder</button>
          <button onClick={() => window.assistant.folders.openKnown("logs")}>Open logs folder</button>
          <button onClick={async () => navigator.clipboard.writeText(await window.assistant.data.export())}>Export data</button>
          <button onClick={importData}>Import data</button>
          <button className="danger" onClick={async () => confirm("Reset notes, clipboard, file index, sessions, and workspaces?") && setData(await window.assistant.data.reset())}>Reset local data</button>
        </div>
      </Panel>
    </div>
  </section>;
}
function CommandPalette({ data, query, setQuery, close, runCommand, setView }: { data: AppData; query: string; setQuery: (q: string) => void; close: () => void; runCommand: (command: CommandItem) => void; setView: (view: string) => void }) {
  const commandMatches = data.commands.filter((command) => `${command.name} ${command.value}`.toLowerCase().includes(query.toLowerCase())).slice(0, 8);
  const fileMatches = data.fileIndex.filter((file) => `${file.name} ${file.path}`.toLowerCase().includes(query.toLowerCase())).slice(0, 6);
  return <div className="overlay" onMouseDown={close}><div className="palette" onMouseDown={(e) => e.stopPropagation()}><div className="palette-search"><Search size={18} /><input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Escape" && close()} placeholder="Type a command, file, note, or destination" /></div><h3>Commands</h3>{commandMatches.map((command) => <Row key={command.id} title={command.name} meta={command.value} action={<button onClick={() => runCommand(command)}><Play size={15} /></button>} />)}<h3>Files</h3>{fileMatches.map((file) => <Row key={file.id} title={file.name} meta={file.path} action={<button onClick={() => window.assistant.files.open(file.path)}><FolderOpen size={15} /></button>} />)}<h3>Destinations</h3>{nav.map(([id, Icon, label]) => <Row key={id} title={label} meta="Open view" action={<button onClick={() => { setView(id); close(); }}><Icon size={15} /></button>} />)}</div></div>;
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="panel"><div className="panel-title">{title}</div>{children}</div>;
}

function Row({ title, meta, action }: { title: string; meta: string; action?: React.ReactNode }) {
  return <div className="row"><div><strong>{title}</strong><span>{meta}</span></div><div className="row-actions">{action}</div></div>;
}

function Stat({ title, value }: { title: string; value: string }) {
  return <div className="stat"><span>{title}</span><strong>{value}</strong></div>;
}

function Empty({ text }: { text: string }) {
  return <div className="empty"><ShieldAlert size={18} /> {text}</div>;
}

function useOverlayFps(enabled: boolean) {
  const [fps, setFps] = useState<number | null>(null);
  useEffect(() => {
    if (!enabled) {
      setFps(null);
      return;
    }
    let frame = 0;
    let raf = 0;
    let last = performance.now();
    const loop = (nowTime: number) => {
      frame += 1;
      if (nowTime - last >= 1000) {
        setFps(Math.round((frame * 1000) / (nowTime - last)));
        frame = 0;
        last = nowTime;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [enabled]);
  return fps;
}

function OverlayApp() {
  const [snapshot, setSnapshot] = useState<LightSystemSnapshot | null>(null);
  const [settings, setSettings] = useState<MonitoringSettings>(emptyData.settings.monitoring);
  const lastSignature = React.useRef("");
  const overlayFps = useOverlayFps(settings.enableOverlay && settings.overlayMetrics.fps);
  useEffect(() => {
    document.documentElement.classList.add("overlay-root");
    document.body.classList.add("overlay-root");
    window.assistant.data.get().then((data) => setSettings(data.settings.monitoring)).catch(() => undefined);
    const stop = window.assistant.onOverlaySettings(setSettings);
    return () => {
      stop();
      document.documentElement.classList.remove("overlay-root");
      document.body.classList.remove("overlay-root");
    };
  }, []);
  useEffect(() => {
    if (!settings.enableOverlay) return;
    const tick = () => window.assistant.system.lightSnapshot().then((next) => {
      const signature = [
        next.cpu.usage,
        next.cpu.temperature ?? "x",
        next.gpu.usage ?? "x",
        next.gpu.temperature ?? "x",
        Math.round(next.ram.used / 1024 / 1024),
        Math.round((next.gpu.vramUsed ?? 0) / 1024 / 1024),
        Math.round(next.network.rxBps / 1024),
        Math.round(next.network.txBps / 1024)
      ].join("|");
      if (signature === lastSignature.current) return;
      lastSignature.current = signature;
      setSnapshot(next);
    }).catch(() => undefined);
    tick();
    const interval = settings.lowPowerMode ? Math.max(3000, settings.overlayRefreshMs) : Math.max(1000, settings.overlayRefreshMs);
    const timer = setInterval(tick, interval);
    return () => clearInterval(timer);
  }, [settings.enableOverlay, settings.overlayRefreshMs, settings.lowPowerMode]);
  const ramUsed = snapshot ? formatBytes(snapshot.ram.used) : "--";
  const ramTotal = snapshot ? formatBytes(snapshot.ram.total) : "--";
  const parts = [
    settings.overlayMetrics.cpu && <OverlayMetric key="cpu" label="CPU" value={snapshot ? `${snapshot.cpu.usage}%` : "--"} warn={(snapshot?.cpu.usage ?? 0) >= 85} />,
    settings.overlayMetrics.cpuTemp && <OverlayMetric key="cput" label="" value={snapshot?.cpu.temperature ? `${snapshot.cpu.temperature}C` : "CPU temp Unavailable"} warn={(snapshot?.cpu.temperature ?? 0) >= 85} />,
    settings.overlayMetrics.gpu && <OverlayMetric key="gpu" label="GPU" value={snapshot?.gpu.usage === null || !snapshot ? "Unavailable" : `${snapshot.gpu.usage}%`} warn={(snapshot?.gpu.usage ?? 0) >= 90} />,
    settings.overlayMetrics.gpuTemp && <OverlayMetric key="gput" label="" value={snapshot?.gpu.temperature ? `${snapshot.gpu.temperature}C` : "GPU temp Unavailable"} warn={(snapshot?.gpu.temperature ?? 0) >= 85} />,
    settings.overlayMetrics.ram && <OverlayMetric key="ram" label="RAM" value={`${ramUsed} / ${ramTotal}`} warn={snapshot ? snapshot.ram.used / snapshot.ram.total >= 0.9 : false} />,
    settings.overlayMetrics.vram && <OverlayMetric key="vram" label="VRAM" value={snapshot?.gpu.vramTotal ? `${formatBytes(snapshot.gpu.vramUsed ?? 0)} / ${formatBytes(snapshot.gpu.vramTotal)}` : "Unavailable"} />,
    settings.overlayMetrics.network && <OverlayMetric key="net" label="NET" value={snapshot ? `DL ${formatBytes(snapshot.network.rxBps)}/s UL ${formatBytes(snapshot.network.txBps)}/s` : "--"} />,
    settings.overlayMetrics.fps && <OverlayMetric key="fps" label="FPS" value={overlayFps === null ? "--" : `${overlayFps}`} />
  ].filter(Boolean);
  return <main className={`perf-overlay ${settings.overlayMode} ${settings.overlayShadow ? "with-shadow" : ""}`} style={{ opacity: settings.overlayOpacity, color: settings.overlayTextColor, fontSize: settings.overlayFontSize, gap: settings.overlaySpacing }}>
    {parts.map((part, index) => <React.Fragment key={index}>{part}{index < parts.length - 1 && <span className="overlay-separator">||</span>}</React.Fragment>)}
  </main>;
}

function OverlayMetric({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) {
  return <span className={warn ? "overlay-metric warn" : "overlay-metric"}>{label ? `${label}: ` : ""}{value}</span>;
}

createRoot(document.getElementById("root")!).render(location.hash === "#overlay" ? <OverlayApp /> : <App />);







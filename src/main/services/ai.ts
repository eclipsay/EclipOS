import type { WebContents } from "electron";
import { app } from "electron";
import fs from "node:fs/promises";
import path from "node:path";
import type { AiChatMessage, AiChatRequest, AiContextPreview, AiStatus, AiStorageRecommendation, AppData, ProcessInfo, StorageScanItem, StorageScanResult, SystemSnapshot } from "../../shared/types.js";
import { entertainmentSnapshot } from "./entertainment.js";
import { JsonStore } from "./storage.js";
import { getSystemSnapshot, storageScanStatus } from "./system.js";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const activeRequests = new Map<string, AbortController>();

const now = () => new Date().toISOString();

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
}

function redactPath(value: string) {
  if (!value) return "";
  const name = path.basename(value);
  const root = path.parse(value).root || "";
  return name ? `${root}...\\${name}` : "[path hidden]";
}

function safePath(value: string, allowPaths: boolean) {
  return allowPaths ? value : redactPath(value);
}

function compactProcesses(processes: ProcessInfo[], includeNames: boolean) {
  return processes.slice(0, 15).map((item) => ({
    pid: item.pid,
    name: includeNames ? item.name : `process-${item.pid}`,
    memory: item.memory,
    memoryLabel: formatBytes(item.memory),
    cpu: item.cpu,
    heavy: item.heavy,
    safeHint: item.safeHint
  }));
}

function compactStorageItems(items: StorageScanItem[] | undefined, allowPaths: boolean) {
  return (items ?? []).slice(0, 18).map((item) => ({
    name: item.name,
    path: safePath(item.path, allowPaths),
    type: item.type,
    size: item.size,
    sizeLabel: formatBytes(item.size),
    fileCount: item.fileCount,
    modifiedAt: item.modifiedAt,
    percent: item.percent,
    extension: item.extension,
    safety: item.safety,
    reason: item.reason
  }));
}

function categoryList(data: AppData, scan: StorageScanResult | null) {
  const categories = ["Hardware stats", "Memory", "Storage devices", "Network stats", "Startup apps"];
  if (data.settings.ai.privacy.processNames) categories.push("Process list");
  if (scan && data.settings.ai.privacy.storageScanSummaries) categories.push("Storage scan");
  if (data.settings.ai.privacy.filePaths) categories.push("File paths");
  return categories;
}

function summarizeSnapshot(snapshot: SystemSnapshot, data: AppData, scan: StorageScanResult | null) {
  const privacy = data.settings.ai.privacy;
  const ramPercent = Math.round((snapshot.ram.used / Math.max(snapshot.ram.total, 1)) * 100);
  const fullestDisk = snapshot.disks.slice().sort((a, b) => (b.used / Math.max(b.total, 1)) - (a.used / Math.max(a.total, 1)))[0];
  return {
    capturedAt: snapshot.capturedAt,
    health: { score: snapshot.healthScore, label: snapshot.healthLabel, alerts: snapshot.alerts },
    cpu: privacy.hardwareStats ? {
      model: snapshot.cpu.model,
      usage: snapshot.cpu.usage,
      clockMHz: snapshot.cpu.clockMHz,
      cores: snapshot.cpu.cores,
      temperature: snapshot.cpu.temperature,
      recentAverage: Math.round(average(snapshot.history.map((point) => point.cpuUsage)))
    } : "disabled by privacy settings",
    gpu: privacy.hardwareStats ? snapshot.gpu : "disabled by privacy settings",
    memory: {
      used: snapshot.ram.used,
      total: snapshot.ram.total,
      usedLabel: formatBytes(snapshot.ram.used),
      totalLabel: formatBytes(snapshot.ram.total),
      percent: ramPercent,
      speedMHz: snapshot.ram.speedMHz,
      recentAverage: Math.round(average(snapshot.history.map((point) => point.ramUsage)))
    },
    storage: {
      fullestDisk: fullestDisk ? {
        name: fullestDisk.name,
        label: fullestDisk.label,
        used: fullestDisk.used,
        total: fullestDisk.total,
        percent: Math.round((fullestDisk.used / Math.max(fullestDisk.total, 1)) * 100),
        readBps: fullestDisk.readBps,
        writeBps: fullestDisk.writeBps,
        temperature: fullestDisk.temperature
      } : null,
      scan: scan && privacy.storageScanSummaries ? {
        status: scan.status,
        roots: scan.roots.map((root) => safePath(root, privacy.filePaths)),
        scannedBytes: scan.scannedBytes,
        scannedBytesLabel: formatBytes(scan.scannedBytes),
        scannedFiles: scan.scannedFiles,
        skippedProtectedCount: scan.skipped.filter((item) => item.protected).length,
        largestFolders: compactStorageItems(scan.largestFolders, privacy.filePaths),
        largestFiles: compactStorageItems(scan.largestFiles, privacy.filePaths),
        duplicates: compactStorageItems(scan.duplicates, privacy.filePaths),
        typeBreakdown: scan.typeBreakdown.slice(0, 12)
      } : "no storage scan included"
    },
    network: {
      rxBps: snapshot.network.rxBps,
      txBps: snapshot.network.txBps,
      latencyMs: snapshot.network.latencyMs,
      adapterCount: snapshot.network.adapters.length
    },
    battery: snapshot.battery,
    uptimeSeconds: snapshot.uptime,
    startupApps: snapshot.startup.slice(0, 20).map((item) => ({
      name: privacy.processNames ? item.name : "startup item",
      enabled: item.enabled,
      impact: item.impact,
      source: privacy.filePaths ? item.source : "hidden"
    })),
    runningProcesses: privacy.processNames ? compactProcesses(snapshot.processes, true) : compactProcesses(snapshot.processes, false)
  };
}

function average(values: number[]) {
  const clean = values.filter((value) => Number.isFinite(value));
  return clean.length ? clean.reduce((sum, value) => sum + value, 0) / clean.length : 0;
}

async function buildContext(store: JsonStore): Promise<AiContextPreview> {
  const data = await store.read();
  const [snapshot, scanStatus, entertainment] = await Promise.all([
    getSystemSnapshot(data.settings.monitoring.historyLimit),
    storageScanStatus().catch(() => ({ active: false, result: null, cached: null })),
    entertainmentSnapshot(store).catch(() => null)
  ]);
  const scan = scanStatus.result ?? scanStatus.cached ?? null;
  const payload = {
    ...summarizeSnapshot(snapshot, data, scan),
    entertainment: entertainment ? {
      immersiveActive: entertainment.active,
      profile: entertainment.profile,
      totals: entertainment.totals,
      recent: entertainment.recent.slice(0, 20).map((item) => ({
        title: item.title,
        appName: item.appName,
        kind: item.kind,
        profile: item.profile,
        durationMinutes: Math.round(item.durationSeconds / 60),
        startedAt: item.startedAt
      }))
    } : "unavailable"
  };
  const categories = categoryList(data, scan);
  if (entertainment) categories.push("Entertainment activity");
  const redactions = [
    ...(data.settings.ai.privacy.filePaths ? [] : ["Full file paths are redacted"]),
    ...(data.settings.ai.privacy.processNames ? [] : ["Process names are anonymized"]),
    ...(data.settings.ai.privacy.eventLogs ? [] : ["Event logs are not included"]),
    ...(data.settings.ai.privacy.crashLogs ? [] : ["Crash logs are not included"])
  ];
  const summary = [
    `Health: ${snapshot.healthLabel} (${snapshot.healthScore}/100)`,
    `CPU: ${snapshot.cpu.usage}%${snapshot.cpu.temperature ? `, ${snapshot.cpu.temperature}C` : ""}`,
    `RAM: ${Math.round((snapshot.ram.used / Math.max(snapshot.ram.total, 1)) * 100)}% used`,
    scan ? `Storage scan: ${formatBytes(scan.scannedBytes)} scanned` : "Storage scan: not available",
    entertainment?.active ? `Immersive mode: ${entertainment.profile}` : "Immersive mode: inactive"
  ].join(" • ");
  return { summary, categories, redactions, payload };
}

function systemPrompt(mode: "simple" | "advanced") {
  return [
    "You are the AI PC Assistant inside EclipOS, a consumer-friendly Windows productivity and diagnostics app.",
    "Use the local system context provided by EclipOS. Explain in plain English first.",
    "If data is missing or privacy settings excluded it, say what is missing and suggest running diagnostics or enabling that data category.",
    "Never claim you deleted files, killed processes, disabled startup apps, edited registry keys, or changed system settings.",
    "Never recommend deleting Windows-critical folders, Program Files, driver stores, recovery/EFI/system boot files, pagefile/hiberfil/swapfile, or Windows servicing files.",
    "For storage cleanup, focus on user-managed folders, downloads, old installers, archives, cache/temp data, logs, media, duplicate candidates, and stale projects.",
    "For entertainment questions, use local play/watch history and immersive-mode state when available. Be honest when metadata such as genres, posters, or completion status is missing.",
    "Every recommendation should include the reason, risk level, and a reminder to review before deleting.",
    "Format every normal answer as polished Markdown. Avoid giant paragraphs.",
    "Use short sections, bullets, numbered steps, bold labels, inline code for commands/paths/process names, and tables only when they improve scanability.",
    "For PC diagnostics, use this structure when relevant: ## Summary, ## Likely Causes, ## Recommended Actions, ## Risk Level, ## Data Used.",
    "Use blockquotes for warnings or important notes, for example: > Warning: Review before deleting.",
    "Do not show raw JSON, raw logs, or massive dumps unless the user explicitly asks for them.",
    mode === "advanced" ? "Include an Advanced details section when useful." : "Keep the answer concise and approachable, with optional advanced details only when necessary."
  ].join("\n");
}

function friendlyOpenAiError(status: number, body: string) {
  const text = body.toLowerCase();
  if (status === 401) return "The OpenAI API key was rejected. Check the key in Settings and try Test API Key again.";
  if (status === 429) return "OpenAI is rate limiting this key right now. Wait a bit, then retry.";
  if (status === 402 || text.includes("billing") || text.includes("quota")) return "OpenAI reported a billing or quota issue for this key. Check billing and usage on the OpenAI account.";
  if (status >= 500) return "OpenAI is having trouble responding right now. Retry in a moment.";
  return `OpenAI request failed (${status}). ${body.slice(0, 400)}`;
}

async function callResponsesApi(apiKey: string, body: Record<string, unknown>, signal?: AbortSignal) {
  return fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body),
    signal
  });
}

export async function aiStatus(store: JsonStore): Promise<AiStatus> {
  const data = await store.read();
  return {
    configured: await store.hasOpenAiApiKey(),
    secureStorage: store.isSecureStorageAvailable(),
    model: data.settings.ai.model,
    privacy: data.settings.ai.privacy
  };
}

export async function previewAiContext(store: JsonStore): Promise<AiContextPreview> {
  return buildContext(store);
}

export async function getAiConversation(store: JsonStore) {
  return (await store.read()).aiConversation;
}

export async function clearAiConversation(store: JsonStore) {
  return store.patch((data) => ({ ...data, aiConversation: { messages: [], updatedAt: now() } }));
}

export async function exportAiConversation(store: JsonStore) {
  const data = await store.read();
  const file = path.join(app.getPath("documents"), `EclipOS-AI-Chat-${Date.now()}.json`);
  await fs.writeFile(file, JSON.stringify(data.aiConversation, null, 2), "utf8");
  return file;
}

export async function testOpenAiKey(store: JsonStore, keyOverride?: string) {
  const data = await store.read();
  const apiKey = keyOverride?.trim() || await store.getOpenAiApiKey();
  if (!apiKey) throw new Error("Add an OpenAI API key first.");
  const response = await callResponsesApi(apiKey, {
    model: data.settings.ai.model,
    input: "Reply with OK.",
    max_output_tokens: 16
  });
  if (!response.ok) throw new Error(friendlyOpenAiError(response.status, await response.text()));
  return true;
}

export async function sendAiMessage(store: JsonStore, request: AiChatRequest, webContents: WebContents) {
  const data = await store.read();
  const apiKey = await store.getOpenAiApiKey();
  if (!apiKey) throw new Error("OpenAI is not configured. Add an API key in Settings before using the AI PC Assistant.");

  const requestId = crypto.randomUUID();
  const controller = new AbortController();
  activeRequests.set(requestId, controller);
  webContents.send("ai:stream", { kind: "start", requestId });

  const userMessage: AiChatMessage = {
    id: crypto.randomUUID(),
    role: "user",
    content: request.message,
    createdAt: now()
  };

  try {
    const context = await buildContext(store);
    webContents.send("ai:stream", { kind: "sources", requestId, sources: context.categories });
    const history = data.aiConversation.messages.slice(-10).map((message) => `${message.role.toUpperCase()}: ${message.content}`).join("\n\n");
    const response = await callResponsesApi(apiKey, {
      model: data.settings.ai.model,
      stream: true,
      max_output_tokens: 1200,
      instructions: systemPrompt(request.mode),
      input: [
        history ? `Recent conversation:\n${history}` : "Recent conversation: none",
        "",
        `User question:\n${request.message}`,
        "",
        "EclipOS local context summary:",
        context.summary,
        "",
        "Context data JSON:",
        JSON.stringify(context.payload),
        "",
        context.redactions.length ? `Privacy redactions: ${context.redactions.join("; ")}` : "Privacy redactions: none"
      ].join("\n")
    }, controller.signal);

    if (!response.ok) throw new Error(friendlyOpenAiError(response.status, await response.text()));
    if (!response.body) throw new Error("OpenAI did not return a response stream.");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let content = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const raw = line.slice(5).trim();
        if (!raw || raw === "[DONE]") continue;
        const event = JSON.parse(raw) as any;
        const delta = event.type === "response.output_text.delta" ? event.delta : typeof event.delta === "string" && String(event.type ?? "").endsWith(".delta") ? event.delta : "";
        if (delta) {
          content += delta;
          webContents.send("ai:stream", { kind: "delta", requestId, delta });
        }
        if (event.type === "response.failed" || event.type === "error") {
          throw new Error(event.error?.message || "OpenAI response failed.");
        }
      }
    }

    const assistantMessage: AiChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: content.trim() || "OpenAI returned an empty response.",
      createdAt: now(),
      sources: context.categories
    };
    await store.patch((draft) => ({
      ...draft,
      aiConversation: {
        messages: [...draft.aiConversation.messages, userMessage, assistantMessage].slice(-80),
        updatedAt: now()
      }
    }));
    webContents.send("ai:stream", { kind: "done", requestId, message: assistantMessage });
    return { requestId };
  } catch (error) {
    const message = error instanceof Error && error.name === "AbortError" ? "The AI response was cancelled." : error instanceof Error ? error.message : String(error);
    const assistantMessage: AiChatMessage = { id: crypto.randomUUID(), role: "assistant", content: message, createdAt: now(), error: message };
    await store.patch((draft) => ({
      ...draft,
      aiConversation: { messages: [...draft.aiConversation.messages, userMessage, assistantMessage].slice(-80), updatedAt: now() }
    }));
    webContents.send("ai:stream", { kind: "error", requestId, error: message, message: assistantMessage });
    throw error;
  } finally {
    activeRequests.delete(requestId);
  }
}

export async function sendAiMessageText(store: JsonStore, request: AiChatRequest): Promise<AiChatMessage> {
  const data = await store.read();
  const apiKey = await store.getOpenAiApiKey();
  if (!apiKey) throw new Error("OpenAI is not configured. Add an API key in EclipOS Settings first.");
  const context = await buildContext(store);
  const history = data.aiConversation.messages.slice(-10).map((message) => `${message.role.toUpperCase()}: ${message.content}`).join("\n\n");
  const response = await callResponsesApi(apiKey, {
    model: data.settings.ai.model,
    max_output_tokens: 1000,
    instructions: systemPrompt(request.mode),
    input: [
      history ? `Recent conversation:\n${history}` : "Recent conversation: none",
      "",
      `User question:\n${request.message}`,
      "",
      "EclipOS local context summary:",
      context.summary,
      "",
      "Context data JSON:",
      JSON.stringify(context.payload),
      "",
      context.redactions.length ? `Privacy redactions: ${context.redactions.join("; ")}` : "Privacy redactions: none"
    ].join("\n")
  });
  if (!response.ok) throw new Error(friendlyOpenAiError(response.status, await response.text()));
  const json = await response.json() as any;
  const content = json.output_text ?? json.output?.flatMap((item: any) => item.content ?? []).map((item: any) => item.text ?? "").join("\n") ?? "";
  const userMessage: AiChatMessage = { id: crypto.randomUUID(), role: "user", content: request.message, createdAt: now() };
  const assistantMessage: AiChatMessage = {
    id: crypto.randomUUID(),
    role: "assistant",
    content: String(content).trim() || "OpenAI returned an empty response.",
    createdAt: now(),
    sources: context.categories
  };
  await store.patch((draft) => ({
    ...draft,
    aiConversation: {
      messages: [...draft.aiConversation.messages, userMessage, assistantMessage].slice(-80),
      updatedAt: now()
    }
  }));
  return assistantMessage;
}

export function cancelAiRequest(requestId: string) {
  const controller = activeRequests.get(requestId);
  if (!controller) return false;
  controller.abort();
  activeRequests.delete(requestId);
  return true;
}

function parseRecommendations(text: string): AiStorageRecommendation[] {
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[0]) as Array<Partial<AiStorageRecommendation>>;
    return parsed.map((item) => ({
      id: crypto.randomUUID(),
      category: item.category ?? "Review carefully",
      title: String(item.title ?? "Review storage item"),
      explanation: String(item.explanation ?? ""),
      estimatedReclaimableBytes: Number(item.estimatedReclaimableBytes ?? 0),
      priority: item.priority ?? "medium",
      sourcePaths: Array.isArray(item.sourcePaths) ? item.sourcePaths.map(String).slice(0, 8) : [],
      risk: String(item.risk ?? "Review before changing anything.")
    }));
  } catch {
    return [];
  }
}

export async function generateStorageRecommendations(store: JsonStore): Promise<AiStorageRecommendation[]> {
  const apiKey = await store.getOpenAiApiKey();
  if (!apiKey) throw new Error("OpenAI is not configured. Add an API key in Settings to generate AI storage recommendations.");
  const data = await store.read();
  const context = await buildContext(store);
  const response = await callResponsesApi(apiKey, {
    model: data.settings.ai.model,
    max_output_tokens: 1200,
    instructions: `${systemPrompt("advanced")}\nReturn only a JSON array of recommendations. Use categories: Safe to review, Review carefully, Advanced users only, Excluded/protected.`,
    input: `Generate storage cleanup recommendations from this EclipOS context. Include estimatedReclaimableBytes and sourcePaths when available. Context: ${JSON.stringify(context.payload)}`
  });
  if (!response.ok) throw new Error(friendlyOpenAiError(response.status, await response.text()));
  const json = await response.json() as any;
  const text = json.output_text ?? json.output?.flatMap((item: any) => item.content ?? []).map((item: any) => item.text ?? "").join("\n") ?? "";
  return parseRecommendations(text);
}

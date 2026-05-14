import { BrowserWindow } from "electron";
import { spawn } from "node:child_process";
import type { ChildProcessWithoutNullStreams } from "node:child_process";
import { access } from "node:fs/promises";
import path from "node:path";
import type { AppData, CodexAvailability, CodexRunRequest, CodexSession } from "../../shared/types.js";
import { changedFiles, gitStatus } from "./git.js";
import { detectExecutable, pathExists, validateDirectory } from "./tools.js";
import type { JsonStore } from "./storage.js";
import { log } from "./logger.js";

const mutatingWords = /\b(fix|add|implement|refactor|generate|test|debug|package|install|delete|remove|write|edit|update|build|execute|script)\b/i;
const activeChildren = new Map<string, ChildProcessWithoutNullStreams>();

function quoteCmdArg(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function spawnCodex(executablePath: string, args: string[], cwd?: string): ChildProcessWithoutNullStreams {
  if (process.platform === "win32" && /\.(cmd|bat)$/i.test(executablePath)) {
    const command = ["call", quoteCmdArg(executablePath), ...args.map(quoteCmdArg)].join(" ");
    return spawn(process.env.ComSpec || "cmd.exe", ["/d", "/c", command], {
      cwd,
      windowsHide: true,
      windowsVerbatimArguments: true
    });
  }

  return spawn(executablePath, args, {
    cwd,
    windowsHide: true
  });
}

export function codexPromptNeedsConfirmation(prompt: string): boolean {
  return mutatingWords.test(prompt);
}

export async function resolveCodexExecutable(data: AppData): Promise<{ executablePath: string; source: "settings" | "path" | "missing" }> {
  if (data.settings.codexExecutablePath && await pathExists(data.settings.codexExecutablePath)) {
    return { executablePath: data.settings.codexExecutablePath, source: "settings" };
  }
  const detected = (await detectExecutable("codex.exe")) || (await detectExecutable("codex.cmd")) || (await detectExecutable("codex"));
  return detected ? { executablePath: detected, source: "path" } : { executablePath: "", source: "missing" };
}

export async function codexAvailability(data: AppData): Promise<CodexAvailability> {
  const resolved = await resolveCodexExecutable(data);
  const projectFolder = data.settings.defaultWorkingDirectory;
  const projectValid = !!projectFolder && await pathExists(projectFolder);
  let version = "";
  if (resolved.executablePath) {
    try {
      version = await new Promise<string>((resolve) => {
        const child = spawnCodex(resolved.executablePath, ["--version"]);
        let output = "";
        child.stdout.on("data", (data) => (output += data.toString()));
        child.stderr.on("data", (data) => (output += data.toString()));
        child.on("close", () => resolve(output.trim()));
        child.on("error", () => resolve(""));
      });
    } catch {
      version = "";
    }
  }
  return {
    available: !!resolved.executablePath,
    executablePath: resolved.executablePath,
    source: resolved.source,
    version,
    projectFolder,
    projectValid,
    error: !projectFolder ? "No project selected." : projectValid ? undefined : `Project folder is missing or inaccessible: ${projectFolder}`
  };
}

export async function runCodexSession(store: JsonStore, request: CodexRunRequest, sender?: BrowserWindow): Promise<CodexSession> {
  const data = await store.read();
  const resolved = await resolveCodexExecutable(data);
  const projectFolder = data.settings.defaultWorkingDirectory;

  if (!resolved.executablePath) throw new Error("Codex CLI was not found. Install it or select the Codex executable in Settings.");
  if (!projectFolder) throw new Error("Select a project folder before running Codex.");
  const normalizedProject = await validateDirectory(projectFolder);
  if (!request.allowConcurrent && [...activeChildren.keys()].some((sessionId) => data.codexSessions.find((session) => session.id === sessionId)?.projectFolder === normalizedProject)) {
    throw new Error("A Codex session is already running in this project. Stop it first or explicitly allow concurrent sessions.");
  }
  await access(normalizedProject).catch(() => {
    throw new Error(`Project folder does not exist or is not accessible: ${normalizedProject}`);
  });

  const gitStatusBefore = await gitStatus(normalizedProject);
  const session: CodexSession = {
    id: crypto.randomUUID(),
    title: request.title,
    prompt: request.prompt,
    projectFolder: normalizedProject,
    executablePath: resolved.executablePath,
    status: "active",
    output: "",
    gitStatusBefore,
    changedFiles: [],
    startedAt: new Date().toISOString()
  };

  await store.patch((draft) => ({ ...draft, codexSessions: [session, ...draft.codexSessions].slice(0, 50) }));
  sender?.webContents.send("codex:session", session);

  const sandbox = request.requiresConfirmation ? "workspace-write" : "read-only";
  const args = ["exec", "--cd", normalizedProject, "--sandbox", sandbox, "--skip-git-repo-check", request.prompt];
  log("Starting Codex session", { id: session.id, executable: resolved.executablePath, cwd: normalizedProject, sandbox });

  const child = spawnCodex(resolved.executablePath, args, normalizedProject);
  child.stdin.end();
  activeChildren.set(session.id, child);

  const append = async (chunk: string) => {
    session.output += chunk;
    sender?.webContents.send("codex:session", { ...session });
    await store.patch((draft) => ({
      ...draft,
      codexSessions: draft.codexSessions.map((item) => item.id === session.id ? { ...session } : item)
    }));
  };

  child.stdout.on("data", (data) => void append(data.toString()));
  child.stderr.on("data", (data) => void append(data.toString()));

  child.on("error", async (error) => {
    activeChildren.delete(session.id);
    session.status = "failed";
    session.error = error.message;
    session.finishedAt = new Date().toISOString();
    await store.patch((draft) => ({
      ...draft,
      codexSessions: draft.codexSessions.map((item) => item.id === session.id ? { ...session } : item)
    }));
    sender?.webContents.send("codex:session", { ...session });
  });

  child.on("close", async (code) => {
    activeChildren.delete(session.id);
    session.exitCode = code;
    session.status = session.status === "cancelled" ? "cancelled" : code === 0 ? "completed" : "failed";
    session.finishedAt = new Date().toISOString();
    session.gitStatusAfter = await gitStatus(normalizedProject);
    session.changedFiles = await changedFiles(normalizedProject);
    await store.patch((draft) => ({
      ...draft,
      codexSessions: draft.codexSessions.map((item) => item.id === session.id ? { ...session } : item)
    }));
    sender?.webContents.send("codex:session", { ...session });
    log("Codex session finished", { id: session.id, code, changedFiles: session.changedFiles.length });
  });

  return session;
}

export async function cancelCodexSession(store: JsonStore, id: string, sender?: BrowserWindow): Promise<CodexSession> {
  const child = activeChildren.get(id);
  const data = await store.read();
  const session = data.codexSessions.find((item) => item.id === id);
  if (!session) throw new Error("Codex session not found.");
  if (!child) throw new Error("Codex session is not active.");
  session.status = "cancelled";
  session.output += "\n[Cancelled by user]\n";
  session.finishedAt = new Date().toISOString();
  child.kill();
  await store.patch((draft) => ({
    ...draft,
    codexSessions: draft.codexSessions.map((item) => item.id === id ? session : item)
  }));
  sender?.webContents.send("codex:session", session);
  return session;
}

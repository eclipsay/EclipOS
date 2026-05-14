import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { dialog, shell, app } from "electron";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export function normalizeUserPath(target: string): string {
  const trimmed = target.trim().replace(/^"|"$/g, "");
  return path.resolve(trimmed);
}

export async function pathExists(target: string): Promise<boolean> {
  try {
    await fs.access(normalizeUserPath(target));
    return true;
  } catch {
    return false;
  }
}

export async function validateDirectory(target: string): Promise<string> {
  const normalized = normalizeUserPath(target);
  let stat;
  try {
    stat = await fs.stat(normalized);
  } catch {
    throw new Error(`Folder does not exist or is not accessible: ${normalized}`);
  }
  if (!stat.isDirectory()) throw new Error(`Path is not a folder: ${normalized}`);
  return normalized;
}

export async function detectExecutable(name: string): Promise<string> {
  const command = process.platform === "win32" ? "where.exe" : "which";
  try {
    const { stdout } = await execFileAsync(command, [name], { windowsHide: true });
    const matches = stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    return matches.find((line) => /\.(exe|cmd|bat)$/i.test(line)) ?? matches[0] ?? "";
  } catch {
    return "";
  }
}

export async function selectExecutable(): Promise<string> {
  const result = await dialog.showOpenDialog({
    title: "Select Codex executable",
    properties: ["openFile"],
    filters: process.platform === "win32" ? [{ name: "Executables", extensions: ["exe", "cmd", "bat"] }] : undefined
  });
  return result.canceled ? "" : result.filePaths[0];
}

export async function selectProjectFolder(): Promise<string> {
  const result = await dialog.showOpenDialog({ title: "Select project folder", properties: ["openDirectory"] });
  return result.canceled ? "" : validateDirectory(result.filePaths[0]);
}

export async function openKnownFolder(kind: "app" | "data" | "logs"): Promise<string> {
  const target =
    kind === "app"
      ? path.dirname(app.getPath("exe"))
      : kind === "logs"
        ? path.join(app.getPath("userData"), "logs")
        : app.getPath("userData");
  await fs.mkdir(target, { recursive: true });
  const error = await shell.openPath(target);
  if (error) throw new Error(error);
  return target;
}

export function defaultWorkingDirectory(): string {
  return process.env.USERPROFILE || os.homedir();
}

export async function openFolder(target: string): Promise<string> {
  const normalized = await validateDirectory(target);
  const error = await shell.openPath(normalized);
  if (error) throw new Error(error);
  return normalized;
}

export async function openTerminal(target: string): Promise<void> {
  const cwd = await validateDirectory(target);
  if (process.platform === "win32") {
    await execFileAsync("cmd.exe", ["/c", "start", "powershell.exe", "-NoExit", "-NoProfile"], { cwd, windowsHide: false });
    return;
  }
  await shell.openPath(cwd);
}

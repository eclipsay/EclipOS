import { shell } from "electron";
import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import path from "node:path";
import type { CommandItem, CommandRunResult } from "../../shared/types.js";
import { isDangerousCommand } from "./security.js";

export async function executeCommand(item: CommandItem, allowDangerous = false, cwd?: string): Promise<CommandRunResult> {
  const startedAt = new Date().toISOString();
  const full = item.kind === "ssh" ? item.value : [item.value, item.args].filter(Boolean).join(" ");

  if ((item.dangerous || isDangerousCommand(full)) && !allowDangerous) {
    throw new Error("This command looks destructive and requires confirmation.");
  }

  if (item.kind === "website") {
    await shell.openExternal(item.value);
    return { commandId: item.id, stdout: "Opened website.", stderr: "", code: 0, startedAt, finishedAt: new Date().toISOString() };
  }

  if (item.kind === "file" || item.kind === "folder" || item.kind === "app") {
    await access(item.value).catch(() => {
      throw new Error(`Path does not exist or is not accessible: ${item.value}`);
    });
    const error = await shell.openPath(item.value);
    return { commandId: item.id, stdout: error ? "" : "Opened path.", stderr: error, code: error ? 1 : 0, startedAt, finishedAt: new Date().toISOString() };
  }

  const isWindows = process.platform === "win32";
  const child = spawn(isWindows ? "powershell.exe" : "sh", isWindows ? ["-NoProfile", "-Command", full] : ["-lc", full], {
    windowsHide: true,
    cwd: cwd && path.isAbsolute(cwd) ? cwd : undefined
  });

  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (data) => (stdout += data.toString()));
  child.stderr.on("data", (data) => (stderr += data.toString()));

  return new Promise((resolve) => {
    child.on("close", (code) => {
      resolve({ commandId: item.id, stdout, stderr, code, startedAt, finishedAt: new Date().toISOString() });
    });
  });
}

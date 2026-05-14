import { app } from "electron";
import fs from "node:fs";
import path from "node:path";

let logFile = "";

export function getLogsDir(): string {
  return path.join(app.getPath("userData"), "logs");
}

export function getLogFile(): string {
  if (!logFile) logFile = path.join(getLogsDir(), "startup.log");
  return logFile;
}

export function log(message: string, detail?: unknown): void {
  try {
    fs.mkdirSync(getLogsDir(), { recursive: true });
    const suffix = detail === undefined ? "" : ` ${typeof detail === "string" ? detail : JSON.stringify(detail)}`;
    fs.appendFileSync(getLogFile(), `[${new Date().toISOString()}] ${message}${suffix}\n`, "utf8");
  } catch {
    // Logging should never prevent startup.
  }
}

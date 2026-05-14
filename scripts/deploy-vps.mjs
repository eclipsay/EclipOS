import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const releaseDir = path.join(root, "release");
const unpackedDir = path.join(root, "release", "win-unpacked");
const pattern = `${releaseDir}\\*`.replaceAll("'", "''");

if (process.platform === "win32") {
  try {
    execFileSync("powershell.exe", [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      `$pattern = '${pattern}'; Get-Process | Where-Object { $_.Path -like $pattern } | Stop-Process -Force`
    ], { stdio: "inherit" });
  } catch {
    // No matching process, or Windows denied process inspection. Electron Builder will report any remaining lock.
  }
}

try {
  fs.rmSync(unpackedDir, { recursive: true, force: true });
} catch (error) {
  console.warn(`Could not remove ${unpackedDir}: ${error instanceof Error ? error.message : String(error)}`);
}

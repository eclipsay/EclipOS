import type { Dirent } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { dialog, shell } from "electron";
import type { FileRecord } from "../../shared/types.js";

const MAX_RECORDS_PER_FOLDER = 4000;

async function walk(root: string, records: FileRecord[], depth = 0): Promise<void> {
  if (records.length >= MAX_RECORDS_PER_FOLDER || depth > 8) return;
  let entries: Dirent[];
  try {
    entries = await fs.readdir(root, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (records.length >= MAX_RECORDS_PER_FOLDER) return;
    if (entry.name.startsWith(".") || ["node_modules", "AppData", "$Recycle.Bin"].includes(entry.name)) continue;
    const fullPath = path.join(root, entry.name);
    try {
      const stat = await fs.stat(fullPath);
      const type = entry.isDirectory() ? "folder" : "file";
      records.push({
        id: fullPath,
        name: entry.name,
        path: fullPath,
        directory: path.dirname(fullPath),
        type,
        extension: type === "file" ? path.extname(entry.name).replace(".", "").toLowerCase() : "folder",
        modifiedAt: stat.mtime.toISOString(),
        size: stat.size
      });
      if (entry.isDirectory()) await walk(fullPath, records, depth + 1);
    } catch {
      continue;
    }
  }
}

export async function chooseFolders(): Promise<string[]> {
  const result = await dialog.showOpenDialog({ properties: ["openDirectory", "multiSelections"] });
  return result.canceled ? [] : result.filePaths;
}

export async function indexFolders(folders: string[]): Promise<FileRecord[]> {
  const records: FileRecord[] = [];
  for (const folder of folders) {
    await walk(folder, records);
  }
  return records;
}

export async function openFile(target: string): Promise<string> {
  return shell.openPath(target);
}

export function revealFile(target: string): void {
  shell.showItemInFolder(target);
}

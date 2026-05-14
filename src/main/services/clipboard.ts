import { clipboard } from "electron";
import type { ClipboardItem } from "../../shared/types.js";
import { isSensitiveClipboard } from "./security.js";
import type { JsonStore } from "./storage.js";

export function startClipboardWatcher(store: JsonStore): NodeJS.Timeout {
  let last = clipboard.readText();
  return setInterval(async () => {
    const text = clipboard.readText();
    if (!text || text === last || isSensitiveClipboard(text)) return;
    last = text;
    await store.patch((data) => {
      const exists = data.clipboard.some((item) => item.text === text);
      const limit = Math.max(20, data.settings.monitoring.maxClipboardEntries || 80);
      if (!exists) {
        data.clipboard = [
          { id: crypto.randomUUID(), text, pinned: false, createdAt: new Date().toISOString() },
          ...data.clipboard
        ].slice(0, limit);
      }
      return data;
    });
  }, 2500);
}

import type { AppData, DiscordStatus, ReminderItem } from "../../shared/types.js";
import type { JsonStore } from "./storage.js";

export const DISCORD_REMINDER_USER_ID = "203025242753335296";

type ReminderPatch = Partial<Pick<ReminderItem,
  "title" | "text" | "notes" | "dueAt" | "priority" | "category" | "completed" | "dismissed" | "discordNotificationStatus"
>>;

function cleanUrl(url: string) {
  return url.trim().replace(/\/+$/, "");
}

function reminderBackendUrl(data: AppData) {
  return cleanUrl(data.settings.discord.backendUrl || process.env.ECLIPOS_REMINDER_BACKEND_URL || "");
}

async function backendToken(store: JsonStore, override?: string) {
  return override?.trim() || await store.getDiscordBackendToken();
}

async function reminderBackendFetch(store: JsonStore, path: string, init?: RequestInit, tokenOverride?: string) {
  const data = await store.read();
  const baseUrl = reminderBackendUrl(data);
  if (!baseUrl) throw new Error("Reminder backend URL is not configured. Add your VPS URL in Notification settings.");
  const token = await backendToken(store, tokenOverride);
  if (!token) throw new Error("Reminder backend API token is not configured. Save the backend token from your VPS .env file.");
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });
  if (!response.ok) {
    let message = `Reminder backend returned HTTP ${response.status}.`;
    try {
      const payload = await response.json() as { error?: string };
      if (payload.error) message = payload.error;
    } catch {
      const text = await response.text().catch(() => "");
      if (text) message = text.slice(0, 300);
    }
    throw new Error(message);
  }
  return response;
}

function normalizeRemoteReminder(reminder: any): ReminderItem {
  const title = String(reminder.title || reminder.text || "Reminder").trim();
  return {
    id: String(reminder.id),
    text: title,
    title,
    notes: String(reminder.notes || "").trim(),
    dueAt: String(reminder.dueAt),
    priority: reminder.priority ? String(reminder.priority) : undefined,
    category: reminder.category ? String(reminder.category) : undefined,
    completed: Boolean(reminder.completed),
    dismissed: Boolean(reminder.dismissed),
    notified: Boolean(reminder.notified),
    notifiedAt: reminder.notifiedAt || undefined,
    dismissedAt: reminder.dismissedAt || undefined,
    discordNotificationStatus: reminder.discordNotificationStatus || "pending",
    discordNotificationSentAt: reminder.discordNotificationSentAt || undefined,
    discordNotificationError: reminder.discordNotificationError || undefined,
    createdAt: String(reminder.createdAt || new Date().toISOString()),
    updatedAt: String(reminder.updatedAt || new Date().toISOString())
  };
}

function mergeReminderLists(local: ReminderItem[], remote: ReminderItem[]) {
  const map = new Map<string, ReminderItem>();
  for (const reminder of local) map.set(reminder.id, reminder);
  for (const reminder of remote) {
    const existing = map.get(reminder.id);
    if (!existing || new Date(reminder.updatedAt).getTime() >= new Date(existing.updatedAt).getTime()) {
      map.set(reminder.id, reminder);
    }
  }
  return Array.from(map.values()).sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
}

async function markSync(store: JsonStore, status: "success" | "failed", error?: string) {
  const now = new Date().toISOString();
  return store.patch((draft) => ({
    ...draft,
    settings: {
      ...draft.settings,
      discord: {
        ...draft.settings.discord,
        lastSyncAt: now,
        lastSyncStatus: status,
        lastSyncError: error
      }
    }
  }));
}

export async function discordStatus(store: JsonStore): Promise<DiscordStatus> {
  const data = await store.read();
  return {
    enabled: data.settings.discord.enabled,
    configured: Boolean(reminderBackendUrl(data)) && await store.hasDiscordBackendToken(),
    targetUserId: data.settings.discord.targetUserId || DISCORD_REMINDER_USER_ID,
    backendUrl: reminderBackendUrl(data),
    syncEnabled: data.settings.discord.syncEnabled,
    secureStorage: store.isSecureStorageAvailable(),
    lastSyncAt: data.settings.discord.lastSyncAt,
    lastSyncStatus: data.settings.discord.lastSyncStatus,
    lastSyncError: data.settings.discord.lastSyncError,
    lastTestAt: data.settings.discord.lastTestAt,
    lastTestStatus: data.settings.discord.lastTestStatus,
    lastTestError: data.settings.discord.lastTestError
  };
}

export async function saveDiscordBackendToken(store: JsonStore, token: string) {
  await store.saveDiscordBackendToken(token);
  return discordStatus(store);
}

export async function testDiscordDm(store: JsonStore, tokenOverride?: string) {
  try {
    const response = await reminderBackendFetch(store, "/api/testdm", { method: "POST" }, tokenOverride);
    const payload = await response.json().catch(() => ({}));
    const updated = await store.patch((draft) => ({
      ...draft,
      settings: {
        ...draft.settings,
        discord: { ...draft.settings.discord, lastTestAt: new Date().toISOString(), lastTestStatus: "success", lastTestError: undefined }
      }
    }));
    return { ok: true, data: updated, payload };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const updated = await store.patch((draft) => ({
      ...draft,
      settings: {
        ...draft.settings,
        discord: { ...draft.settings.discord, lastTestAt: new Date().toISOString(), lastTestStatus: "failed", lastTestError: message }
      }
    }));
    return { ok: false, error: message, data: updated };
  }
}

export async function syncReminders(store: JsonStore) {
  const data = await store.read();
  if (!data.settings.discord.enabled || !data.settings.discord.syncEnabled) return data;
  if (!reminderBackendUrl(data) || !(await store.hasDiscordBackendToken())) return data;
  try {
    const response = await reminderBackendFetch(store, "/api/reminders/sync", {
      method: "POST",
      body: JSON.stringify({ reminders: data.reminders })
    });
    const payload = await response.json() as { reminders?: unknown[] };
    const remote = (payload.reminders ?? []).map(normalizeRemoteReminder);
    const merged = mergeReminderLists(data.reminders, remote);
    const now = new Date().toISOString();
    return store.patch((draft) => ({
      ...draft,
      reminders: merged,
      settings: {
        ...draft.settings,
        discord: {
          ...draft.settings.discord,
          lastSyncAt: now,
          lastSyncStatus: "success",
          lastSyncError: undefined
        }
      }
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return markSync(store, "failed", message);
  }
}

export async function pushReminderToBackend(store: JsonStore, reminder: ReminderItem) {
  const data = await store.read();
  if (!data.settings.discord.enabled || !data.settings.discord.syncEnabled) return;
  await reminderBackendFetch(store, `/api/reminders/${encodeURIComponent(reminder.id)}`, {
    method: "PUT",
    body: JSON.stringify({ reminder })
  });
}

export async function patchReminderOnBackend(store: JsonStore, id: string, patch: ReminderPatch) {
  const data = await store.read();
  if (!data.settings.discord.enabled || !data.settings.discord.syncEnabled) return;
  await reminderBackendFetch(store, `/api/reminders/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ patch })
  });
}

export async function deleteReminderOnBackend(store: JsonStore, id: string) {
  const data = await store.read();
  if (!data.settings.discord.enabled || !data.settings.discord.syncEnabled) return;
  await reminderBackendFetch(store, `/api/reminders/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function retryReminderOnBackend(store: JsonStore, id: string) {
  const data = await store.read();
  if (!data.settings.discord.enabled || !data.settings.discord.syncEnabled) return;
  await reminderBackendFetch(store, `/api/reminders/${encodeURIComponent(id)}/retry`, { method: "POST" });
}

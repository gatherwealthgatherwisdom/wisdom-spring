import type { ConversationView, MessageView } from "@spring/shared";
import * as SQLite from "expo-sqlite";
import { Platform } from "react-native";
import { hydrateMediaMap } from "./media";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY NOT NULL,
  userId TEXT NOT NULL,
  status TEXT NOT NULL,
  mode TEXT NOT NULL,
  pinnedAt TEXT,
  lastMessageAt TEXT NOT NULL,
  payload TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS conversations_user_last ON conversations (userId, lastMessageAt DESC);
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY NOT NULL,
  userId TEXT NOT NULL,
  conversationId TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  payload TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS messages_conv ON messages (conversationId, createdAt, id);
CREATE TABLE IF NOT EXISTS sync_meta (
  userId TEXT PRIMARY KEY NOT NULL,
  pulledAt TEXT
);
CREATE TABLE IF NOT EXISTS media (
  url TEXT PRIMARY KEY NOT NULL,
  localPath TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS pending_ops (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId TEXT NOT NULL,
  conversationId TEXT NOT NULL,
  kind TEXT NOT NULL,
  payload TEXT NOT NULL
);
`;

export type PendingKind = "pin" | "rename" | "status" | "delete";

export type PendingOp = {
  id: number;
  userId: string;
  conversationId: string;
  kind: PendingKind;
  payload: string;
};

type Memory = {
  conversations: Map<string, { userId: string; item: ConversationView }>;
  messages: Map<string, { userId: string; conversationId: string; createdAt: string; item: MessageView }>;
  ops: PendingOp[];
  media: Map<string, string>;
  pulledAt: Map<string, string>;
  nextOp: number;
};

const memory: Memory = {
  conversations: new Map(),
  messages: new Map(),
  ops: [],
  media: new Map(),
  pulledAt: new Map(),
  nextOp: 1,
};

function usesMemory(): boolean {
  return Platform.OS === "web";
}

let opened: Promise<SQLite.SQLiteDatabase> | null = null;

async function database(): Promise<SQLite.SQLiteDatabase> {
  if (usesMemory()) throw new Error("history-memory");
  if (!opened) {
    opened = SQLite.openDatabaseAsync("spring-history.db")
      .then(async (db) => {
        await db.execAsync(SCHEMA);
        return db;
      })
      .catch((error) => {
        opened = null;
        throw error;
      });
  }
  return opened;
}

function parseConversation(payload: string): ConversationView | null {
  try {
    return JSON.parse(payload) as ConversationView;
  } catch {
    return null;
  }
}

function parseMessage(payload: string): MessageView | null {
  try {
    return JSON.parse(payload) as MessageView;
  } catch {
    return null;
  }
}

function likeNeedle(raw: string): string {
  return `%${raw.replace(/[%_]/g, "")}%`;
}

export async function listConversations(userId: string): Promise<ConversationView[]> {
  if (usesMemory()) {
    return [...memory.conversations.values()]
      .filter((row) => row.userId === userId)
      .map((row) => row.item)
      .sort((left, right) => right.lastMessageAt.localeCompare(left.lastMessageAt));
  }
  const db = await database();
  const rows = await db.getAllAsync<{ payload: string }>(
    "SELECT payload FROM conversations WHERE userId = ? ORDER BY lastMessageAt DESC",
    [userId],
  );
  return rows.map((row) => parseConversation(row.payload)).filter((row): row is ConversationView => Boolean(row));
}

export async function getConversation(userId: string, id: string): Promise<ConversationView | null> {
  if (usesMemory()) {
    const row = memory.conversations.get(id);
    return row && row.userId === userId ? row.item : null;
  }
  const db = await database();
  const row = await db.getFirstAsync<{ payload: string }>(
    "SELECT payload FROM conversations WHERE userId = ? AND id = ?",
    [userId, id],
  );
  return row ? parseConversation(row.payload) : null;
}

export async function upsertConversation(userId: string, item: ConversationView): Promise<void> {
  if (usesMemory()) {
    memory.conversations.set(item.id, { userId, item });
    return;
  }
  const db = await database();
  await db.runAsync(
    `INSERT OR REPLACE INTO conversations (id, userId, status, mode, pinnedAt, lastMessageAt, payload)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [item.id, userId, item.status, item.mode, item.pinnedAt, item.lastMessageAt, JSON.stringify(item)],
  );
}

export async function deleteConversation(userId: string, id: string): Promise<void> {
  if (usesMemory()) {
    memory.conversations.delete(id);
    for (const [key, row] of [...memory.messages]) {
      if (row.userId === userId && row.conversationId === id) memory.messages.delete(key);
    }
    return;
  }
  const db = await database();
  await db.runAsync("DELETE FROM messages WHERE userId = ? AND conversationId = ?", [userId, id]);
  await db.runAsync("DELETE FROM conversations WHERE userId = ? AND id = ?", [userId, id]);
}

export async function listMessages(userId: string, conversationId: string): Promise<MessageView[]> {
  if (usesMemory()) {
    return [...memory.messages.values()]
      .filter((row) => row.userId === userId && row.conversationId === conversationId)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.item.id.localeCompare(right.item.id))
      .map((row) => row.item);
  }
  const db = await database();
  const rows = await db.getAllAsync<{ payload: string }>(
    "SELECT payload FROM messages WHERE userId = ? AND conversationId = ? ORDER BY createdAt ASC, id ASC",
    [userId, conversationId],
  );
  return rows.map((row) => parseMessage(row.payload)).filter((row): row is MessageView => Boolean(row));
}

export async function replaceMessages(userId: string, conversationId: string, items: MessageView[]): Promise<void> {
  if (usesMemory()) {
    for (const [key, row] of [...memory.messages]) {
      if (row.userId === userId && row.conversationId === conversationId) memory.messages.delete(key);
    }
    for (const item of items) {
      memory.messages.set(item.id, { userId, conversationId, createdAt: item.createdAt, item });
    }
    return;
  }
  const db = await database();
  await db.withTransactionAsync(async () => {
    await db.runAsync("DELETE FROM messages WHERE userId = ? AND conversationId = ?", [userId, conversationId]);
    for (const item of items) {
      await db.runAsync(
        `INSERT OR REPLACE INTO messages (id, userId, conversationId, createdAt, payload) VALUES (?, ?, ?, ?, ?)`,
        [item.id, userId, conversationId, item.createdAt, JSON.stringify(item)],
      );
    }
  });
}

export async function searchConversationIds(userId: string, needle: string): Promise<string[]> {
  const q = likeNeedle(needle.trim());
  if (q === "%%") return [];
  if (usesMemory()) {
    const token = needle.trim();
    const ids = new Set<string>();
    for (const row of memory.conversations.values()) {
      if (row.userId === userId && JSON.stringify(row.item).includes(token)) ids.add(row.item.id);
    }
    for (const row of memory.messages.values()) {
      if (row.userId === userId && JSON.stringify(row.item).includes(token)) ids.add(row.conversationId);
    }
    return [...ids];
  }
  const db = await database();
  const rows = await db.getAllAsync<{ id: string }>(
    `SELECT id FROM conversations
     WHERE userId = ? AND (payload LIKE ?)
     UNION
     SELECT conversationId AS id FROM messages
     WHERE userId = ? AND payload LIKE ?`,
    [userId, q, userId, q],
  );
  return rows.map((row) => row.id);
}

export async function enqueueOp(
  userId: string,
  conversationId: string,
  kind: PendingKind,
  payload: unknown,
): Promise<void> {
  if (usesMemory()) {
    memory.ops.push({
      id: memory.nextOp,
      userId,
      conversationId,
      kind,
      payload: JSON.stringify(payload),
    });
    memory.nextOp += 1;
    return;
  }
  const db = await database();
  await db.runAsync(
    "INSERT INTO pending_ops (userId, conversationId, kind, payload) VALUES (?, ?, ?, ?)",
    [userId, conversationId, kind, JSON.stringify(payload)],
  );
}

export async function listOps(userId: string): Promise<PendingOp[]> {
  if (usesMemory()) return memory.ops.filter((op) => op.userId === userId);
  const db = await database();
  return db.getAllAsync<PendingOp>(
    "SELECT id, userId, conversationId, kind, payload FROM pending_ops WHERE userId = ? ORDER BY id ASC",
    [userId],
  );
}

export async function removeOp(id: number): Promise<void> {
  if (usesMemory()) {
    memory.ops = memory.ops.filter((op) => op.id !== id);
    return;
  }
  const db = await database();
  await db.runAsync("DELETE FROM pending_ops WHERE id = ?", [id]);
}

export async function setPulledAt(userId: string, pulledAt: string): Promise<void> {
  if (usesMemory()) {
    memory.pulledAt.set(userId, pulledAt);
    return;
  }
  const db = await database();
  await db.runAsync("INSERT OR REPLACE INTO sync_meta (userId, pulledAt) VALUES (?, ?)", [userId, pulledAt]);
}

export async function rememberMediaRow(url: string, localPath: string): Promise<void> {
  if (usesMemory()) {
    memory.media.set(url, localPath);
    return;
  }
  const db = await database();
  await db.runAsync("INSERT OR REPLACE INTO media (url, localPath) VALUES (?, ?)", [url, localPath]);
}

export async function loadMediaRows(): Promise<Array<{ url: string; localPath: string }>> {
  if (usesMemory()) {
    const rows = [...memory.media.entries()].map(([url, localPath]) => ({ url, localPath }));
    hydrateMediaMap(rows);
    return rows;
  }
  const db = await database();
  const rows = await db.getAllAsync<{ url: string; localPath: string }>("SELECT url, localPath FROM media");
  hydrateMediaMap(rows);
  return rows;
}

export async function wipeUser(userId: string): Promise<void> {
  if (usesMemory()) {
    for (const [id, row] of [...memory.conversations]) {
      if (row.userId === userId) memory.conversations.delete(id);
    }
    for (const [id, row] of [...memory.messages]) {
      if (row.userId === userId) memory.messages.delete(id);
    }
    memory.ops = memory.ops.filter((op) => op.userId !== userId);
    memory.pulledAt.delete(userId);
    return;
  }
  const db = await database();
  await db.withTransactionAsync(async () => {
    await db.runAsync("DELETE FROM conversations WHERE userId = ?", [userId]);
    await db.runAsync("DELETE FROM messages WHERE userId = ?", [userId]);
    await db.runAsync("DELETE FROM pending_ops WHERE userId = ?", [userId]);
    await db.runAsync("DELETE FROM sync_meta WHERE userId = ?", [userId]);
  });
}

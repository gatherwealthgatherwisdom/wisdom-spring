import { ConversationStatus, type ConversationView, type MessageView } from "@spring/shared";
import { API_URL, spring } from "../api";
import {
  deleteConversation,
  enqueueOp,
  getConversation,
  listConversations,
  listMessages,
  listOps,
  rememberMediaRow,
  removeOp,
  replaceMessages,
  setPulledAt,
  upsertConversation,
  type PendingKind,
} from "./db";
import { cacheMediaUrls, mediaUrlsOf } from "./media";
import * as FileSystem from "expo-file-system/legacy";

function remoteUrl(path: string): string {
  if (/^https?:\/\//i.test(path) || path.startsWith("file:") || path.startsWith("data:")) return path;
  const base = API_URL.replace(/\/$/, "");
  return path.startsWith("/") ? `${base}${path}` : `${base}/${path}`;
}

async function pullAllConversations(): Promise<ConversationView[]> {
  const items: ConversationView[] = [];
  const seen = new Set<string>();
  let cursor: string | undefined;
  do {
    const page = await spring.conversations(cursor ? { cursor, limit: "100" } : { limit: "100" });
    for (const item of page.items) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      items.push(item);
    }
    cursor = page.nextCursor ?? undefined;
  } while (cursor);
  return items;
}

async function pullAllMessages(conversationId: string): Promise<MessageView[]> {
  const pages: MessageView[][] = [];
  let cursor: string | undefined;
  do {
    const page = await spring.messages(conversationId, { cursor, limit: "100" });
    pages.push(page.items);
    cursor = page.nextCursor ?? undefined;
  } while (cursor);
  return pages.reverse().flat();
}

async function downloadFile(url: string, dest: string): Promise<string | null> {
  try {
    const remote = remoteUrl(url);
    const result = await FileSystem.downloadAsync(remote, dest);
    return result.uri ?? dest;
  } catch {
    return null;
  }
}

async function cacheFor(conversations: ConversationView[], messages: MessageView[]): Promise<void> {
  const saved = await cacheMediaUrls(mediaUrlsOf(conversations, messages), downloadFile);
  for (const row of saved) await rememberMediaRow(row.url, row.localPath);
}

export async function flushPending(userId: string): Promise<void> {
  const ops = await listOps(userId).catch(() => []);
  for (const op of ops) {
    let body: { pinned?: boolean; title?: string; status?: ConversationStatus } = {};
    try {
      body = JSON.parse(op.payload) as { pinned?: boolean; title?: string; status?: ConversationStatus };
    } catch {
      await removeOp(op.id);
      continue;
    }
    if (op.kind === "pin") await spring.updateConversation(op.conversationId, { pinned: Boolean(body.pinned) });
    else if (op.kind === "rename") await spring.updateConversation(op.conversationId, { title: body.title ?? "" });
    else if (op.kind === "status") {
      await spring.updateConversation(op.conversationId, {
        status: body.status === ConversationStatus.ARCHIVED ? ConversationStatus.ARCHIVED : ConversationStatus.ACTIVE,
      });
    } else if (op.kind === "delete") await spring.deleteConversation(op.conversationId);
    await removeOp(op.id);
  }
}

export async function pullHistory(userId: string): Promise<ConversationView[]> {
  await flushPending(userId).catch(() => undefined);
  const remote = await pullAllConversations();
  try {
    const pending = await listOps(userId);
    const pendingDeletes = new Set(pending.filter((op) => op.kind === "delete").map((op) => op.conversationId));
    const remoteIds = new Set(remote.map((item) => item.id));
    const local = await listConversations(userId);
    for (const item of local) {
      if (!remoteIds.has(item.id) && !pendingDeletes.has(item.id)) await deleteConversation(userId, item.id);
    }
    for (const item of remote) {
      if (pendingDeletes.has(item.id)) continue;
      const previous = local.find((row) => row.id === item.id);
      await upsertConversation(userId, item);
      if (!previous || previous.lastMessageAt !== item.lastMessageAt) {
        const messages = await pullAllMessages(item.id);
        await replaceMessages(userId, item.id, messages);
        void cacheFor([item], messages);
      }
    }
    await setPulledAt(userId, new Date().toISOString());
    return listConversations(userId);
  } catch {
    return remote;
  }
}

export async function pullThread(userId: string, conversationId: string): Promise<{ conversation: ConversationView | null; messages: MessageView[] }> {
  const conversation = await spring.conversation(conversationId);
  await upsertConversation(userId, conversation).catch(() => undefined);
  const messages = await pullAllMessages(conversationId);
  await replaceMessages(userId, conversationId, messages).catch(() => undefined);
  void cacheFor([conversation], messages);
  return { conversation, messages };
}

export async function queueOp(
  userId: string,
  conversationId: string,
  kind: PendingKind,
  payload: unknown,
): Promise<void> {
  await enqueueOp(userId, conversationId, kind, payload);
}

export async function localThread(userId: string, conversationId: string): Promise<{ conversation: ConversationView | null; messages: MessageView[] }> {
  return {
    conversation: await getConversation(userId, conversationId),
    messages: await listMessages(userId, conversationId),
  };
}

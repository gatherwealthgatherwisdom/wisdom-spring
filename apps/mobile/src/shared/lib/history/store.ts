import { ApiError } from "@spring/api-client";
import { ConversationStatus, LIMITS, type ConversationBatchResult, type ConversationView, type MessageView } from "@spring/shared";
import { useEffect, useMemo, useState } from "react";
import { create } from "zustand";
import { spring } from "../api";
import {
  clearMediaRows,
  deleteConversation,
  getConversation,
  getPulledAt,
  listConversations,
  listMessages,
  loadMediaRows,
  searchHits,
  upsertConversation,
  wipeUser,
} from "./db";
import { markdownFromThread } from "./export";
import { lastActiveOf } from "./groups";
import { clearCachedMedia, clearMediaMap } from "./media";
import type { HistoryHit } from "./search";
import { localThread, pullHistory, pullThread, queueOp } from "./sync";

type HistoryState = {
  ready: boolean;
  online: boolean;
  syncing: boolean;
  userId: string | null;
  pulledAt: string | null;
  conversations: ConversationView[];
  messages: Record<string, MessageView[]>;
  hydrate: (userId: string | null) => Promise<void>;
  sync: () => Promise<void>;
  loadThread: (conversationId: string) => Promise<void>;
  pin: (id: string, pinned: boolean) => Promise<void>;
  rename: (id: string, title: string) => Promise<void>;
  setStatus: (id: string, status: ConversationStatus.ACTIVE | ConversationStatus.ARCHIVED) => Promise<void>;
  remove: (id: string) => Promise<void>;
  pinMany: (ids: string[], pinned: boolean) => Promise<void>;
  setStatusMany: (ids: string[], status: ConversationStatus.ACTIVE | ConversationStatus.ARCHIVED) => Promise<void>;
  removeMany: (ids: string[]) => Promise<void>;
  markOffline: () => void;
  exportThread: (id: string) => Promise<string>;
  clearMediaCache: () => Promise<void>;
};

export function isOfflineError(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  if (error instanceof ApiError && error.status === 0) return true;
  if (error instanceof Error && /network|failed to fetch|network request/i.test(error.message)) return true;
  return false;
}

let hydrateGen = 0;
let syncLock: Promise<void> | null = null;

export const useHistoryStore = create<HistoryState>((set, get) => ({
  ready: false,
  online: true,
  syncing: false,
  userId: null,
  pulledAt: null,
  conversations: [],
  messages: {},
  async hydrate(userId) {
    const gen = ++hydrateGen;
    const previous = get().userId;
    if (!userId) {
      if (previous) await wipeUser(previous).catch(() => undefined);
      if (gen !== hydrateGen) return;
      clearMediaMap();
      set({ userId: null, conversations: [], messages: {}, pulledAt: null, ready: true, online: true, syncing: false });
      return;
    }
    await loadMediaRows().catch(() => undefined);
    const conversations = await listConversations(userId).catch(() => []);
    const pulledAt = await getPulledAt(userId).catch(() => null);
    if (gen !== hydrateGen) return;
    set({ userId, conversations, messages: {}, pulledAt, ready: true });
    await get().sync();
  },
  async sync() {
    const userId = get().userId;
    if (!userId) return;
    if (syncLock) return syncLock;
    const gen = hydrateGen;
    set({ syncing: true });
    const run = (async () => {
      try {
        const conversations = await pullHistory(userId);
        if (get().userId !== userId || gen !== hydrateGen) return;
        const messages = { ...get().messages };
        for (const id of Object.keys(messages)) {
          messages[id] = await listMessages(userId, id).catch(() => messages[id] ?? []);
        }
        const pulledAt = await getPulledAt(userId).catch(() => get().pulledAt);
        set({ conversations, messages, pulledAt, online: true });
      } catch {
        if (get().userId !== userId || gen !== hydrateGen) return;
        const conversations = await listConversations(userId).catch(() => get().conversations);
        set({ conversations, online: false });
      } finally {
        set({ syncing: false });
      }
    })();
    syncLock = run.finally(() => {
      syncLock = null;
    });
    return syncLock;
  },
  async loadThread(conversationId) {
    const userId = get().userId;
    if (!userId) return;
    const local = await localThread(userId, conversationId);
    set((state) => ({
      conversations: local.conversation
        ? [local.conversation, ...state.conversations.filter((item) => item.id !== conversationId)]
        : state.conversations,
      messages: { ...state.messages, [conversationId]: local.messages },
    }));
    try {
      const remote = await pullThread(userId, conversationId);
      set((state) => ({
        online: true,
        conversations: remote.conversation
          ? [remote.conversation, ...state.conversations.filter((item) => item.id !== conversationId)]
          : state.conversations,
        messages: { ...state.messages, [conversationId]: remote.messages },
      }));
    } catch {
      set({ online: false });
    }
  },
  async pin(id, pinned) {
    await mutate(id, (item) => ({ ...item, pinnedAt: pinned ? new Date().toISOString() : null }), { kind: "pin", payload: { pinned } }, () =>
      spring.updateConversation(id, { pinned }),
    );
  },
  async rename(id, title) {
    const trimmed = title.trim();
    if (!trimmed) return;
    await mutate(id, (item) => ({ ...item, title: trimmed }), { kind: "rename", payload: { title: trimmed } }, () =>
      spring.updateConversation(id, { title: trimmed }),
    );
  },
  async setStatus(id, status) {
    await mutate(id, (item) => ({ ...item, status, pinnedAt: status === ConversationStatus.ARCHIVED ? null : item.pinnedAt }), { kind: "status", payload: { status } }, () =>
      spring.updateConversation(id, { status }),
    );
  },
  async remove(id) {
    const userId = get().userId;
    if (!userId) return;
    await deleteConversation(userId, id).catch(() => undefined);
    set((state) => ({
      conversations: state.conversations.filter((item) => item.id !== id),
      messages: Object.fromEntries(Object.entries(state.messages).filter(([key]) => key !== id)),
    }));
    try {
      await spring.deleteConversation(id);
      set({ online: true });
    } catch {
      await queueOp(userId, id, "delete", {});
      set({ online: false });
    }
  },
  async pinMany(ids, pinned) {
    const userId = get().userId;
    if (!userId) return;
    await batchLocal(
      ids,
      (item) => ({ ...item, pinnedAt: pinned ? new Date().toISOString() : null }),
      (chunk) => spring.batchConversations({ ids: chunk, pinned }),
      (id) => queueOp(userId, id, "pin", { pinned }),
    );
  },
  async setStatusMany(ids, status) {
    const userId = get().userId;
    if (!userId) return;
    await batchLocal(
      ids,
      (item) => ({ ...item, status, pinnedAt: status === ConversationStatus.ARCHIVED ? null : item.pinnedAt }),
      (chunk) => spring.batchConversations({ ids: chunk, status }),
      (id) => queueOp(userId, id, "status", { status }),
    );
  },
  async removeMany(ids) {
    const unique = [...new Set(ids)];
    const userId = get().userId;
    if (!userId || unique.length === 0) return;
    for (const id of unique) await deleteConversation(userId, id).catch(() => undefined);
    set((state) => ({
      conversations: state.conversations.filter((item) => !unique.includes(item.id)),
      messages: Object.fromEntries(Object.entries(state.messages).filter(([key]) => !unique.includes(key))),
    }));
    try {
      for (const chunk of chunkIds(unique)) {
        await spring.batchConversations({ ids: chunk, delete: true });
      }
      set({ online: true });
    } catch {
      for (const id of unique) await queueOp(userId, id, "delete", {});
      set({ online: false });
    }
  },
  markOffline() {
    set({ online: false });
  },
  async clearMediaCache() {
    await clearMediaRows().catch(() => undefined);
    await clearCachedMedia();
  },
  async exportThread(id) {
    const userId = get().userId;
    if (!userId) throw new Error("signed-out");
    const conversation = get().conversations.find((item) => item.id === id) ?? (await getConversation(userId, id));
    if (!conversation) throw new Error("missing");
    try {
      const exported = await spring.exportConversation(id);
      set({ online: true });
      return exported.markdown;
    } catch (error) {
      if (isOfflineError(error)) set({ online: false });
      const messages = get().messages[id] ?? (await listMessages(userId, id));
      return markdownFromThread(conversation, messages);
    }
  },
}));

async function mutate(
  id: string,
  update: (item: ConversationView) => ConversationView,
  pending: { kind: "pin" | "rename" | "status"; payload: unknown },
  send: () => Promise<ConversationView>,
): Promise<void> {
  const { userId, conversations } = useHistoryStore.getState();
  if (!userId) return;
  const current = conversations.find((item) => item.id === id);
  if (!current) return;
  const next = update(current);
  await upsertConversation(userId, next).catch(() => undefined);
  useHistoryStore.setState({
    conversations: conversations.map((item) => (item.id === id ? next : item)),
  });
  try {
    const saved = await send();
    await upsertConversation(userId, saved).catch(() => undefined);
    useHistoryStore.setState((state) => ({
      online: true,
      conversations: state.conversations.map((item) => (item.id === id ? saved : item)),
    }));
  } catch {
    await queueOp(userId, id, pending.kind, pending.payload);
    useHistoryStore.setState({ online: false });
  }
}

function chunkIds(ids: string[]): string[][] {
  const size = LIMITS.conversationBatchMax;
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += size) chunks.push(ids.slice(i, i + size));
  return chunks;
}

async function applyRemoteBatch(result: ConversationBatchResult): Promise<void> {
  const userId = useHistoryStore.getState().userId;
  if (!userId) return;
  const deleted = new Set(result.deletedIds);
  for (const id of deleted) await deleteConversation(userId, id).catch(() => undefined);
  for (const item of result.items) await upsertConversation(userId, item).catch(() => undefined);
  useHistoryStore.setState((state) => {
    const byId = new Map(result.items.map((item) => [item.id, item]));
    return {
      conversations: state.conversations.filter((item) => !deleted.has(item.id)).map((item) => byId.get(item.id) ?? item),
    };
  });
}

async function batchLocal(
  ids: string[],
  update: (item: ConversationView) => ConversationView,
  send: (chunk: string[]) => Promise<ConversationBatchResult>,
  enqueue: (conversationId: string) => Promise<void>,
): Promise<void> {
  const unique = [...new Set(ids)];
  const { userId, conversations } = useHistoryStore.getState();
  if (!userId || unique.length === 0) return;
  const next = conversations.map((item) => (unique.includes(item.id) ? update(item) : item));
  for (const item of next.filter((row) => unique.includes(row.id))) {
    await upsertConversation(userId, item).catch(() => undefined);
  }
  useHistoryStore.setState({ conversations: next });
  try {
    for (const chunk of chunkIds(unique)) {
      await applyRemoteBatch(await send(chunk));
    }
    useHistoryStore.setState({ online: true });
  } catch {
    for (const id of unique) await enqueue(id);
    useHistoryStore.setState({ online: false });
  }
}

export function useHistory(options?: { mode?: ConversationView["mode"]; q?: string }) {
  const conversations = useHistoryStore((state) => state.conversations);
  const online = useHistoryStore((state) => state.online);
  const ready = useHistoryStore((state) => state.ready);
  const userId = useHistoryStore((state) => state.userId);
  const [hits, setHits] = useState<HistoryHit[] | null>(null);

  useEffect(() => {
    const needle = options?.q?.trim();
    if (!needle || !userId) {
      setHits(null);
      return;
    }
    let cancelled = false;
    void searchHits(userId, needle).then((rows) => {
      if (!cancelled) setHits(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [options?.q, userId, conversations]);

  const items = useMemo(() => {
    let list = conversations;
    if (options?.mode) list = list.filter((item) => item.mode === options.mode);
    if (hits) {
      const ids = new Set(hits.map((hit) => hit.conversationId));
      list = list.filter((item) => ids.has(item.id));
    }
    return list;
  }, [conversations, options?.mode, hits]);

  return {
    items,
    hits: hits ?? [],
    lastActive: lastActiveOf(conversations),
    online,
    ready,
    pin: useHistoryStore.getState().pin,
    rename: useHistoryStore.getState().rename,
    setStatus: useHistoryStore.getState().setStatus,
    remove: useHistoryStore.getState().remove,
    pinMany: useHistoryStore.getState().pinMany,
    setStatusMany: useHistoryStore.getState().setStatusMany,
    removeMany: useHistoryStore.getState().removeMany,
    sync: useHistoryStore.getState().sync,
    exportThread: useHistoryStore.getState().exportThread,
  };
}

const EMPTY_MESSAGES: MessageView[] = [];

export function useThread(conversationId: string | undefined): {
  conversation: ConversationView | undefined;
  messages: MessageView[];
  online: boolean;
} {
  const conversation = useHistoryStore((state) => state.conversations.find((item) => item.id === conversationId));
  const messages = useHistoryStore((state) => (conversationId ? (state.messages[conversationId] ?? EMPTY_MESSAGES) : EMPTY_MESSAGES));
  const online = useHistoryStore((state) => state.online);
  useEffect(() => {
    if (conversationId) void useHistoryStore.getState().loadThread(conversationId);
  }, [conversationId]);
  return { conversation, messages, online };
}

export async function refreshAfterSend(): Promise<void> {
  await useHistoryStore.getState().sync();
}

export function listLocalMessages(conversationId: string): Promise<MessageView[]> {
  const userId = useHistoryStore.getState().userId;
  if (!userId) return Promise.resolve([]);
  return listMessages(userId, conversationId);
}

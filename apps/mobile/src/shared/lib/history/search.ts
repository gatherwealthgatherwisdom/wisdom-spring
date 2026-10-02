import { MessageRole, type ConversationView, type MessageView } from "@spring/shared";

export const SNIPPET_MAX = 80;

export type HistoryHit = {
  conversationId: string;
  messageId: string | null;
  snippet: string;
  role: "USER" | "ASSISTANT" | null;
};

export function collapseText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function snippetAround(text: string, needle: string, max = SNIPPET_MAX): string | null {
  const collapsed = collapseText(text);
  if (!collapsed) return null;
  const hay = collapsed.toLowerCase();
  const q = needle.trim().toLowerCase();
  if (!q) return null;
  const at = hay.indexOf(q);
  if (at < 0) return null;
  if (collapsed.length <= max) return collapsed;
  const room = Math.max(0, max - needle.trim().length);
  const before = Math.min(at, Math.floor(room / 2));
  let start = Math.max(0, at - before);
  if (start + max > collapsed.length) start = Math.max(0, collapsed.length - max);
  const slice = collapsed.slice(start, start + max);
  return `${start > 0 ? "…" : ""}${slice}${start + max < collapsed.length ? "…" : ""}`;
}

export function messageSearchText(item: Pick<MessageView, "content" | "imageUrl">): string {
  const text = collapseText(item.content);
  if (text) return text;
  if (item.imageUrl) return "圖像";
  return "";
}

export function hitFromMessage(item: MessageView, needle: string): HistoryHit | null {
  const snippet = snippetAround(messageSearchText(item), needle);
  if (!snippet) return null;
  const role = item.role === MessageRole.ASSISTANT || item.role === MessageRole.USER ? item.role : null;
  return { conversationId: item.conversationId, messageId: item.id, snippet, role };
}

export function hitFromConversation(item: ConversationView, needle: string): HistoryHit | null {
  const snippet =
    (item.title ? snippetAround(item.title, needle) : null) ?? (item.preview ? snippetAround(item.preview, needle) : null);
  if (!snippet) return null;
  return { conversationId: item.id, messageId: null, snippet, role: item.previewRole };
}

export function pickHits(conversations: ConversationView[], messages: MessageView[], needle: string): HistoryHit[] {
  const q = needle.trim();
  if (!q) return [];
  const latest = new Map<string, HistoryHit>();
  const sorted = messages.slice().sort((left, right) => right.createdAt.localeCompare(left.createdAt) || right.id.localeCompare(left.id));
  for (const item of sorted) {
    if (latest.has(item.conversationId)) continue;
    const hit = hitFromMessage(item, q);
    if (hit) latest.set(item.conversationId, hit);
  }
  for (const item of conversations) {
    if (latest.has(item.id)) continue;
    const hit = hitFromConversation(item, q);
    if (hit) latest.set(item.id, hit);
  }
  const order = new Map(conversations.map((item, index) => [item.id, index]));
  return [...latest.values()].sort((left, right) => (order.get(left.conversationId) ?? 99) - (order.get(right.conversationId) ?? 99));
}

import type { Conversation, PrismaClient } from "@prisma/client";
import { MessageRole, MessageStatus } from "@spring/shared";

const PREVIEW_MAX = 80;

export type ConversationPreview = {
  preview: string | null;
  previewRole: MessageRole.USER | MessageRole.ASSISTANT | null;
};

const emptyPreview: ConversationPreview = { preview: null, previewRole: null };

export function previewFromMessage(row: {
  content: string;
  imageUrl: string | null;
  role: string;
} | null): ConversationPreview {
  if (!row) return emptyPreview;
  const role = row.role === MessageRole.ASSISTANT ? MessageRole.ASSISTANT : MessageRole.USER;
  const text = row.content.replace(/\s+/g, " ").trim();
  if (text) return { preview: text.slice(0, PREVIEW_MAX), previewRole: role };
  if (row.imageUrl) return { preview: "圖像", previewRole: role };
  return { preview: null, previewRole: role };
}

export function conversationView(row: Conversation, preview: ConversationPreview = emptyPreview) {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    mode: row.mode,
    templateId: row.templateId,
    sourceLang: row.sourceLang,
    targetLang: row.targetLang,
    imageStyle: row.imageStyle,
    lastImageUrl: row.lastImageUrl,
    pinnedAt: row.pinnedAt?.toISOString() ?? null,
    lastMessageAt: row.lastMessageAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    preview: preview.preview,
    previewRole: preview.previewRole,
  };
}

export async function previewForConversation(prisma: PrismaClient, conversationId: string): Promise<ConversationPreview> {
  const row = await prisma.message.findFirst({
    where: {
      conversationId,
      status: MessageStatus.COMPLETED,
      role: { in: [MessageRole.USER, MessageRole.ASSISTANT] },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { content: true, imageUrl: true, role: true },
  });
  return previewFromMessage(row);
}

export async function previewsByConversationIds(
  prisma: PrismaClient,
  ids: string[],
): Promise<Map<string, ConversationPreview>> {
  const map = new Map<string, ConversationPreview>(ids.map((id) => [id, emptyPreview]));
  if (ids.length === 0) return map;
  const rows = await prisma.message.findMany({
    where: {
      conversationId: { in: ids },
      status: MessageStatus.COMPLETED,
      role: { in: [MessageRole.USER, MessageRole.ASSISTANT] },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { conversationId: true, content: true, imageUrl: true, role: true },
  });
  const seen = new Set<string>();
  for (const row of rows) {
    if (seen.has(row.conversationId)) continue;
    seen.add(row.conversationId);
    map.set(row.conversationId, previewFromMessage(row));
  }
  return map;
}

export async function conversationViews(prisma: PrismaClient, rows: Conversation[]) {
  const previews = await previewsByConversationIds(
    prisma,
    rows.map((row) => row.id),
  );
  return rows.map((row) => conversationView(row, previews.get(row.id) ?? emptyPreview));
}

import type { Message, PrismaClient } from "@prisma/client";
import { assetIdsOf, ratingOf } from "@spring/shared";

export async function messageViews(prisma: PrismaClient, rows: Message[]) {
  const ids = [...new Set(rows.flatMap((row) => assetIdsOf(row.attachments)))];
  const assets = ids.length > 0 ? await prisma.asset.findMany({ where: { id: { in: ids } } }) : [];
  const mimeById = new Map(assets.map((row) => [row.id, row.mime]));
  return rows.map((row) => ({
    id: row.id,
    conversationId: row.conversationId,
    role: row.role,
    status: row.status,
    content: row.content,
    imageUrl: row.imageUrl,
    requestedModel: row.requestedModel,
    servedModel: row.servedModel,
    fallbackUsed: row.fallbackUsed,
    parentMessageId: row.parentMessageId,
    errorCode: row.errorCode,
    attachments: assetIdsOf(row.attachments).map((id) => ({
      id,
      url: `/v1/uploads/${id}`,
      mime: mimeById.get(id) ?? "image/jpeg",
    })),
    feedback: ratingOf(row.feedback),
    createdAt: row.createdAt.toISOString(),
  }));
}

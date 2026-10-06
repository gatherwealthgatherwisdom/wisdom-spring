import type { Message, PrismaClient } from "@prisma/client";
import { GENERATION_KINDS, assetIdsOf, ratingOf, type GenerationKind } from "@spring/shared";

function asGenerationKind(value: string | null): GenerationKind | null {
  return GENERATION_KINDS.includes(value as GenerationKind) ? (value as GenerationKind) : null;
}

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
    generationKind: asGenerationKind(row.generationKind),
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

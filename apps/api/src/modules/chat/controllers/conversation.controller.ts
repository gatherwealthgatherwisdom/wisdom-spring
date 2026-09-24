import type { FastifyInstance } from "fastify";
import type { Conversation } from "@prisma/client";
import {
  AppError,
  ConversationStatus,
  CreateConversationSchema,
  ErrorCode,
  ListConversationsQuerySchema,
  ListMessagesQuerySchema,
  UpdateConversationSchema,
  createId,
  decodeCursor,
  encodeCursor,
} from "@spring/shared";
import { requireUser } from "../../../http/auth-guard";

function view(row: Conversation) {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    mode: row.mode,
    templateId: row.templateId,
    sourceLang: row.sourceLang,
    targetLang: row.targetLang,
    imageStyle: row.imageStyle,
    pinnedAt: row.pinnedAt?.toISOString() ?? null,
    lastMessageAt: row.lastMessageAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

export async function conversationRoutes(app: FastifyInstance): Promise<void> {
  app.get("/v1/conversations", async (request) => {
    const user = await requireUser(request, app.ctx.auth);
    const query = ListConversationsQuerySchema.parse(request.query);
    const cursor = query.cursor ? decodeCursor(query.cursor) : null;
    const where = {
      userId: user.id,
      status: query.status ?? { in: [ConversationStatus.ACTIVE, ConversationStatus.ARCHIVED] },
      ...(query.q ? { title: { contains: query.q } } : {}),
      pinnedAt: null,
      ...(cursor?.lastMessageAt && cursor.id
        ? {
            OR: [
              { lastMessageAt: { lt: new Date(cursor.lastMessageAt) } },
              { lastMessageAt: new Date(cursor.lastMessageAt), id: { lt: cursor.id } },
            ],
          }
        : {}),
    };
    const pinned = cursor
      ? []
      : await app.ctx.prisma.conversation.findMany({
          where: {
            userId: user.id,
            status: query.status ?? { in: [ConversationStatus.ACTIVE, ConversationStatus.ARCHIVED] },
            ...(query.q ? { title: { contains: query.q } } : {}),
            pinnedAt: { not: null },
          },
          orderBy: { pinnedAt: "desc" },
          take: 50,
        });
    const rows = await app.ctx.prisma.conversation.findMany({
      where,
      orderBy: [{ lastMessageAt: "desc" }, { id: "desc" }],
      take: query.limit + 1,
    });
    const page = rows.slice(0, query.limit);
    const last = page[page.length - 1];
    return {
      items: [...pinned.map(view), ...page.map(view)],
      nextCursor:
        rows.length > query.limit && last
          ? encodeCursor({ lastMessageAt: last.lastMessageAt.toISOString(), id: last.id })
          : null,
    };
  });

  app.post("/v1/conversations", async (request, reply) => {
    const user = await requireUser(request, app.ctx.auth);
    const body = CreateConversationSchema.parse(request.body ?? {});
    const row = await app.ctx.prisma.conversation.create({
      data: { id: createId(), userId: user.id, title: body.title },
    });
    return reply.status(201).send(view(row));
  });

  app.patch("/v1/conversations/:id", async (request) => {
    const user = await requireUser(request, app.ctx.auth);
    const { id } = request.params as { id: string };
    const body = UpdateConversationSchema.parse(request.body ?? {});
    const existing = await app.ctx.prisma.conversation.findFirst({
      where: { id, userId: user.id, status: { not: "DELETED" } },
    });
    if (!existing) throw new AppError(ErrorCode.NOT_FOUND);
    const row = await app.ctx.prisma.conversation.update({
      where: { id },
      data: {
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.pinned !== undefined ? { pinnedAt: body.pinned ? new Date() : null } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
      },
    });
    return view(row);
  });

  app.delete("/v1/conversations/:id", async (request) => {
    const user = await requireUser(request, app.ctx.auth);
    const { id } = request.params as { id: string };
    const existing = await app.ctx.prisma.conversation.findFirst({ where: { id, userId: user.id } });
    if (!existing) throw new AppError(ErrorCode.NOT_FOUND);
    await app.ctx.prisma.conversation.update({ where: { id }, data: { status: "DELETED" } });
    return { ok: true };
  });

  app.get("/v1/conversations/:id/messages", async (request) => {
    const user = await requireUser(request, app.ctx.auth);
    const { id } = request.params as { id: string };
    const query = ListMessagesQuerySchema.parse(request.query);
    const conversation = await app.ctx.prisma.conversation.findFirst({
      where: { id, userId: user.id, status: { not: "DELETED" } },
    });
    if (!conversation) throw new AppError(ErrorCode.NOT_FOUND);
    const rows = await app.ctx.prisma.message.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: "desc" },
      take: query.limit,
    });
    return {
      items: rows.reverse().map((row) => ({
        id: row.id,
        conversationId: row.conversationId,
        role: row.role,
        status: row.status,
        content: row.content,
        requestedModel: row.requestedModel,
        servedModel: row.servedModel,
        fallbackUsed: row.fallbackUsed,
        parentMessageId: row.parentMessageId,
        errorCode: row.errorCode,
        createdAt: row.createdAt.toISOString(),
      })),
      nextCursor: null,
    };
  });
}

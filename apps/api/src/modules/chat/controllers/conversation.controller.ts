import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Prisma } from "@prisma/client";
import {
  AppError,
  ConversationBatchSchema,
  ConversationStatus,
  ConversationSyncQuerySchema,
  CreateConversationSchema,
  ErrorCode,
  LIMITS,
  ListConversationsQuerySchema,
  ListMessagesQuerySchema,
  MessageRole,
  MessageStatus,
  UpdateConversationSchema,
  conversationMarkdown,
  createId,
  decodeCursor,
  encodeCursor,
  hkStartDaysAgo,
  searchNeedle,
} from "@spring/shared";
import { requireUser } from "../../../http/auth-guard";
import { env } from "../../../env";
import { conversationView, conversationViews, previewForConversation } from "../application/conversation-view";
import { messageViews } from "../application/message-view";

function ownedWhere(
  userId: string,
  query: { q?: string; status?: ConversationStatus; mode?: string },
  extra: Prisma.ConversationWhereInput,
): Prisma.ConversationWhereInput {
  const needle = searchNeedle(query.q);
  return {
    userId,
    status: query.status ?? { in: [ConversationStatus.ACTIVE, ConversationStatus.ARCHIVED] },
    ...(query.mode ? { mode: query.mode } : {}),
    ...extra,
    ...(needle
      ? {
          AND: [
            {
              OR: [
                { title: { contains: needle } },
                {
                  messages: {
                    some: {
                      content: { contains: needle },
                      status: MessageStatus.COMPLETED,
                      role: { in: [MessageRole.USER, MessageRole.ASSISTANT] },
                    },
                  },
                },
              ],
            },
          ],
        }
      : {}),
  };
}

function trashSince(now = new Date()): Date {
  return hkStartDaysAgo(now, LIMITS.historyTrashDays);
}

function perMinute(max: number): {
  config: { rateLimit: { max: number; timeWindow: string; keyGenerator: (request: FastifyRequest) => string } };
} {
  return {
    config: {
      rateLimit: {
        max: env.nodeEnv === "test" ? 10_000 : max,
        timeWindow: "1 minute",
        keyGenerator: (request) => `${request.ip}:${request.headers.authorization ?? ""}`,
      },
    },
  };
}

export async function conversationRoutes(app: FastifyInstance): Promise<void> {
  app.get("/v1/conversations", async (request) => {
    const user = await requireUser(request, app.ctx.auth);
    const query = ListConversationsQuerySchema.parse(request.query);
    if (query.status === ConversationStatus.DELETED) {
      const rows = await app.ctx.prisma.conversation.findMany({
        where: ownedWhere(user.id, query, { updatedAt: { gte: trashSince() } }),
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        take: query.limit,
      });
      return { items: await conversationViews(app.ctx.prisma, rows), nextCursor: null };
    }
    const cursor = query.cursor ? decodeCursor(query.cursor) : null;
    const cursorClause: Prisma.ConversationWhereInput =
      cursor?.lastMessageAt && cursor.id
        ? {
            OR: [
              { lastMessageAt: { lt: new Date(cursor.lastMessageAt) } },
              { lastMessageAt: new Date(cursor.lastMessageAt), id: { lt: cursor.id } },
            ],
          }
        : {};
    const pinned = cursor
      ? []
      : await app.ctx.prisma.conversation.findMany({
          where: ownedWhere(user.id, query, { pinnedAt: { not: null } }),
          orderBy: { pinnedAt: "desc" },
          take: 50,
        });
    const rows = await app.ctx.prisma.conversation.findMany({
      where: ownedWhere(user.id, query, { pinnedAt: null, ...cursorClause }),
      orderBy: [{ lastMessageAt: "desc" }, { id: "desc" }],
      take: query.limit + 1,
    });
    const page = rows.slice(0, query.limit);
    const last = page[page.length - 1];
    return {
      items: await conversationViews(app.ctx.prisma, [...pinned, ...page]),
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
    return reply.status(201).send(conversationView(row));
  });

  app.get("/v1/conversations/sync", async (request) => {
    const user = await requireUser(request, app.ctx.auth);
    const query = ConversationSyncQuerySchema.parse(request.query);
    const pulledAt = new Date();
    const since = query.since ? new Date(query.since) : null;
    if (since && Number.isNaN(since.getTime())) throw new AppError(ErrorCode.VALIDATION);
    const sinceClause = since ? { updatedAt: { gte: since } } : {};
    const live = await app.ctx.prisma.conversation.findMany({
      where: {
        userId: user.id,
        status: { in: [ConversationStatus.ACTIVE, ConversationStatus.ARCHIVED] },
        ...sinceClause,
      },
      orderBy: { updatedAt: "desc" },
    });
    const cutoff = trashSince(pulledAt);
    const deleted = since
      ? await app.ctx.prisma.conversation.findMany({
          where: { userId: user.id, status: ConversationStatus.DELETED, updatedAt: { gte: since } },
          select: { id: true, updatedAt: true },
        })
      : [];
    const trash = await app.ctx.prisma.conversation.findMany({
      where: {
        userId: user.id,
        status: ConversationStatus.DELETED,
        updatedAt: { gte: since && since > cutoff ? since : cutoff },
      },
      orderBy: { updatedAt: "desc" },
    });
    return {
      items: await conversationViews(app.ctx.prisma, live),
      deletedIds: deleted.map((row) => row.id),
      deletedItems: await conversationViews(app.ctx.prisma, trash),
      pulledAt: pulledAt.toISOString(),
    };
  });

  app.post("/v1/conversations/batch", perMinute(30), async (request) => {
    const user = await requireUser(request, app.ctx.auth);
    const body = ConversationBatchSchema.parse(request.body ?? {});
    const owned = await app.ctx.prisma.conversation.findMany({
      where: { userId: user.id, id: { in: body.ids } },
    });
    const restore = body.status === ConversationStatus.ACTIVE;
    const live = owned.filter((row) => restore || row.status !== ConversationStatus.DELETED);
    if (body.delete) {
      const deletedIds = owned.map((row) => row.id);
      if (deletedIds.length > 0) {
        await app.ctx.prisma.conversation.updateMany({
          where: { userId: user.id, id: { in: deletedIds } },
          data: { status: ConversationStatus.DELETED, pinnedAt: null },
        });
      }
      const rows = deletedIds.length
        ? await app.ctx.prisma.conversation.findMany({ where: { userId: user.id, id: { in: deletedIds } } })
        : [];
      const byId = new Map(rows.map((row) => [row.id, row]));
      const ordered = deletedIds.map((id) => byId.get(id)).filter((row): row is NonNullable<typeof row> => Boolean(row));
      return { items: [], deletedIds, deletedItems: await conversationViews(app.ctx.prisma, ordered) };
    }
    const liveIds = live.map((row) => row.id);
    if (liveIds.length > 0) {
      const data =
        body.pinned !== undefined
          ? { pinnedAt: body.pinned ? new Date() : null }
          : body.status
            ? {
                status: body.status,
                pinnedAt: null,
              }
            : null;
      if (!data) throw new AppError(ErrorCode.VALIDATION);
      await app.ctx.prisma.conversation.updateMany({
        where: {
          userId: user.id,
          id: { in: liveIds },
          ...(restore ? {} : { status: { not: ConversationStatus.DELETED } }),
        },
        data,
      });
    }
    const rows = liveIds.length
      ? await app.ctx.prisma.conversation.findMany({ where: { userId: user.id, id: { in: liveIds } } })
      : [];
    const byId = new Map(rows.map((row) => [row.id, row]));
    const ordered = liveIds.map((id) => byId.get(id)).filter((row): row is NonNullable<typeof row> => Boolean(row));
    return { items: await conversationViews(app.ctx.prisma, ordered), deletedIds: [], deletedItems: [] };
  });

  app.get("/v1/conversations/:id", async (request) => {
    const user = await requireUser(request, app.ctx.auth);
    const { id } = request.params as { id: string };
    const existing = await app.ctx.prisma.conversation.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) throw new AppError(ErrorCode.NOT_FOUND);
    return conversationView(existing, await previewForConversation(app.ctx.prisma, id));
  });

  app.patch("/v1/conversations/:id", async (request) => {
    const user = await requireUser(request, app.ctx.auth);
    const { id } = request.params as { id: string };
    const body = UpdateConversationSchema.parse(request.body ?? {});
    const restoring = body.status === ConversationStatus.ACTIVE;
    const existing = await app.ctx.prisma.conversation.findFirst({
      where: { id, userId: user.id, ...(restoring ? {} : { status: { not: "DELETED" } }) },
    });
    if (!existing) throw new AppError(ErrorCode.NOT_FOUND);
    if (existing.status === ConversationStatus.DELETED && (body.title !== undefined || body.pinned !== undefined)) {
      throw new AppError(ErrorCode.NOT_FOUND);
    }
    const row = await app.ctx.prisma.conversation.update({
      where: { id },
      data: {
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.pinned !== undefined ? { pinnedAt: body.pinned ? new Date() : null } : {}),
        ...(body.status !== undefined
          ? { status: body.status, ...(restoring || body.status === ConversationStatus.ARCHIVED ? { pinnedAt: null } : {}) }
          : {}),
      },
    });
    return conversationView(row, await previewForConversation(app.ctx.prisma, id));
  });

  app.delete("/v1/conversations/:id", async (request) => {
    const user = await requireUser(request, app.ctx.auth);
    const { id } = request.params as { id: string };
    const existing = await app.ctx.prisma.conversation.findFirst({ where: { id, userId: user.id } });
    if (!existing) throw new AppError(ErrorCode.NOT_FOUND);
    await app.ctx.prisma.conversation.update({ where: { id }, data: { status: "DELETED", pinnedAt: null } });
    return { ok: true };
  });

  app.get("/v1/conversations/:id/messages", async (request) => {
    const user = await requireUser(request, app.ctx.auth);
    const { id } = request.params as { id: string };
    const query = ListMessagesQuerySchema.parse(request.query);
    const conversation = await app.ctx.prisma.conversation.findFirst({
      where: { id, userId: user.id },
    });
    if (!conversation) throw new AppError(ErrorCode.NOT_FOUND);
    const needle = searchNeedle(query.q);
    if (needle) {
      const rows = await app.ctx.prisma.message.findMany({
        where: {
          conversationId: id,
          status: MessageStatus.COMPLETED,
          role: { in: [MessageRole.USER, MessageRole.ASSISTANT] },
          content: { contains: needle },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      return { items: await messageViews(app.ctx.prisma, rows.reverse()), nextCursor: null };
    }
    const cursor = query.cursor ? decodeCursor(query.cursor) : null;
    const cursorClause: Prisma.MessageWhereInput =
      cursor?.createdAt && cursor.id
        ? {
            OR: [
              { createdAt: { lt: new Date(cursor.createdAt) } },
              { createdAt: new Date(cursor.createdAt), id: { lt: cursor.id } },
            ],
          }
        : {};
    const rows = await app.ctx.prisma.message.findMany({
      where: { conversationId: id, ...cursorClause },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: query.limit + 1,
    });
    const page = rows.slice(0, query.limit);
    const oldest = page[page.length - 1];
    return {
      items: await messageViews(app.ctx.prisma, [...page].reverse()),
      nextCursor:
        rows.length > query.limit && oldest
          ? encodeCursor({ createdAt: oldest.createdAt.toISOString(), id: oldest.id })
          : null,
    };
  });

  app.get("/v1/conversations/:id/export", perMinute(20), async (request) => {
    const user = await requireUser(request, app.ctx.auth);
    const { id } = request.params as { id: string };
    const conversation = await app.ctx.prisma.conversation.findFirst({
      where: { id, userId: user.id },
    });
    if (!conversation) throw new AppError(ErrorCode.NOT_FOUND);
    const rows = await app.ctx.prisma.message.findMany({
      where: {
        conversationId: id,
        status: MessageStatus.COMPLETED,
        role: { in: [MessageRole.USER, MessageRole.ASSISTANT] },
      },
      orderBy: { createdAt: "asc" },
    });
    const items = await messageViews(app.ctx.prisma, rows);
    return {
      title: conversation.title?.trim() || "新對話",
      markdown: conversationMarkdown(conversation.title, items),
    };
  });
}

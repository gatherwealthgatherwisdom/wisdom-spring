import type { ClientMessage, PrismaClient } from "@prisma/client";
import { AppError, ErrorCode, createId, messageFor, type SendMessageRequest } from "@spring/shared";
import type { SseSink } from "../../../http/sse";
import type { QuotaService } from "../../billing/application/quota.service";
import type { ActingUser } from "../../auth/acting-user";
import { runGeneration, type GenerationDeps } from "./generation";

export type PreparedSend =
  | { kind: "replay"; row: ClientMessage }
  | { kind: "generate"; conversationId: string; assistantMessageId: string };

function isUnique(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "P2002";
}

export class SendMessageService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly quota: QuotaService,
    private readonly generation: GenerationDeps,
  ) {}

  async prepare(user: ActingUser, input: SendMessageRequest): Promise<PreparedSend> {
    if (input.attachments.length > 0) {
      throw new AppError(ErrorCode.VALIDATION, "暫未支援圖片。");
    }
    const existing = await this.prisma.clientMessage.findUnique({
      where: { userId_clientMessageId: { userId: user.id, clientMessageId: input.clientMessageId } },
    });
    if (existing) return { kind: "replay", row: existing };

    if (input.conversationId) {
      const conversation = await this.prisma.conversation.findFirst({
        where: { id: input.conversationId, userId: user.id, status: { not: "DELETED" } },
      });
      if (!conversation) throw new AppError(ErrorCode.NOT_FOUND);
    }

    const now = this.generation.now();
    await this.quota.assertCanSend({ userId: user.id, planTier: user.planTier, now });
    await this.quota.consumeDaily(user.id, user.planTier, now);

    const conversationId = input.conversationId ?? createId();
    const userMessageId = createId();
    const assistantMessageId = createId();
    try {
      await this.prisma.$transaction(async (tx) => {
        if (!input.conversationId) {
          await tx.conversation.create({
            data: {
              id: conversationId,
              userId: user.id,
              lastMessageAt: now,
              mode: input.mode ?? "chat",
              templateId: input.templateId,
              sourceLang: input.sourceLang,
              targetLang: input.targetLang,
              imageStyle: input.imageStyle,
            },
          });
        }
        await tx.message.create({
          data: {
            id: userMessageId,
            conversationId,
            clientMessageId: input.clientMessageId,
            role: "USER",
            status: "COMPLETED",
            content: input.content,
          },
        });
        await tx.message.create({
          data: {
            id: assistantMessageId,
            conversationId,
            role: "ASSISTANT",
            status: "STREAMING",
            content: "",
          },
        });
        await tx.clientMessage.create({
          data: {
            userId: user.id,
            clientMessageId: input.clientMessageId,
            conversationId,
            userMessageId,
            assistantMessageId,
          },
        });
        await tx.conversation.update({
          where: { id: conversationId },
          data: { lastMessageAt: now },
        });
      });
    } catch (error) {
      await this.quota.releaseDaily(user.id, now);
      if (isUnique(error)) {
        const row = await this.prisma.clientMessage.findUnique({
          where: { userId_clientMessageId: { userId: user.id, clientMessageId: input.clientMessageId } },
        });
        if (row) return { kind: "replay", row };
      }
      throw error;
    }

    return { kind: "generate", conversationId, assistantMessageId };
  }

  async continue(user: ActingUser, prepared: PreparedSend, sink: SseSink): Promise<void> {
    if (prepared.kind === "replay") {
      await this.writeReplay(prepared.row, sink);
      return;
    }
    await runGeneration(
      this.generation,
      {
        userId: user.id,
        planTier: user.planTier,
        conversationId: prepared.conversationId,
        assistantMessageId: prepared.assistantMessageId,
      },
      sink,
    );
  }

  private async writeReplay(row: ClientMessage, sink: SseSink): Promise<void> {
    const assistant = await this.prisma.message.findUnique({ where: { id: row.assistantMessageId } });
    if (!assistant) throw new AppError(ErrorCode.NOT_FOUND);
    sink.send("meta", {
      messageId: assistant.id,
      conversationId: row.conversationId,
      requestedModel: assistant.requestedModel ?? "",
    });
    if (assistant.status === "COMPLETED") {
      if (assistant.content) sink.send("delta", { text: assistant.content });
      sink.send("done", {
        servedModel: assistant.servedModel ?? assistant.requestedModel ?? "",
        fallbackUsed: assistant.fallbackUsed,
        usage: { promptTokens: assistant.promptTokens, completionTokens: assistant.completionTokens },
        costUsdMicros: assistant.costUsdMicros.toString(),
      });
      return;
    }
    if (assistant.content) sink.send("delta", { text: assistant.content });
    const code =
      assistant.status === "CANCELLED"
        ? ErrorCode.STREAM_ABORTED
        : assistant.status === "STREAMING"
          ? ErrorCode.CONFLICT
          : assistant.errorCode && assistant.errorCode in ErrorCode
            ? (assistant.errorCode as ErrorCode)
            : ErrorCode.INTERNAL;
    sink.send("error", { code, message: messageFor(code) });
  }
}

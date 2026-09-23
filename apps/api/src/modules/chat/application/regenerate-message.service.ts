import type { PrismaClient } from "@prisma/client";
import { AppError, ErrorCode, createId } from "@spring/shared";
import type { SseSink } from "../../../http/sse";
import type { QuotaService } from "../../billing/application/quota.service";
import type { ActingUser } from "../../auth/acting-user";
import { runGeneration, type GenerationDeps } from "./generation";

export class RegenerateMessageService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly quota: QuotaService,
    private readonly generation: GenerationDeps,
  ) {}

  async execute(user: ActingUser, messageId: string, sink: SseSink): Promise<void> {
    const message = await this.prisma.message.findFirst({
      where: {
        id: messageId,
        role: "ASSISTANT",
        conversation: { userId: user.id, status: { not: "DELETED" } },
      },
    });
    if (!message) throw new AppError(ErrorCode.NOT_FOUND);
    if (message.status === "STREAMING") throw new AppError(ErrorCode.CONFLICT, "生成進行中。");

    const now = this.generation.now();
    await this.quota.assertCanSend({ userId: user.id, planTier: user.planTier, now });
    await this.quota.consumeDaily(user.id, user.planTier, now);
    const assistantMessageId = createId();
    try {
      await this.prisma.$transaction([
        this.prisma.message.update({ where: { id: message.id }, data: { status: "SUPERSEDED" } }),
        this.prisma.message.create({
          data: {
            id: assistantMessageId,
            conversationId: message.conversationId,
            role: "ASSISTANT",
            status: "STREAMING",
            content: "",
            parentMessageId: message.id,
          },
        }),
        this.prisma.conversation.update({
          where: { id: message.conversationId },
          data: { lastMessageAt: now },
        }),
      ]);
    } catch (error) {
      await this.quota.releaseDaily(user.id, now);
      throw error;
    }

    await runGeneration(
      this.generation,
      {
        userId: user.id,
        planTier: user.planTier,
        conversationId: message.conversationId,
        assistantMessageId,
      },
      sink,
    );
  }
}

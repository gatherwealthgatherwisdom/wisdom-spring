import type { PrismaClient } from "@prisma/client";
import { AppError, ErrorCode, assetIdsOf, createId } from "@spring/shared";
import type { SseSink } from "../../../http/sse";
import { assertCapabilityFlags } from "../../admin/feature-flags";
import type { QuotaService } from "../../billing/application/quota.service";
import type { ActingUser } from "../../auth/acting-user";
import { chargeGuest, prepareCharge } from "./charge-generation";
import { runGeneration, type GenerationDeps } from "./generation";

export type PreparedRegenerate = { conversationId: string; assistantMessageId: string };

export class RegenerateMessageService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly quota: QuotaService,
    private readonly generation: GenerationDeps,
  ) {}

  async prepare(user: ActingUser, messageId: string): Promise<PreparedRegenerate> {
    const message = await this.prisma.message.findFirst({
      where: {
        id: messageId,
        role: "ASSISTANT",
        conversation: { userId: user.id, status: { not: "DELETED" } },
      },
    });
    if (!message) throw new AppError(ErrorCode.NOT_FOUND);
    if (message.status === "STREAMING") throw new AppError(ErrorCode.CONFLICT, "生成進行中。");

    const conversation = await this.prisma.conversation.findUnique({ where: { id: message.conversationId } });
    const lastUser = await this.prisma.message.findFirst({
      where: { conversationId: message.conversationId, role: "USER", status: "COMPLETED" },
      orderBy: { createdAt: "desc" },
    });
    const mediaIds = assetIdsOf(lastUser?.attachments);
    const media =
      mediaIds.length > 0 ? await this.prisma.asset.findMany({ where: { id: { in: mediaIds } }, select: { mime: true } }) : [];
    await assertCapabilityFlags(this.prisma, {
      mode: conversation?.mode ?? "chat",
      mimes: media.map((row) => row.mime),
    });

    const now = this.generation.now();
    const charge = await prepareCharge(this.prisma, this.quota, user.id, user.planTier, now);
    const assistantMessageId = createId();
    try {
      await this.prisma.$transaction(async (tx) => {
        if (charge === "guest") await chargeGuest(tx, user.id);
        await tx.message.update({ where: { id: message.id }, data: { status: "SUPERSEDED" } });
        await tx.message.create({
          data: {
            id: assistantMessageId,
            conversationId: message.conversationId,
            role: "ASSISTANT",
            status: "STREAMING",
            content: "",
            parentMessageId: message.id,
          },
        });
        await tx.conversation.update({
          where: { id: message.conversationId },
          data: { lastMessageAt: now },
        });
      });
    } catch (error) {
      if (charge === "plan") await this.quota.releaseDaily(user.id, now);
      throw error;
    }
    return { conversationId: message.conversationId, assistantMessageId };
  }

  async continue(user: ActingUser, prepared: PreparedRegenerate, sink: SseSink): Promise<void> {
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
}

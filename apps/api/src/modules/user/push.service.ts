import type { PrismaClient } from "@prisma/client";
import type { Redis } from "ioredis";
import {
  LIMITS,
  PlanTier,
  createId,
  hkDayKey,
  pushCopy,
  type PushKind,
} from "@spring/shared";
import { loadAppLimits } from "../admin/app-limits";
import type { QuotaService } from "../billing/application/quota.service";
import type { PushMessage, PushSender } from "./push-sender";

export class PushService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly redis: Redis,
    private readonly quota: QuotaService,
    readonly sender: PushSender,
  ) {}

  async register(userId: string, token: string, platform: "ios" | "android"): Promise<void> {
    await this.prisma.deviceToken.upsert({
      where: { token },
      create: { id: createId(), userId, token, platform },
      update: { userId, platform },
    });
  }

  async unregister(userId: string, token: string): Promise<void> {
    await this.prisma.deviceToken.deleteMany({ where: { userId, token } });
  }

  async clearUser(userId: string): Promise<void> {
    await this.prisma.deviceToken.deleteMany({ where: { userId } });
  }

  async afterCompletedTurn(input: {
    userId: string;
    conversationId: string;
    left: boolean;
  }): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: input.userId } });
    if (!user || user.status !== "ACTIVE") return;
    await this.maybeQuotaLow(user);
    if (input.left) await this.maybeGenerationDone(user, input.conversationId);
  }

  private async maybeQuotaLow(user: {
    id: string;
    locale: string;
    registeredAt: Date | null;
    guestUses: number;
    planTier: string;
    bonusDailyMessages: number;
    notifyQuotaLow: boolean;
  }): Promise<void> {
    if (!user.notifyQuotaLow) return;
    const remaining = await this.remaining(user);
    if (remaining === null) return;
    const threshold = user.registeredAt == null ? LIMITS.notifyGuestRemaining : LIMITS.notifyQuotaRemaining;
    if (remaining > threshold) return;
    const tokens = await this.tokensOf(user.id);
    if (tokens.length === 0) return;
    const key = `spring:push:quota:${user.id}:${hkDayKey(new Date())}`;
    const locked = await this.redis.set(key, "1", "EX", 60 * 60 * 48, "NX");
    if (locked !== "OK") return;
    const copy = pushCopy(user.locale);
    try {
      await this.sendTo(tokens, {
        title: copy.quotaLowTitle,
        body: copy.quotaLowBody(remaining),
        data: { kind: "quota_low" satisfies PushKind },
      });
    } catch {
      await this.redis.del(key);
    }
  }

  private async maybeGenerationDone(
    user: { id: string; locale: string; notifyGenerationDone: boolean },
    conversationId: string,
  ): Promise<void> {
    if (!user.notifyGenerationDone) return;
    const copy = pushCopy(user.locale);
    await this.dispatch(user.id, {
      title: copy.generationDoneTitle,
      body: copy.generationDoneBody,
      data: { kind: "generation_done" satisfies PushKind, conversationId },
    });
  }

  private async remaining(user: {
    id: string;
    registeredAt: Date | null;
    guestUses: number;
    planTier: string;
    bonusDailyMessages: number;
  }): Promise<number | null> {
    if (user.registeredAt == null) {
      const { guestTrialMessages } = await loadAppLimits(this.prisma);
      return Math.max(0, guestTrialMessages - user.guestUses);
    }
    const plan = user.planTier === PlanTier.PLUS || user.planTier === PlanTier.INTERNAL ? user.planTier : PlanTier.FREE;
    const snapshot = await this.quota.snapshot(user.id, plan, new Date(), user.bonusDailyMessages);
    return Math.max(0, snapshot.dailyLimit - snapshot.dailyUsed);
  }

  private async dispatch(
    userId: string,
    content: { title: string; body: string; data: PushMessage["data"] },
  ): Promise<void> {
    const tokens = await this.tokensOf(userId);
    if (tokens.length === 0) return;
    await this.sendTo(tokens, content);
  }

  private tokensOf(userId: string) {
    return this.prisma.deviceToken.findMany({ where: { userId } });
  }

  private async sendTo(
    tokens: Array<{ token: string }>,
    content: { title: string; body: string; data: PushMessage["data"] },
  ): Promise<void> {
    const result = await this.sender.send(
      tokens.map((row) => ({
        to: row.token,
        title: content.title,
        body: content.body,
        data: content.data,
      })),
    );
    if (result.invalidTokens.length > 0) {
      await this.prisma.deviceToken.deleteMany({ where: { token: { in: result.invalidTokens } } });
    }
  }
}

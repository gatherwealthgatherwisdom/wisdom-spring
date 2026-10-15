import type { PrismaClient } from "@prisma/client";
import type { Redis } from "ioredis";
import {
  ADMIN_OTP_NEED_APP,
  AppError,
  ErrorCode,
  LIMITS,
  PlanTier,
  createId,
  hkDayKey,
  hkMonthKey,
  pushCopy,
  type InboxKind,
  type PushCopy,
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
    await this.maybeQuotaNotices(user);
    if (input.left) await this.maybeGenerationDone(user, input.conversationId);
  }

  private async maybeQuotaNotices(user: {
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
    const copy = pushCopy(user.locale);
    const day = hkDayKey(new Date());
    if (remaining === 0) {
      await this.deliverQuotaNotice(
        user,
        "quota_exhausted",
        `spring:push:quota_exhausted:${user.id}:${day}`,
        60 * 60 * 48,
        copy.quotaExhaustedTitle,
        copy.quotaExhaustedBody,
      );
    } else {
      const threshold = user.registeredAt == null ? LIMITS.notifyGuestRemaining : LIMITS.notifyQuotaRemaining;
      if (remaining <= threshold) {
        await this.deliverQuotaNotice(
          user,
          "quota_low",
          `spring:push:quota:${user.id}:${day}`,
          60 * 60 * 48,
          copy.quotaLowTitle,
          copy.quotaLowBody(remaining),
        );
      }
    }
    if (user.registeredAt != null) await this.maybeMonthlyCost(user, copy);
  }

  private async maybeMonthlyCost(
    user: { id: string; locale: string; planTier: string; bonusDailyMessages: number },
    copy: PushCopy,
  ): Promise<void> {
    const plan = user.planTier === PlanTier.PLUS || user.planTier === PlanTier.INTERNAL ? user.planTier : PlanTier.FREE;
    const snapshot = await this.quota.snapshot(user.id, plan, new Date(), user.bonusDailyMessages);
    const spent = BigInt(snapshot.monthlyUsdMicros);
    const limit = BigInt(snapshot.monthlyLimitUsdMicros);
    if (limit <= 0n || spent * 100n < limit * 80n) return;
    await this.deliverQuotaNotice(
      user,
      "monthly_cost",
      `spring:push:monthly_cost:${user.id}:${hkMonthKey(new Date())}`,
      60 * 60 * 24 * 40,
      copy.monthlyCostTitle,
      copy.monthlyCostBody,
    );
  }

  private async deliverQuotaNotice(
    user: { id: string },
    kind: Extract<InboxKind, "quota_low" | "quota_exhausted" | "monthly_cost">,
    lockKey: string,
    ttlSeconds: number,
    title: string,
    body: string,
  ): Promise<void> {
    const locked = await this.redis.set(lockKey, "1", "EX", ttlSeconds, "NX");
    if (locked !== "OK") return;
    try {
      const notice = await this.prisma.inboxNotice.create({
        data: {
          id: createId(),
          userId: user.id,
          kind,
          title,
          body,
          data: { kind },
        },
      });
      await this.sendToUser(
        user.id,
        {
          title,
          body,
          data: { kind: kind satisfies PushKind, noticeId: notice.id },
        },
        false,
      );
    } catch {
      await this.redis.del(lockKey);
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

  async deviceCount(userId: string): Promise<number> {
    return this.prisma.deviceToken.count({ where: { userId } });
  }

  async sendToUser(
    userId: string,
    content: { title: string; body: string; data: PushMessage["data"] },
    requireDevice = false,
  ): Promise<void> {
    const tokens = await this.tokensOf(userId);
    if (tokens.length === 0) {
      if (requireDevice) throw new AppError(ErrorCode.UPSTREAM_UNAVAILABLE, ADMIN_OTP_NEED_APP);
      return;
    }
    await this.sendTo(tokens, content);
  }

  private async dispatch(
    userId: string,
    content: { title: string; body: string; data: PushMessage["data"] },
  ): Promise<void> {
    await this.sendToUser(userId, content, false);
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

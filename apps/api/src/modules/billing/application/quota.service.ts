import type { QuotaPolicy } from "@spring/domain";
import { AppError, ErrorCode, hkDayKey, hkMonthRange, limitsFor, type PlanTier, type QuotaSnapshot } from "@spring/shared";

export interface DailyQuotaCounter {
  get(userId: string, day: string): Promise<number>;
  increment(userId: string, day: string): Promise<number>;
  decrement(userId: string, day: string): Promise<void>;
}

export class MemoryDailyCounter implements DailyQuotaCounter {
  private readonly counts = new Map<string, number>();

  private key(userId: string, day: string): string {
    return `${userId}:${day}`;
  }

  async get(userId: string, day: string): Promise<number> {
    return this.counts.get(this.key(userId, day)) ?? 0;
  }

  async increment(userId: string, day: string): Promise<number> {
    const key = this.key(userId, day);
    const next = (this.counts.get(key) ?? 0) + 1;
    this.counts.set(key, next);
    return next;
  }

  async decrement(userId: string, day: string): Promise<void> {
    const key = this.key(userId, day);
    const next = Math.max(0, (this.counts.get(key) ?? 0) - 1);
    this.counts.set(key, next);
  }
}

export class QuotaService implements QuotaPolicy {
  constructor(
    private readonly daily: DailyQuotaCounter,
    private readonly monthlySpend: (userId: string, now: Date) => Promise<bigint>,
  ) {}

  async assertCanSend(input: { userId: string; planTier: PlanTier; now: Date }): Promise<void> {
    await this.assertMonthly(input.userId, input.planTier, input.now);
    const used = await this.daily.get(input.userId, hkDayKey(input.now));
    if (used >= limitsFor(input.planTier).dailyMessages) {
      throw new AppError(ErrorCode.QUOTA_DAILY_MESSAGE);
    }
  }

  async consumeDaily(userId: string, planTier: PlanTier, now: Date): Promise<void> {
    const used = await this.daily.increment(userId, hkDayKey(now));
    if (used > limitsFor(planTier).dailyMessages) {
      await this.daily.decrement(userId, hkDayKey(now));
      throw new AppError(ErrorCode.QUOTA_DAILY_MESSAGE);
    }
  }

  async releaseDaily(userId: string, now: Date): Promise<void> {
    await this.daily.decrement(userId, hkDayKey(now));
  }

  async snapshot(userId: string, planTier: PlanTier, now: Date): Promise<QuotaSnapshot> {
    const limits = limitsFor(planTier);
    const spent = await this.monthlySpend(userId, now);
    return {
      dailyUsed: await this.daily.get(userId, hkDayKey(now)),
      dailyLimit: limits.dailyMessages,
      monthlyUsdMicros: spent.toString(),
      monthlyLimitUsdMicros: limits.monthlyUsdMicros.toString(),
    };
  }

  private async assertMonthly(userId: string, planTier: PlanTier, now: Date): Promise<void> {
    const spent = await this.monthlySpend(userId, now);
    if (spent >= limitsFor(planTier).monthlyUsdMicros) {
      throw new AppError(ErrorCode.QUOTA_MONTHLY_COST);
    }
  }
}

export async function monthlySpendMicros(
  sum: (userId: string, start: Date, end: Date) => Promise<bigint>,
  userId: string,
  now: Date,
): Promise<bigint> {
  const range = hkMonthRange(now);
  return sum(userId, range.start, range.end);
}

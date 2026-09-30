import type { QuotaPolicy } from "@spring/domain";
import {
  AppError,
  ErrorCode,
  hkDayKey,
  hkMonthRange,
  limitsFor,
  type PlanLimits,
  type PlanTier,
  type QuotaSnapshot,
} from "@spring/shared";

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
    private readonly planLimits: (plan: PlanTier) => Promise<PlanLimits> = async (plan) => limitsFor(plan),
  ) {}

  async assertCanSend(input: {
    userId: string;
    planTier: PlanTier;
    now: Date;
    bonusDailyMessages?: number;
  }): Promise<void> {
    await this.assertMonthly(input.userId, input.planTier, input.now);
    const used = await this.daily.get(input.userId, hkDayKey(input.now));
    if (used >= (await this.dailyLimit(input.planTier, input.bonusDailyMessages))) {
      throw new AppError(ErrorCode.QUOTA_DAILY_MESSAGE);
    }
  }

  async consumeDaily(userId: string, planTier: PlanTier, now: Date, bonusDailyMessages = 0): Promise<void> {
    const used = await this.daily.increment(userId, hkDayKey(now));
    if (used > (await this.dailyLimit(planTier, bonusDailyMessages))) {
      await this.daily.decrement(userId, hkDayKey(now));
      throw new AppError(ErrorCode.QUOTA_DAILY_MESSAGE);
    }
  }

  async releaseDaily(userId: string, now: Date): Promise<void> {
    await this.daily.decrement(userId, hkDayKey(now));
  }

  async snapshot(userId: string, planTier: PlanTier, now: Date, bonusDailyMessages = 0): Promise<QuotaSnapshot> {
    const limits = await this.planLimits(planTier);
    const spent = await this.monthlySpend(userId, now);
    return {
      dailyUsed: await this.daily.get(userId, hkDayKey(now)),
      dailyLimit: await this.dailyLimit(planTier, bonusDailyMessages),
      monthlyUsdMicros: spent.toString(),
      monthlyLimitUsdMicros: limits.monthlyUsdMicros.toString(),
    };
  }

  private async dailyLimit(planTier: PlanTier, bonusDailyMessages = 0): Promise<number> {
    return (await this.planLimits(planTier)).dailyMessages + Math.max(0, bonusDailyMessages);
  }

  private async assertMonthly(userId: string, planTier: PlanTier, now: Date): Promise<void> {
    const spent = await this.monthlySpend(userId, now);
    if (spent >= (await this.planLimits(planTier)).monthlyUsdMicros) {
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

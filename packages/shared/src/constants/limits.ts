import { PlanTier } from "../enums/plan-tier";

export const LIMITS = {
  contentMaxChars: 32_000,
  attachmentsMax: 4,
  historyMaxMessages: 40,
  reserveOutputTokens: 4096,
  fallbacksMax: 2,
  sendRetryOnRegionBlock: 1,
  freeDailyMessages: 20,
  plusDailyMessages: 200,
  internalDailyMessages: 2_000,
  freeMonthlyUsdMicros: 500_000,
  plusMonthlyUsdMicros: 20_000_000,
  internalMonthlyUsdMicros: 100_000_000,
  freeMaxPromptUsdMicrosPerMillion: 200_000,
  freeMaxCompletionUsdMicrosPerMillion: 800_000,
} as const;

export interface PlanLimits {
  dailyMessages: number;
  monthlyUsdMicros: bigint;
  maxPromptUsdMicrosPerMillion: bigint | null;
  maxCompletionUsdMicrosPerMillion: bigint | null;
}

export function planRank(plan: PlanTier): number {
  switch (plan) {
    case PlanTier.FREE:
      return 0;
    case PlanTier.PLUS:
      return 1;
    case PlanTier.INTERNAL:
      return 2;
  }
}

export function limitsFor(plan: PlanTier): PlanLimits {
  switch (plan) {
    case PlanTier.FREE:
      return {
        dailyMessages: LIMITS.freeDailyMessages,
        monthlyUsdMicros: BigInt(LIMITS.freeMonthlyUsdMicros),
        maxPromptUsdMicrosPerMillion: BigInt(LIMITS.freeMaxPromptUsdMicrosPerMillion),
        maxCompletionUsdMicrosPerMillion: BigInt(LIMITS.freeMaxCompletionUsdMicrosPerMillion),
      };
    case PlanTier.PLUS:
      return {
        dailyMessages: LIMITS.plusDailyMessages,
        monthlyUsdMicros: BigInt(LIMITS.plusMonthlyUsdMicros),
        maxPromptUsdMicrosPerMillion: null,
        maxCompletionUsdMicrosPerMillion: null,
      };
    case PlanTier.INTERNAL:
      return {
        dailyMessages: LIMITS.internalDailyMessages,
        monthlyUsdMicros: BigInt(LIMITS.internalMonthlyUsdMicros),
        maxPromptUsdMicrosPerMillion: null,
        maxCompletionUsdMicrosPerMillion: null,
      };
  }
}

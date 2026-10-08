import { PlanTier } from "../enums/plan-tier";

export const LIMITS = {
  contentMaxChars: 32_000,
  attachmentsMax: 4,
  uploadMaxBytes: 4 * 1024 * 1024,
  historyMaxMessages: 40,
  conversationBatchMax: 50,
  historyTrashDays: 30,
  reserveOutputTokens: 4096,
  fallbacksMax: 2,
  sendRetryOnRegionBlock: 1,
  guestTrialMessages: 5,
  freeDailyMessages: 20,
  plusDailyMessages: 200,
  internalDailyMessages: 2_000,
  freeMonthlyUsdMicros: 500_000,
  plusMonthlyUsdMicros: 20_000_000,
  internalMonthlyUsdMicros: 100_000_000,
  freeMaxPromptUsdMicrosPerMillion: 200_000,
  freeMaxCompletionUsdMicrosPerMillion: 800_000,
  notifyQuotaRemaining: 3,
  notifyGuestRemaining: 1,
} as const;

export const APP_SETTING_KEYS = [
  "guestTrialMessages",
  "freeDailyMessages",
  "plusDailyMessages",
  "internalDailyMessages",
  "freeMonthlyUsdMicros",
  "plusMonthlyUsdMicros",
  "internalMonthlyUsdMicros",
  "freeMaxPromptUsdMicrosPerMillion",
  "freeMaxCompletionUsdMicrosPerMillion",
  "uploadMaxBytes",
  "historyMaxMessages",
] as const;

export type AppSettingKey = (typeof APP_SETTING_KEYS)[number];

export type AppLimitSettings = {
  [K in AppSettingKey]: number;
};

export const APP_SETTING_DEFAULTS: AppLimitSettings = {
  guestTrialMessages: LIMITS.guestTrialMessages,
  freeDailyMessages: LIMITS.freeDailyMessages,
  plusDailyMessages: LIMITS.plusDailyMessages,
  internalDailyMessages: LIMITS.internalDailyMessages,
  freeMonthlyUsdMicros: LIMITS.freeMonthlyUsdMicros,
  plusMonthlyUsdMicros: LIMITS.plusMonthlyUsdMicros,
  internalMonthlyUsdMicros: LIMITS.internalMonthlyUsdMicros,
  freeMaxPromptUsdMicrosPerMillion: LIMITS.freeMaxPromptUsdMicrosPerMillion,
  freeMaxCompletionUsdMicrosPerMillion: LIMITS.freeMaxCompletionUsdMicrosPerMillion,
  uploadMaxBytes: LIMITS.uploadMaxBytes,
  historyMaxMessages: LIMITS.historyMaxMessages,
};

export function isAppSettingKey(value: string): value is AppSettingKey {
  return (APP_SETTING_KEYS as readonly string[]).includes(value);
}

export function mergeAppLimitSettings(rows: Array<{ key: string; value: string }>): AppLimitSettings {
  const merged: AppLimitSettings = { ...APP_SETTING_DEFAULTS };
  for (const row of rows) {
    if (!isAppSettingKey(row.key)) continue;
    const parsed = Number.parseInt(row.value, 10);
    if (Number.isFinite(parsed)) merged[row.key] = parsed;
  }
  return merged;
}

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

export function limitsFor(plan: PlanTier, settings?: AppLimitSettings): PlanLimits {
  const src = settings ?? APP_SETTING_DEFAULTS;
  switch (plan) {
    case PlanTier.FREE:
      return {
        dailyMessages: src.freeDailyMessages,
        monthlyUsdMicros: BigInt(src.freeMonthlyUsdMicros),
        maxPromptUsdMicrosPerMillion: BigInt(src.freeMaxPromptUsdMicrosPerMillion),
        maxCompletionUsdMicrosPerMillion: BigInt(src.freeMaxCompletionUsdMicrosPerMillion),
      };
    case PlanTier.PLUS:
      return {
        dailyMessages: src.plusDailyMessages,
        monthlyUsdMicros: BigInt(src.plusMonthlyUsdMicros),
        maxPromptUsdMicrosPerMillion: null,
        maxCompletionUsdMicrosPerMillion: null,
      };
    case PlanTier.INTERNAL:
      return {
        dailyMessages: src.internalDailyMessages,
        monthlyUsdMicros: BigInt(src.internalMonthlyUsdMicros),
        maxPromptUsdMicrosPerMillion: null,
        maxCompletionUsdMicrosPerMillion: null,
      };
  }
}

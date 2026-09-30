import type { Prisma, PrismaClient } from "@prisma/client";
import {
  APP_SETTING_DEFAULTS,
  APP_SETTING_KEYS,
  isAppSettingKey,
  mergeAppLimitSettings,
  type AppLimitSettings,
  type AppSettingKey,
  type UpdateLimitsRequest,
} from "@spring/shared";

type LimitsDb = PrismaClient | Prisma.TransactionClient;

let cache: AppLimitSettings | null = null;

export function invalidateAppLimits(): void {
  cache = null;
}

export async function loadAppLimits(prisma: LimitsDb): Promise<AppLimitSettings> {
  if (cache) return cache;
  const rows = await prisma.appSetting.findMany();
  cache = mergeAppLimitSettings(rows);
  return cache;
}

export async function seedAppSettings(prisma: PrismaClient): Promise<void> {
  await prisma.appSetting.createMany({
    data: APP_SETTING_KEYS.map((key) => ({
      key,
      value: String(APP_SETTING_DEFAULTS[key]),
    })),
    skipDuplicates: true,
  });
}

export async function patchAppLimits(prisma: PrismaClient, body: UpdateLimitsRequest): Promise<AppLimitSettings> {
  const entries = Object.entries(body).filter(
    (entry): entry is [AppSettingKey, number] => isAppSettingKey(entry[0]) && typeof entry[1] === "number",
  );
  for (const [key, value] of entries) {
    await prisma.appSetting.upsert({
      where: { key },
      create: { key, value: String(value) },
      update: { value: String(value) },
    });
  }
  invalidateAppLimits();
  return loadAppLimits(prisma);
}

export function publicLimitsOf(settings: AppLimitSettings): { guestTrialMessages: number; uploadMaxBytes: number } {
  return {
    guestTrialMessages: settings.guestTrialMessages,
    uploadMaxBytes: settings.uploadMaxBytes,
  };
}

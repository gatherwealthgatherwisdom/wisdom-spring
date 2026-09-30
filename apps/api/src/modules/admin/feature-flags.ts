import type { PrismaClient } from "@prisma/client";
import {
  AppError,
  ErrorCode,
  FEATURE_OFF_COPY,
  FLAG_DEFAULTS,
  FeatureFlagKey,
  isImageMime,
  isPdfMime,
} from "@spring/shared";

export async function isFlagEnabled(prisma: PrismaClient, key: FeatureFlagKey): Promise<boolean> {
  const row = await prisma.featureFlag.findUnique({ where: { key } });
  return row?.enabled ?? FLAG_DEFAULTS[key];
}

export async function assertCapabilityFlags(
  prisma: PrismaClient,
  input: { mode: string; mimes: string[] },
): Promise<{ webOn: boolean }> {
  const needImage = input.mode === "image";
  const needVision = input.mimes.some((mime) => isImageMime(mime));
  const needPdf = input.mimes.some((mime) => isPdfMime(mime));
  const [imageOn, visionOn, pdfOn, webOn] = await Promise.all([
    isFlagEnabled(prisma, FeatureFlagKey.IMAGE_GEN),
    isFlagEnabled(prisma, FeatureFlagKey.VISION),
    isFlagEnabled(prisma, FeatureFlagKey.PDF_UPLOAD),
    isFlagEnabled(prisma, FeatureFlagKey.WEB_SEARCH),
  ]);
  if (needImage && !imageOn) throw new AppError(ErrorCode.VALIDATION, FEATURE_OFF_COPY);
  if (needVision && !visionOn) throw new AppError(ErrorCode.VALIDATION, FEATURE_OFF_COPY);
  if (needPdf && !pdfOn) throw new AppError(ErrorCode.VALIDATION, FEATURE_OFF_COPY);
  return { webOn };
}

export function mergeFlagViews(
  rows: Array<{ key: string; enabled: boolean; payload: unknown; updatedAt: Date }>,
): Array<{ key: string; enabled: boolean; payload: unknown; updatedAt: string }> {
  const stored = new Map(rows.map((row) => [row.key, row]));
  return Object.values(FeatureFlagKey).map((key) => {
    const row = stored.get(key);
    return {
      key,
      enabled: row?.enabled ?? FLAG_DEFAULTS[key],
      payload: row?.payload ?? null,
      updatedAt: row?.updatedAt.toISOString() ?? new Date(0).toISOString(),
    };
  });
}

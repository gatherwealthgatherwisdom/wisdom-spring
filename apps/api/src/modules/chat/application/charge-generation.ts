import type { Prisma, PrismaClient } from "@prisma/client";
import { AppError, ErrorCode, type PlanTier } from "@spring/shared";
import { loadAppLimits } from "../../admin/app-limits";
import type { QuotaService } from "../../billing/application/quota.service";

export async function prepareCharge(
  prisma: PrismaClient,
  quota: QuotaService,
  userId: string,
  planTier: PlanTier,
  now: Date,
): Promise<"guest" | "plan"> {
  const account = await prisma.user.findUnique({ where: { id: userId } });
  if (!account || account.status !== "ACTIVE") throw new AppError(ErrorCode.AUTH_INVALID);
  if (account.registeredAt == null) {
    const { guestTrialMessages } = await loadAppLimits(prisma);
    if (account.guestUses >= guestTrialMessages) throw new AppError(ErrorCode.QUOTA_GUEST);
    return "guest";
  }
  await quota.assertCanSend({ userId, planTier, now, bonusDailyMessages: account.bonusDailyMessages });
  await quota.consumeDaily(userId, planTier, now, account.bonusDailyMessages);
  return "plan";
}

export async function chargeGuest(tx: Prisma.TransactionClient, userId: string): Promise<void> {
  const { guestTrialMessages } = await loadAppLimits(tx);
  const updated = await tx.user.updateMany({
    where: { id: userId, registeredAt: null, guestUses: { lt: guestTrialMessages } },
    data: { guestUses: { increment: 1 } },
  });
  if (updated.count === 1) return;
  const current = await tx.user.findUnique({ where: { id: userId } });
  if (current?.registeredAt) return;
  throw new AppError(ErrorCode.QUOTA_GUEST);
}

import type { Prisma, PrismaClient } from "@prisma/client";
import { AppError, ErrorCode, LIMITS, type PlanTier } from "@spring/shared";
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
    if (account.guestUses >= LIMITS.guestTrialMessages) throw new AppError(ErrorCode.QUOTA_GUEST);
    return "guest";
  }
  await quota.assertCanSend({ userId, planTier, now });
  await quota.consumeDaily(userId, planTier, now);
  return "plan";
}

export async function chargeGuest(tx: Prisma.TransactionClient, userId: string): Promise<void> {
  const updated = await tx.user.updateMany({
    where: { id: userId, registeredAt: null, guestUses: { lt: LIMITS.guestTrialMessages } },
    data: { guestUses: { increment: 1 } },
  });
  if (updated.count === 1) return;
  const current = await tx.user.findUnique({ where: { id: userId } });
  if (current?.registeredAt) return;
  throw new AppError(ErrorCode.QUOTA_GUEST);
}

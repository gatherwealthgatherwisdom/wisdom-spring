import type { Prisma, PrismaClient } from "@prisma/client";
import { createId } from "@spring/shared";

export async function writeAudit(
  prisma: PrismaClient,
  actorId: string,
  action: string,
  payload: unknown,
): Promise<void> {
  await prisma.adminAuditLog.create({
    data: {
      id: createId(),
      actorId,
      action,
      payload: JSON.parse(JSON.stringify(payload ?? {})) as Prisma.InputJsonValue,
    },
  });
}

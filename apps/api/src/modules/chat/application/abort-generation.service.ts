import type { PrismaClient } from "@prisma/client";
import { AppError, ErrorCode } from "@spring/shared";
import type { ActingUser } from "../../auth/acting-user";
import type { AbortRegistry } from "./abort-registry";

export class AbortGenerationService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly aborts: AbortRegistry,
  ) {}

  async execute(user: ActingUser, messageId: string): Promise<{ ok: true }> {
    const message = await this.prisma.message.findFirst({
      where: { id: messageId, role: "ASSISTANT", conversation: { userId: user.id } },
    });
    if (!message) throw new AppError(ErrorCode.NOT_FOUND);
    if (message.status !== "STREAMING") throw new AppError(ErrorCode.CONFLICT);
    await this.aborts.requestAbort(messageId);
    return { ok: true };
  }
}

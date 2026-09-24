import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import type { PrismaClient, User } from "@prisma/client";
import { AppError, ErrorCode, Locale, UserRole, createId, type AuthResponse } from "@spring/shared";
import type { AppEnv } from "../../env";
import type { AuthService } from "./auth.service";
import type { SmsLog, SmsSender } from "./sms-sender";

const CODE_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function hashCode(phone: string, code: string, pepper: string): string {
  return createHash("sha256").update(`${pepper}:${phone}:${code}`).digest("hex");
}

function sameHash(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function isUnique(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "P2002";
}

export class PhoneAuthService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly auth: AuthService,
    private readonly sms: SmsSender,
    private readonly env: Pick<AppEnv, "jwtAccessSecret">,
  ) {}

  async requestCode(phone: string, log: SmsLog): Promise<void> {
    const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
    const now = new Date();
    await this.prisma.phoneCode.updateMany({
      where: { phone, usedAt: null },
      data: { usedAt: now },
    });
    await this.prisma.phoneCode.create({
      data: {
        id: createId(),
        phone,
        codeHash: hashCode(phone, code, this.env.jwtAccessSecret),
        expiresAt: new Date(now.getTime() + CODE_TTL_MS),
      },
    });
    await this.sms.send(phone, code, log);
  }

  async verify(phone: string, code: string): Promise<AuthResponse> {
    const row = await this.prisma.phoneCode.findFirst({
      where: { phone, usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });
    if (!row) throw new AppError(ErrorCode.AUTH_INVALID);
    if (!sameHash(row.codeHash, hashCode(phone, code, this.env.jwtAccessSecret))) {
      const attempts = row.attempts + 1;
      await this.prisma.phoneCode.update({
        where: { id: row.id },
        data: { attempts, ...(attempts >= MAX_ATTEMPTS ? { usedAt: new Date() } : {}) },
      });
      throw new AppError(ErrorCode.AUTH_INVALID);
    }
    await this.prisma.phoneCode.update({ where: { id: row.id }, data: { usedAt: new Date() } });
    const user = await this.findOrCreate(phone);
    return this.auth.issue(user);
  }

  async complete(userId: string, displayName?: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.status !== "ACTIVE") throw new AppError(ErrorCode.AUTH_INVALID);
    if (!user.phone) throw new AppError(ErrorCode.VALIDATION, "請先用電話登入。");
    return this.prisma.user.update({
      where: { id: user.id },
      data: {
        registeredAt: user.registeredAt ?? new Date(),
        ...(displayName !== undefined ? { displayName } : {}),
      },
    });
  }

  private async findOrCreate(phone: string): Promise<User> {
    const existing = await this.prisma.user.findUnique({ where: { phone } });
    if (existing) {
      if (existing.status === "SUSPENDED") throw new AppError(ErrorCode.USER_SUSPENDED);
      if (existing.status === "DELETED") {
        return this.prisma.user.update({ where: { id: existing.id }, data: { status: "ACTIVE" } });
      }
      return existing;
    }
    try {
      return await this.prisma.user.create({
        data: {
          id: createId(),
          phone,
          locale: Locale.ZH_HK,
          role: UserRole.USER,
        },
      });
    } catch (error) {
      if (!isUnique(error)) throw error;
      const raced = await this.prisma.user.findUnique({ where: { phone } });
      if (!raced || raced.status === "DELETED") throw new AppError(ErrorCode.AUTH_INVALID);
      if (raced.status === "SUSPENDED") throw new AppError(ErrorCode.USER_SUSPENDED);
      return raced;
    }
  }
}

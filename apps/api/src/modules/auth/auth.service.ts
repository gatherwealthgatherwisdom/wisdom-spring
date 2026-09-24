import { createHash, randomBytes } from "node:crypto";
import type { PrismaClient, User } from "@prisma/client";
import argon2 from "argon2";
import { SignJWT, errors, jwtVerify } from "jose";
import {
  AppError,
  ErrorCode,
  Locale,
  UserRole,
  createId,
  type AuthResponse,
  type LoginRequest,
  type RegisterRequest,
} from "@spring/shared";
import type { AppEnv } from "../../env";
import { toActingUser, toPublic, type ActingUser } from "./acting-user";

const ACCESS_SECONDS = 15 * 60;
const REFRESH_MS = 30 * 24 * 60 * 60 * 1000;

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export class AuthService {
  private readonly accessKey: Uint8Array;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly env: AppEnv,
  ) {
    this.accessKey = new TextEncoder().encode(env.jwtAccessSecret);
  }

  async register(input: RegisterRequest): Promise<AuthResponse> {
    const existing = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (existing && existing.status !== "DELETED") {
      throw new AppError(ErrorCode.CONFLICT, "呢個電郵已經註冊。");
    }
    const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });
    const role = this.env.adminEmail && input.email === this.env.adminEmail ? UserRole.ADMIN : UserRole.USER;
    const user = existing
      ? await this.prisma.user.update({
          where: { id: existing.id },
          data: {
            email: input.email,
            passwordHash,
            status: "ACTIVE",
            role,
            displayName: input.displayName ?? null,
            locale: input.locale ?? Locale.ZH_HK,
            registeredAt: existing.registeredAt ?? new Date(),
          },
        })
      : await this.prisma.user.create({
          data: {
            id: createId(),
            email: input.email,
            passwordHash,
            role,
            displayName: input.displayName,
            locale: input.locale ?? Locale.ZH_HK,
            registeredAt: new Date(),
          },
        });
    return this.issue(user);
  }

  async login(input: LoginRequest): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (!user || !user.passwordHash || user.status === "DELETED") {
      throw new AppError(ErrorCode.AUTH_INVALID);
    }
    if (user.status === "SUSPENDED") throw new AppError(ErrorCode.USER_SUSPENDED);
    const ok = await argon2.verify(user.passwordHash, input.password);
    if (!ok) throw new AppError(ErrorCode.AUTH_INVALID);
    return this.issue(user);
  }

  async refresh(refreshToken: string): Promise<AuthResponse> {
    const row = await this.prisma.refreshToken.findUnique({
      where: { hashed: hashToken(refreshToken) },
      include: { user: true },
    });
    if (!row || row.revokedAt || row.expiresAt.getTime() <= Date.now()) {
      throw new AppError(ErrorCode.AUTH_EXPIRED);
    }
    if (row.user.status === "SUSPENDED") throw new AppError(ErrorCode.USER_SUSPENDED);
    if (row.user.status === "DELETED") throw new AppError(ErrorCode.AUTH_INVALID);
    await this.prisma.refreshToken.update({ where: { id: row.id }, data: { revokedAt: new Date() } });
    return this.issue(row.user);
  }

  async logout(refreshToken: string, all: boolean, actor: ActingUser | null): Promise<void> {
    if (all) {
      if (!actor) throw new AppError(ErrorCode.AUTH_INVALID);
      await this.prisma.refreshToken.updateMany({
        where: { userId: actor.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return;
    }
    await this.prisma.refreshToken.updateMany({
      where: { hashed: hashToken(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async authenticate(token: string): Promise<ActingUser> {
    try {
      const { payload } = await jwtVerify(token, this.accessKey, { algorithms: ["HS256"] });
      if (!payload.sub) throw new AppError(ErrorCode.AUTH_INVALID);
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user || user.status === "DELETED") throw new AppError(ErrorCode.AUTH_INVALID);
      if (user.status === "SUSPENDED") throw new AppError(ErrorCode.USER_SUSPENDED);
      return toActingUser(user);
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (error instanceof errors.JWTExpired) throw new AppError(ErrorCode.AUTH_EXPIRED);
      throw new AppError(ErrorCode.AUTH_INVALID);
    }
  }

  async issue(user: User): Promise<AuthResponse> {
    const accessToken = await new SignJWT({ role: user.role, planTier: user.planTier })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(user.id)
      .setIssuedAt()
      .setExpirationTime(`${ACCESS_SECONDS}s`)
      .sign(this.accessKey);
    const refreshToken = randomBytes(32).toString("base64url");
    await this.prisma.refreshToken.create({
      data: {
        id: createId(),
        userId: user.id,
        hashed: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_MS),
      },
    });
    return {
      accessToken,
      refreshToken,
      expiresIn: ACCESS_SECONDS,
      user: toPublic(toActingUser(user)),
    };
  }
}

import { createRemoteJWKSet, jwtVerify } from "jose";
import type { PrismaClient } from "@prisma/client";
import { AppError, ErrorCode, Locale, UserRole, createId, type AuthResponse } from "@spring/shared";
import type { AppEnv } from "../../env";
import type { AuthService } from "./auth.service";

const googleKeys = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
const appleKeys = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));

export class OAuthService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly auth: AuthService,
    private readonly env: AppEnv,
  ) {}

  async google(idToken: string): Promise<AuthResponse> {
    if (!this.env.googleClientId) throw new AppError(ErrorCode.VALIDATION, "未設定 Google 登入。");
    const { payload } = await jwtVerify(idToken, googleKeys, {
      issuer: ["https://accounts.google.com", "accounts.google.com"],
      audience: this.env.googleClientId,
    }).catch(() => {
      throw new AppError(ErrorCode.AUTH_INVALID);
    });
    const email = typeof payload.email === "string" && payload.email_verified === true ? payload.email.toLowerCase() : null;
    const name = typeof payload.name === "string" ? payload.name : null;
    if (!payload.sub) throw new AppError(ErrorCode.AUTH_INVALID);
    return this.link("google", payload.sub, email, name);
  }

  async apple(idToken: string): Promise<AuthResponse> {
    if (!this.env.appleClientId) throw new AppError(ErrorCode.VALIDATION, "未設定 Apple 登入。");
    const { payload } = await jwtVerify(idToken, appleKeys, {
      issuer: "https://appleid.apple.com",
      audience: this.env.appleClientId,
    }).catch(() => {
      throw new AppError(ErrorCode.AUTH_INVALID);
    });
    const email = typeof payload.email === "string" ? payload.email.toLowerCase() : null;
    if (!payload.sub) throw new AppError(ErrorCode.AUTH_INVALID);
    return this.link("apple", payload.sub, email, null);
  }

  private async link(provider: string, subject: string, email: string | null, displayName: string | null): Promise<AuthResponse> {
    const existingLink = await this.prisma.oAuthAccount.findUnique({
      where: { provider_subject: { provider, subject } },
      include: { user: true },
    });
    if (existingLink) {
      if (existingLink.user.status === "SUSPENDED") throw new AppError(ErrorCode.USER_SUSPENDED);
      if (existingLink.user.status === "DELETED") throw new AppError(ErrorCode.AUTH_INVALID);
      return this.auth.issue(existingLink.user);
    }

    const byEmail = email ? await this.prisma.user.findUnique({ where: { email } }) : null;
    if (byEmail && byEmail.status === "SUSPENDED") throw new AppError(ErrorCode.USER_SUSPENDED);
    const role = email && email === this.env.adminEmail ? UserRole.ADMIN : UserRole.USER;
    const user =
      byEmail && byEmail.status !== "DELETED"
        ? byEmail
        : await this.prisma.user.create({
            data: {
              id: createId(),
              email,
              role,
              displayName,
              locale: Locale.ZH_HK,
              registeredAt: new Date(),
            },
          });
    await this.prisma.oAuthAccount.create({
      data: { id: createId(), userId: user.id, provider, subject },
    });
    return this.auth.issue(user);
  }
}

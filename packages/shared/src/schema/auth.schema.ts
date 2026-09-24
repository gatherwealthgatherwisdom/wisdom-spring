import { z } from "zod";
import { LIMITS } from "../constants/limits";
import { Locale } from "../enums/locale";
import { PlanTier } from "../enums/plan-tier";
import { UserRole } from "../enums/user-role";
import { UserStatus } from "../enums/user-status";
import { normalizeHkMobile } from "../lib/phone";

const HkPhoneSchema = z
  .string()
  .trim()
  .min(8)
  .max(24)
  .transform((value, ctx) => {
    const phone = normalizeHkMobile(value);
    if (!phone) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "phone" });
      return z.NEVER;
    }
    return phone;
  });

export const RegisterRequestSchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .max(320)
    .transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(200),
  displayName: z.string().trim().min(1).max(80).optional(),
  locale: z.nativeEnum(Locale).optional(),
});

export const LoginRequestSchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(200),
});

export const RefreshRequestSchema = z.object({
  refreshToken: z.string().min(20),
});

export const LogoutRequestSchema = z.object({
  refreshToken: z.string().min(20),
  all: z.boolean().optional().default(false),
});

export const OAuthRequestSchema = z.object({
  idToken: z.string().min(20),
});

export const PhoneCodeRequestSchema = z.object({
  phone: HkPhoneSchema,
});

export const PhoneVerifyRequestSchema = z.object({
  phone: HkPhoneSchema,
  code: z.string().trim().regex(/^\d{6}$/),
});

export const PhoneRegisterRequestSchema = z.object({
  displayName: z.string().trim().min(1).max(80).optional(),
});

export const UpdateMeRequestSchema = z
  .object({
    displayName: z.string().trim().min(1).max(80).optional(),
    locale: z.nativeEnum(Locale).optional(),
  })
  .refine((value) => value.displayName !== undefined || value.locale !== undefined, {
    message: "empty",
  });

export const UserPublicSchema = z.object({
  id: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  displayName: z.string().nullable(),
  locale: z.string(),
  planTier: z.nativeEnum(PlanTier),
  role: z.nativeEnum(UserRole),
  status: z.nativeEnum(UserStatus),
  registered: z.boolean(),
  guestUses: z.number().int(),
  guestLimit: z.number().int().default(LIMITS.guestTrialMessages),
});

export const QuotaSnapshotSchema = z.object({
  dailyUsed: z.number().int(),
  dailyLimit: z.number().int(),
  monthlyUsdMicros: z.string().regex(/^\d+$/),
  monthlyLimitUsdMicros: z.string().regex(/^\d+$/),
});

export const MeResponseSchema = z.object({
  user: UserPublicSchema,
  quota: QuotaSnapshotSchema,
});

export const AuthResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number().int(),
  user: UserPublicSchema,
});

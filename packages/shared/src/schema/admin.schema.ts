import { z } from "zod";
import { PlanTier } from "../enums/plan-tier";
import { UserStatus } from "../enums/user-status";
import { PaginationQuerySchema } from "./pagination.schema";
import { UserPublicSchema } from "./auth.schema";

export const AdminUserQuerySchema = PaginationQuerySchema.extend({
  q: z.string().max(200).optional(),
});

export const AdminUpdateUserSchema = z
  .object({
    planTier: z.nativeEnum(PlanTier).optional(),
    status: z.enum([UserStatus.ACTIVE, UserStatus.SUSPENDED]).optional(),
  })
  .refine((value) => value.planTier !== undefined || value.status !== undefined, { message: "empty" });

export const FeatureFlagViewSchema = z.object({
  key: z.string(),
  enabled: z.boolean(),
  payload: z.unknown().nullable(),
  updatedAt: z.string(),
});

export const UpdateFeatureFlagSchema = z.object({
  enabled: z.boolean(),
  payload: z.unknown().optional(),
});

export const AnnouncementViewSchema = z.object({
  id: z.string().ulid(),
  bodyZh: z.string(),
  bodyEn: z.string(),
  active: z.boolean(),
  createdAt: z.string(),
});

export const UpsertAnnouncementSchema = z.object({
  bodyZh: z.string().trim().min(1).max(2_000),
  bodyEn: z.string().trim().min(1).max(2_000),
  active: z.boolean().default(true),
});

export const AuditLogViewSchema = z.object({
  id: z.string(),
  actorId: z.string(),
  action: z.string(),
  payload: z.unknown(),
  createdAt: z.string(),
});

export const UsageReportSchema = z.object({
  from: z.string(),
  to: z.string(),
  totals: z.object({
    costUsdMicros: z.string(),
    promptTokens: z.number().int(),
    completionTokens: z.number().int(),
    requests: z.number().int(),
    regionBlockRate: z.number(),
    fallbackRate: z.number(),
  }),
  byModel: z.array(
    z.object({
      model: z.string(),
      costUsdMicros: z.string(),
      promptTokens: z.number().int(),
      completionTokens: z.number().int(),
      requests: z.number().int(),
    }),
  ),
  byPlan: z.array(
    z.object({
      planTier: z.nativeEnum(PlanTier),
      costUsdMicros: z.string(),
      promptTokens: z.number().int(),
      completionTokens: z.number().int(),
      requests: z.number().int(),
    }),
  ),
});

export const AdminUserViewSchema = UserPublicSchema;

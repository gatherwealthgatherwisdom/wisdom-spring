import { z } from "zod";
import { CATALOG_KINDS } from "../constants/catalog";
import { PlanTier } from "../enums/plan-tier";
import { UserRole } from "../enums/user-role";
import { UserStatus } from "../enums/user-status";
import { ConversationModeSchema } from "./conversation.schema";
import { PaginationQuerySchema } from "./pagination.schema";
import { UserPublicSchema } from "./auth.schema";

export const AdminUserQuerySchema = PaginationQuerySchema.extend({
  q: z.string().max(200).optional(),
});

export const AdminUpdateUserSchema = z
  .object({
    planTier: z.nativeEnum(PlanTier).optional(),
    status: z.enum([UserStatus.ACTIVE, UserStatus.SUSPENDED]).optional(),
    role: z.nativeEnum(UserRole).optional(),
    resetGuestUses: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.planTier !== undefined ||
      value.status !== undefined ||
      value.role !== undefined ||
      value.resetGuestUses === true,
    { message: "empty" },
  );

export const AdminUserRowSchema = UserPublicSchema.extend({
  monthRequests: z.number().int(),
  monthCostUsdMicros: z.string(),
});

export const AdminUsageQuerySchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(),
});

export const AdminAuditQuerySchema = z.object({
  action: z.string().trim().min(1).max(64).optional(),
});

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

export const CatalogKindSchema = z.enum(CATALOG_KINDS);

export const AdminCatalogItemSchema = z.object({
  kind: CatalogKindSchema,
  id: z.string(),
  zh: z.string(),
  en: z.string(),
  blurbZh: z.string(),
  blurbEn: z.string(),
  live: z.boolean(),
  sort: z.number().int(),
  mode: ConversationModeSchema.optional(),
  templateId: z.string().optional(),
  imageStyle: z.string().optional(),
  instruction: z.string().optional(),
  icon: z.string().optional(),
  page: z.number().int().optional(),
});

export const AdminCatalogQuerySchema = z.object({
  kind: CatalogKindSchema.optional(),
});

export const UpdateCatalogEntrySchema = z
  .object({
    zh: z.string().trim().min(1).max(80).optional(),
    en: z.string().trim().min(1).max(80).optional(),
    blurbZh: z.string().trim().min(1).max(500).optional(),
    blurbEn: z.string().trim().min(1).max(500).optional(),
    live: z.boolean().optional(),
    sort: z.number().int().optional(),
    mode: ConversationModeSchema.nullable().optional(),
    templateId: z.string().trim().min(1).max(32).nullable().optional(),
    imageStyle: z.string().trim().min(1).max(32).nullable().optional(),
    instruction: z.string().max(8_000).nullable().optional(),
    icon: z.string().trim().min(1).max(64).nullable().optional(),
    page: z.number().int().min(0).max(9).nullable().optional(),
  })
  .refine(
    (value) =>
      value.zh !== undefined ||
      value.en !== undefined ||
      value.blurbZh !== undefined ||
      value.blurbEn !== undefined ||
      value.live !== undefined ||
      value.sort !== undefined ||
      value.mode !== undefined ||
      value.templateId !== undefined ||
      value.imageStyle !== undefined ||
      value.instruction !== undefined ||
      value.icon !== undefined ||
      value.page !== undefined,
    { message: "empty" },
  );

export const CreateCatalogEntrySchema = z.object({
  kind: CatalogKindSchema,
  id: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9-]+$/),
  zh: z.string().trim().min(1).max(80),
  en: z.string().trim().min(1).max(80),
  blurbZh: z.string().trim().min(1).max(500),
  blurbEn: z.string().trim().min(1).max(500),
  live: z.boolean().default(true),
  sort: z.number().int().default(100),
  mode: ConversationModeSchema.optional(),
  templateId: z.string().trim().min(1).max(32).optional(),
  imageStyle: z.string().trim().min(1).max(32).optional(),
  instruction: z.string().max(8_000).optional(),
  icon: z.string().trim().min(1).max(64).optional(),
  page: z.number().int().min(0).max(9).optional(),
});

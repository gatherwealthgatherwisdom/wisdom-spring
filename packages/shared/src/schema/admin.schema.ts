import { z } from "zod";
import { CATALOG_KINDS } from "../constants/catalog";
import { DISCOVER_ART_IDS, DISCOVER_SECTIONS, DISCOVER_TONE_RE } from "../constants/discover";
import { PlanTier } from "../enums/plan-tier";
import { UserRole } from "../enums/user-role";
import { UserStatus } from "../enums/user-status";
import { ConversationModeSchema, ConversationViewSchema } from "./conversation.schema";
import { MessageViewSchema } from "./message.schema";
import { PaginationQuerySchema } from "./pagination.schema";
import { QuotaSnapshotSchema, UserPublicSchema } from "./auth.schema";

export const AdminUserQuerySchema = PaginationQuerySchema.extend({
  q: z.string().max(200).optional(),
});

export const AdminUpdateUserSchema = z
  .object({
    planTier: z.nativeEnum(PlanTier).optional(),
    status: z.enum([UserStatus.ACTIVE, UserStatus.SUSPENDED]).optional(),
    role: z.nativeEnum(UserRole).optional(),
    resetGuestUses: z.boolean().optional(),
    bonusDailyMessages: z.number().int().min(0).max(10_000).optional(),
  })
  .refine(
    (value) =>
      value.planTier !== undefined ||
      value.status !== undefined ||
      value.role !== undefined ||
      value.resetGuestUses === true ||
      value.bonusDailyMessages !== undefined,
    { message: "empty" },
  );

export const AdminUserRowSchema = UserPublicSchema.extend({
  monthRequests: z.number().int(),
  monthCostUsdMicros: z.string(),
});

export const AdminUserDetailSchema = z.object({
  user: UserPublicSchema.extend({ bonusDailyMessages: z.number().int() }),
  quota: QuotaSnapshotSchema,
  monthUsage: z.object({
    requests: z.number().int(),
    costUsdMicros: z.string(),
    promptTokens: z.number().int(),
    completionTokens: z.number().int(),
  }),
  thumbs: z.object({
    up: z.number().int(),
    down: z.number().int(),
  }),
});

export const AdminConversationViewSchema = ConversationViewSchema.extend({
  userId: z.string(),
});

export const AdminMessageViewSchema = MessageViewSchema.extend({
  costUsdMicros: z.string(),
});

export const AdminConversationDetailSchema = z.object({
  conversation: AdminConversationViewSchema,
  messages: z.array(AdminMessageViewSchema),
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

export const AdminLimitsSchema = z.object({
  guestTrialMessages: z.number().int(),
  freeDailyMessages: z.number().int(),
  plusDailyMessages: z.number().int(),
  internalDailyMessages: z.number().int(),
  freeMonthlyUsdMicros: z.number().int(),
  plusMonthlyUsdMicros: z.number().int(),
  internalMonthlyUsdMicros: z.number().int(),
  freeMaxPromptUsdMicrosPerMillion: z.number().int(),
  freeMaxCompletionUsdMicrosPerMillion: z.number().int(),
  uploadMaxBytes: z.number().int(),
  historyMaxMessages: z.number().int(),
});

export const UpdateLimitsSchema = z
  .object({
    guestTrialMessages: z.number().int().min(0).max(100).optional(),
    freeDailyMessages: z.number().int().min(1).max(100_000).optional(),
    plusDailyMessages: z.number().int().min(1).max(100_000).optional(),
    internalDailyMessages: z.number().int().min(1).max(100_000).optional(),
    freeMonthlyUsdMicros: z.number().int().min(1).optional(),
    plusMonthlyUsdMicros: z.number().int().min(1).optional(),
    internalMonthlyUsdMicros: z.number().int().min(1).optional(),
    freeMaxPromptUsdMicrosPerMillion: z.number().int().min(1).optional(),
    freeMaxCompletionUsdMicrosPerMillion: z.number().int().min(1).optional(),
    uploadMaxBytes: z.number().int().min(64 * 1024).max(32 * 1024 * 1024).optional(),
    historyMaxMessages: z.number().int().min(1).max(200).optional(),
  })
  .refine(
    (value) =>
      value.guestTrialMessages !== undefined ||
      value.freeDailyMessages !== undefined ||
      value.plusDailyMessages !== undefined ||
      value.internalDailyMessages !== undefined ||
      value.freeMonthlyUsdMicros !== undefined ||
      value.plusMonthlyUsdMicros !== undefined ||
      value.internalMonthlyUsdMicros !== undefined ||
      value.freeMaxPromptUsdMicrosPerMillion !== undefined ||
      value.freeMaxCompletionUsdMicrosPerMillion !== undefined ||
      value.uploadMaxBytes !== undefined ||
      value.historyMaxMessages !== undefined,
    { message: "empty" },
  );

export const AdminCopySchema = z.object({
  system: z.string(),
  look: z.string(),
  file: z.string(),
  titleJob: z.string(),
  emptyHero: z.array(z.string()),
});

export const UpdateCopySchema = z
  .object({
    system: z.string().trim().min(1).max(8_000).optional(),
    look: z.string().trim().min(1).max(500).optional(),
    file: z.string().trim().min(1).max(500).optional(),
    titleJob: z.string().trim().min(1).max(500).optional(),
    emptyHero: z.array(z.string().trim().min(1).max(80)).min(1).max(12).optional(),
  })
  .refine(
    (value) =>
      value.system !== undefined ||
      value.look !== undefined ||
      value.file !== undefined ||
      value.titleJob !== undefined ||
      value.emptyHero !== undefined,
    { message: "empty" },
  );

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
  byUser: z.array(
    z.object({
      userId: z.string(),
      email: z.string().nullable(),
      phone: z.string().nullable(),
      displayName: z.string().nullable(),
      requests: z.number().int(),
      costUsdMicros: z.string(),
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
  section: z.enum(DISCOVER_SECTIONS).optional(),
  tone: z.string().regex(DISCOVER_TONE_RE).optional(),
  art: z.enum(DISCOVER_ART_IDS).optional(),
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
    section: z.enum(DISCOVER_SECTIONS).nullable().optional(),
    tone: z.string().regex(DISCOVER_TONE_RE).nullable().optional(),
    art: z.enum(DISCOVER_ART_IDS).nullable().optional(),
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
      value.page !== undefined ||
      value.section !== undefined ||
      value.tone !== undefined ||
      value.art !== undefined,
    { message: "empty" },
  );

export const CreateCatalogEntrySchema = z.object({
  kind: CatalogKindSchema,
  id: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[A-Za-z0-9-]+$/),
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
  section: z.enum(DISCOVER_SECTIONS).optional(),
  tone: z.string().regex(DISCOVER_TONE_RE).optional(),
  art: z.enum(DISCOVER_ART_IDS).optional(),
})
  .superRefine((value, ctx) => {
    if (value.kind !== "discover") return;
    if (!value.section) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["section"], message: "section" });
    if (!value.tone) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["tone"], message: "tone" });
    if (!value.art) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["art"], message: "art" });
  });

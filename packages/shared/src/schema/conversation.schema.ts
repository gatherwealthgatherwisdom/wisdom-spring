import { z } from "zod";
import { LIMITS } from "../constants/limits";
import { CONVERSATION_MODES } from "../constants/tools";
import { ConversationStatus } from "../enums/conversation-status";
import { MessageRole } from "../enums/message-role";
import { PaginationQuerySchema } from "./pagination.schema";

export const ConversationModeSchema = z.enum(CONVERSATION_MODES);

export const ConversationPreviewRoleSchema = z.enum([MessageRole.USER, MessageRole.ASSISTANT]);

export const ConversationViewSchema = z.object({
  id: z.string().ulid(),
  title: z.string().nullable(),
  status: z.nativeEnum(ConversationStatus),
  mode: ConversationModeSchema,
  templateId: z.string().nullable(),
  sourceLang: z.string().nullable(),
  targetLang: z.string().nullable(),
  imageStyle: z.string().nullable(),
  lastImageUrl: z.string().nullable(),
  pinnedAt: z.string().nullable(),
  lastMessageAt: z.string(),
  createdAt: z.string(),
  preview: z.string().nullable(),
  previewRole: ConversationPreviewRoleSchema.nullable(),
});

export const CreateConversationSchema = z.object({
  title: z.string().trim().min(1).max(80).optional(),
});

export const UpdateConversationSchema = z
  .object({
    title: z.string().trim().min(1).max(80).nullable().optional(),
    pinned: z.boolean().optional(),
    status: z.enum([ConversationStatus.ACTIVE, ConversationStatus.ARCHIVED]).optional(),
  })
  .refine(
    (value) => value.title !== undefined || value.pinned !== undefined || value.status !== undefined,
    { message: "empty" },
  );

export const ListConversationsQuerySchema = PaginationQuerySchema.extend({
  q: z.string().max(200).optional(),
  status: z.enum([ConversationStatus.ACTIVE, ConversationStatus.ARCHIVED]).optional(),
  mode: ConversationModeSchema.optional(),
});

export const ConversationSyncQuerySchema = z.object({
  since: z.string().min(1).max(40).optional(),
});

export const ConversationSyncSchema = z.object({
  items: z.array(ConversationViewSchema),
  deletedIds: z.array(z.string().ulid()),
  pulledAt: z.string(),
});

export const ConversationBatchSchema = z
  .object({
    ids: z.array(z.string().ulid()).min(1).max(LIMITS.conversationBatchMax),
    pinned: z.boolean().optional(),
    status: z.enum([ConversationStatus.ACTIVE, ConversationStatus.ARCHIVED]).optional(),
    delete: z.literal(true).optional(),
  })
  .refine((value) => new Set(value.ids).size === value.ids.length, { message: "ids" })
  .refine(
    (value) => [value.pinned !== undefined, value.status !== undefined, value.delete === true].filter(Boolean).length === 1,
    { message: "action" },
  );

export const ConversationBatchResultSchema = z.object({
  items: z.array(ConversationViewSchema),
  deletedIds: z.array(z.string().ulid()),
});

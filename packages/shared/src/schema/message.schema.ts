import { z } from "zod";
import { ErrorCode } from "../enums/error-code";
import { MessageRole } from "../enums/message-role";
import { MessageStatus } from "../enums/message-status";
import { LIMITS } from "../constants/limits";
import { ConversationModeSchema } from "./conversation.schema";
import { PaginationQuerySchema } from "./pagination.schema";

export const SendMessageRequestSchema = z.object({
  conversationId: z.string().ulid().optional(),
  content: z.string().trim().min(1).max(LIMITS.contentMaxChars),
  attachments: z
    .array(z.object({ assetId: z.string().ulid() }))
    .max(LIMITS.attachmentsMax)
    .default([]),
  clientMessageId: z.string().uuid(),
  mode: ConversationModeSchema.optional(),
  templateId: z.string().max(32).optional(),
  sourceLang: z.string().max(16).optional(),
  targetLang: z.string().max(16).optional(),
  imageStyle: z.string().max(32).optional(),
});

export const CapabilitiesSchema = z.object({
  image: z.boolean(),
});

export const MessageViewSchema = z.object({
  id: z.string().ulid(),
  conversationId: z.string().ulid(),
  role: z.nativeEnum(MessageRole),
  status: z.nativeEnum(MessageStatus),
  content: z.string(),
  requestedModel: z.string().nullable(),
  servedModel: z.string().nullable(),
  fallbackUsed: z.boolean(),
  parentMessageId: z.string().nullable(),
  errorCode: z.string().nullable(),
  createdAt: z.string(),
});

export const ListMessagesQuerySchema = PaginationQuerySchema;

export const SseMetaSchema = z.object({
  messageId: z.string().ulid(),
  conversationId: z.string().ulid(),
  requestedModel: z.string(),
});

export const SseDeltaSchema = z.object({
  text: z.string(),
});

export const SseDoneSchema = z.object({
  servedModel: z.string(),
  fallbackUsed: z.boolean(),
  usage: z.object({
    promptTokens: z.number().int(),
    completionTokens: z.number().int(),
  }),
  costUsdMicros: z.string().regex(/^\d+$/),
});

export const SseErrorSchema = z.object({
  code: z.nativeEnum(ErrorCode),
  message: z.string(),
});

export const ErrorEnvelopeSchema = z.object({
  error: z.object({
    code: z.nativeEnum(ErrorCode),
    message: z.string(),
  }),
});

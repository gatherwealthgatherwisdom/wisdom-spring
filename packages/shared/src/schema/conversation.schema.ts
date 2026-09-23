import { z } from "zod";
import { ConversationStatus } from "../enums/conversation-status";
import { PaginationQuerySchema } from "./pagination.schema";

export const ConversationViewSchema = z.object({
  id: z.string().ulid(),
  title: z.string().nullable(),
  status: z.nativeEnum(ConversationStatus),
  pinnedAt: z.string().nullable(),
  lastMessageAt: z.string(),
  createdAt: z.string(),
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
});

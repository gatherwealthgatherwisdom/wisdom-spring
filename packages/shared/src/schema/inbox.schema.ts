import { z } from "zod";
import { INBOX_KINDS } from "../constants/inbox";
import { PaginationQuerySchema } from "./pagination.schema";

export const InboxKindSchema = z.enum(INBOX_KINDS);

export const InboxListQuerySchema = PaginationQuerySchema;

export const InboxNoticeViewSchema = z.object({
  id: z.string(),
  kind: InboxKindSchema,
  title: z.string(),
  body: z.string(),
  data: z.record(z.unknown()).nullable(),
  createdAt: z.string(),
  readAt: z.string().nullable(),
  expiresAt: z.string().nullable(),
  expired: z.boolean(),
});

export const InboxListResponseSchema = z.object({
  items: z.array(InboxNoticeViewSchema),
  unreadCount: z.number().int(),
  nextCursor: z.string().nullable(),
});

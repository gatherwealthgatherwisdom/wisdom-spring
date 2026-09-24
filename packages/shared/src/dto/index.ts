import type { z } from "zod";
import type {
  AdminUpdateUserSchema,
  AdminUserQuerySchema,
  AnnouncementViewSchema,
  AuditLogViewSchema,
  FeatureFlagViewSchema,
  UpdateFeatureFlagSchema,
  UpsertAnnouncementSchema,
  UsageReportSchema,
} from "../schema/admin.schema";
import type {
  AuthResponseSchema,
  LoginRequestSchema,
  LogoutRequestSchema,
  MeResponseSchema,
  OAuthRequestSchema,
  PhoneCodeRequestSchema,
  PhoneRegisterRequestSchema,
  PhoneVerifyRequestSchema,
  QuotaSnapshotSchema,
  RefreshRequestSchema,
  RegisterRequestSchema,
  UpdateMeRequestSchema,
  UserPublicSchema,
} from "../schema/auth.schema";
import type {
  ConversationViewSchema,
  CreateConversationSchema,
  ListConversationsQuerySchema,
  UpdateConversationSchema,
} from "../schema/conversation.schema";
import type {
  ListMessagesQuerySchema,
  MessageViewSchema,
  SendMessageRequestSchema,
  SseDeltaSchema,
  SseDoneSchema,
  SseErrorSchema,
  SseMetaSchema,
} from "../schema/message.schema";
import type {
  ModelPoolViewSchema,
  SimulateDrawRequestSchema,
  SimulateDrawResponseSchema,
  UpdateModelPoolSchema,
} from "../schema/model.schema";
import type { PaginationQuerySchema } from "../schema/pagination.schema";

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type RefreshRequest = z.infer<typeof RefreshRequestSchema>;
export type LogoutRequest = z.infer<typeof LogoutRequestSchema>;
export type OAuthRequest = z.infer<typeof OAuthRequestSchema>;
export type PhoneCodeRequest = z.infer<typeof PhoneCodeRequestSchema>;
export type PhoneVerifyRequest = z.infer<typeof PhoneVerifyRequestSchema>;
export type PhoneRegisterRequest = z.infer<typeof PhoneRegisterRequestSchema>;
export type UpdateMeRequest = z.infer<typeof UpdateMeRequestSchema>;
export type UserPublic = z.infer<typeof UserPublicSchema>;
export type QuotaSnapshot = z.infer<typeof QuotaSnapshotSchema>;
export type MeResponse = z.infer<typeof MeResponseSchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
export type ConversationView = z.infer<typeof ConversationViewSchema>;
export type CreateConversationRequest = z.infer<typeof CreateConversationSchema>;
export type UpdateConversationRequest = z.infer<typeof UpdateConversationSchema>;
export type ListConversationsQuery = z.infer<typeof ListConversationsQuerySchema>;
export type SendMessageRequest = z.infer<typeof SendMessageRequestSchema>;
export type MessageView = z.infer<typeof MessageViewSchema>;
export type ListMessagesQuery = z.infer<typeof ListMessagesQuerySchema>;
export type SseMeta = z.infer<typeof SseMetaSchema>;
export type SseDelta = z.infer<typeof SseDeltaSchema>;
export type SseDone = z.infer<typeof SseDoneSchema>;
export type SseError = z.infer<typeof SseErrorSchema>;
export type ModelPoolView = z.infer<typeof ModelPoolViewSchema>;
export type UpdateModelPoolRequest = z.infer<typeof UpdateModelPoolSchema>;
export type SimulateDrawRequest = z.infer<typeof SimulateDrawRequestSchema>;
export type SimulateDrawResponse = z.infer<typeof SimulateDrawResponseSchema>;
export type AdminUpdateUserRequest = z.infer<typeof AdminUpdateUserSchema>;
export type AdminUserQuery = z.infer<typeof AdminUserQuerySchema>;
export type FeatureFlagView = z.infer<typeof FeatureFlagViewSchema>;
export type UpdateFeatureFlagRequest = z.infer<typeof UpdateFeatureFlagSchema>;
export type AnnouncementView = z.infer<typeof AnnouncementViewSchema>;
export type UpsertAnnouncementRequest = z.infer<typeof UpsertAnnouncementSchema>;
export type AuditLogView = z.infer<typeof AuditLogViewSchema>;
export type UsageReport = z.infer<typeof UsageReportSchema>;

import type { z } from "zod";
import type {
  AdminCatalogItemSchema,
  AdminCatalogQuerySchema,
  AdminConversationDetailSchema,
  AdminConversationViewSchema,
  AdminMessageViewSchema,
  AdminUpdateUserSchema,
  AdminUserDetailSchema,
  AdminUserQuerySchema,
  AdminUserRowSchema,
  AnnouncementViewSchema,
  AuditLogViewSchema,
  CreateCatalogEntrySchema,
  AdminCopySchema,
  AdminLimitsSchema,
  FeatureFlagViewSchema,
  UpdateCatalogEntrySchema,
  UpdateCopySchema,
  UpdateFeatureFlagSchema,
  UpdateLimitsSchema,
  UpsertAnnouncementSchema,
  UsageReportSchema,
} from "../schema/admin.schema";
import type {
  AuthResponseSchema,
  LoginRequestSchema,
  LogoutRequestSchema,
  MeResponseSchema,
  MeUsageSchema,
  OAuthRequestSchema,
  PhoneCodeRequestSchema,
  PhoneRegisterRequestSchema,
  PhoneVerifyRequestSchema,
  PublicCopySchema,
  PublicFlagsResponseSchema,
  PublicFlagSchema,
  PublicLimitsSchema,
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
  ConversationExportSchema,
  FeedbackRequestSchema,
  ListMessagesQuerySchema,
  MessageViewSchema,
  SendMessageRequestSchema,
  SseDeltaSchema,
  SseDoneSchema,
  SseErrorSchema,
  SseMetaSchema,
} from "../schema/message.schema";
import type { AssetViewSchema, UploadRequestSchema } from "../schema/upload.schema";
import type {
  CatalogAideViewSchema,
  CatalogAidesResponseSchema,
  CatalogLanguageViewSchema,
  CatalogLanguagesResponseSchema,
  CatalogStyleViewSchema,
  CatalogStylesResponseSchema,
  CatalogToolViewSchema,
  CatalogToolsResponseSchema,
  CatalogDiscoverResponseSchema,
  CatalogDiscoverViewSchema,
  CatalogWriteResponseSchema,
  CatalogWriteViewSchema,
} from "../schema/catalog.schema";
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
export type MeUsage = z.infer<typeof MeUsageSchema>;
export type PublicFlag = z.infer<typeof PublicFlagSchema>;
export type PublicFlagsResponse = z.infer<typeof PublicFlagsResponseSchema>;
export type PublicLimits = z.infer<typeof PublicLimitsSchema>;
export type PublicCopy = z.infer<typeof PublicCopySchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
export type ConversationView = z.infer<typeof ConversationViewSchema>;
export type CreateConversationRequest = z.infer<typeof CreateConversationSchema>;
export type UpdateConversationRequest = z.infer<typeof UpdateConversationSchema>;
export type ListConversationsQuery = z.infer<typeof ListConversationsQuerySchema>;
export type SendMessageRequest = z.infer<typeof SendMessageRequestSchema>;
export type MessageView = z.infer<typeof MessageViewSchema>;
export type ListMessagesQuery = z.infer<typeof ListMessagesQuerySchema>;
export type FeedbackRequest = z.infer<typeof FeedbackRequestSchema>;
export type ConversationExport = z.infer<typeof ConversationExportSchema>;
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
export type AdminUserRow = z.infer<typeof AdminUserRowSchema>;
export type AdminUserDetail = z.infer<typeof AdminUserDetailSchema>;
export type AdminConversationView = z.infer<typeof AdminConversationViewSchema>;
export type AdminMessageView = z.infer<typeof AdminMessageViewSchema>;
export type AdminConversationDetail = z.infer<typeof AdminConversationDetailSchema>;
export type FeatureFlagView = z.infer<typeof FeatureFlagViewSchema>;
export type UpdateFeatureFlagRequest = z.infer<typeof UpdateFeatureFlagSchema>;
export type AdminLimits = z.infer<typeof AdminLimitsSchema>;
export type UpdateLimitsRequest = z.infer<typeof UpdateLimitsSchema>;
export type AdminCopy = z.infer<typeof AdminCopySchema>;
export type UpdateCopyRequest = z.infer<typeof UpdateCopySchema>;
export type AnnouncementView = z.infer<typeof AnnouncementViewSchema>;
export type UpsertAnnouncementRequest = z.infer<typeof UpsertAnnouncementSchema>;
export type AuditLogView = z.infer<typeof AuditLogViewSchema>;
export type UsageReport = z.infer<typeof UsageReportSchema>;
export type CatalogToolView = z.infer<typeof CatalogToolViewSchema>;
export type CatalogAideView = z.infer<typeof CatalogAideViewSchema>;
export type CatalogToolsResponse = z.infer<typeof CatalogToolsResponseSchema>;
export type CatalogAidesResponse = z.infer<typeof CatalogAidesResponseSchema>;
export type CatalogWriteView = z.infer<typeof CatalogWriteViewSchema>;
export type CatalogStyleView = z.infer<typeof CatalogStyleViewSchema>;
export type CatalogLanguageView = z.infer<typeof CatalogLanguageViewSchema>;
export type CatalogWriteResponse = z.infer<typeof CatalogWriteResponseSchema>;
export type CatalogStylesResponse = z.infer<typeof CatalogStylesResponseSchema>;
export type CatalogLanguagesResponse = z.infer<typeof CatalogLanguagesResponseSchema>;
export type CatalogDiscoverView = z.infer<typeof CatalogDiscoverViewSchema>;
export type CatalogDiscoverResponse = z.infer<typeof CatalogDiscoverResponseSchema>;
export type AdminCatalogItem = z.infer<typeof AdminCatalogItemSchema>;
export type AdminCatalogQuery = z.infer<typeof AdminCatalogQuerySchema>;
export type UpdateCatalogEntryRequest = z.infer<typeof UpdateCatalogEntrySchema>;
export type CreateCatalogEntryRequest = z.infer<typeof CreateCatalogEntrySchema>;
export type UploadRequest = z.infer<typeof UploadRequestSchema>;
export type AssetView = z.infer<typeof AssetViewSchema>;

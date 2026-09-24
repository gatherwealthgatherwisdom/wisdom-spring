import type {
  AdminUpdateUserRequest,
  AnnouncementView,
  AuditLogView,
  AuthResponse,
  ConversationView,
  FeatureFlagView,
  LoginRequest,
  MeResponse,
  MessageView,
  ModelPoolView,
  Page,
  QuotaSnapshot,
  RegisterRequest,
  SendMessageRequest,
  SimulateDrawRequest,
  SimulateDrawResponse,
  SseDelta,
  SseDone,
  SseError,
  SseMeta,
  UpdateConversationRequest,
  UpdateFeatureFlagRequest,
  UpdateMeRequest,
  UpdateModelPoolRequest,
  UpsertAnnouncementRequest,
  UsageReport,
  UserPublic,
} from "@spring/shared";
import { createSseParser } from "./sse";

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

export interface SessionTokens {
  accessToken: string | null;
  refreshToken: string | null;
}

export interface StreamHandlers {
  onMeta?: (event: SseMeta) => void;
  onDelta?: (event: SseDelta) => void;
  onDone?: (event: SseDone) => void;
  onError?: (event: SseError) => void;
}

type PageOf<T> = Page<T>;

export class SpringClient {
  constructor(
    private readonly baseUrl: string,
    private readonly readTokens: () => SessionTokens,
    private readonly writeTokens: (tokens: SessionTokens) => void,
    private readonly transport: "fetch" | "xhr" = "fetch",
  ) {}

  register(body: RegisterRequest): Promise<AuthResponse> {
    return this.authPost("/v1/auth/register", body);
  }

  login(body: LoginRequest): Promise<AuthResponse> {
    return this.authPost("/v1/auth/login", body);
  }

  logout(all = false): Promise<{ ok: true }> {
    const refreshToken = this.readTokens().refreshToken;
    return this.request("/v1/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refreshToken: refreshToken ?? "", all }),
    });
  }

  me(): Promise<MeResponse> {
    return this.request("/v1/me");
  }

  updateMe(body: UpdateMeRequest): Promise<MeResponse> {
    return this.request("/v1/me", { method: "PATCH", body: JSON.stringify(body) });
  }

  deleteMe(): Promise<{ ok: true }> {
    return this.request("/v1/me", { method: "DELETE" });
  }

  announcements(): Promise<PageOf<AnnouncementView>> {
    return this.request("/v1/announcements");
  }

  conversations(query?: { q?: string; cursor?: string }): Promise<PageOf<ConversationView>> {
    return this.request(`/v1/conversations${queryString(query)}`);
  }

  createConversation(title?: string): Promise<ConversationView> {
    return this.request("/v1/conversations", { method: "POST", body: JSON.stringify(title ? { title } : {}) });
  }

  updateConversation(id: string, body: UpdateConversationRequest): Promise<ConversationView> {
    return this.request(`/v1/conversations/${id}`, { method: "PATCH", body: JSON.stringify(body) });
  }

  deleteConversation(id: string): Promise<{ ok: true }> {
    return this.request(`/v1/conversations/${id}`, { method: "DELETE" });
  }

  messages(conversationId: string): Promise<PageOf<MessageView>> {
    return this.request(`/v1/conversations/${conversationId}/messages?limit=100`);
  }

  capabilities(): Promise<{ image: boolean }> {
    return this.request("/v1/capabilities");
  }

  sendMessage(body: SendMessageRequest, handlers: StreamHandlers, signal?: AbortSignal): Promise<void> {
    return this.stream("/v1/messages", body, handlers, signal);
  }

  regenerate(messageId: string, handlers: StreamHandlers, signal?: AbortSignal): Promise<void> {
    return this.stream(`/v1/messages/${messageId}/regenerate`, {}, handlers, signal);
  }

  abort(messageId: string): Promise<{ ok: true }> {
    return this.request(`/v1/messages/${messageId}/abort`, { method: "POST" });
  }

  adminUsers(q?: string): Promise<PageOf<UserPublic>> {
    return this.request(`/admin/users${queryString(q ? { q } : undefined)}`);
  }

  adminUpdateUser(id: string, body: AdminUpdateUserRequest): Promise<UserPublic> {
    return this.request(`/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(body) });
  }

  adminModels(): Promise<{ items: ModelPoolView[] }> {
    return this.request("/admin/models");
  }

  adminUpdateModel(slug: string, body: UpdateModelPoolRequest): Promise<{ ok: true }> {
    const [author, name] = splitSlug(slug);
    return this.request(`/admin/models/${encodeURIComponent(author)}/${encodeURIComponent(name)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  }

  adminProbe(slug: string): Promise<unknown> {
    const [author, name] = splitSlug(slug);
    return this.request(`/admin/models/${encodeURIComponent(author)}/${encodeURIComponent(name)}/probe`, {
      method: "POST",
    });
  }

  adminSimulate(body: Partial<SimulateDrawRequest> = {}): Promise<SimulateDrawResponse> {
    return this.request("/admin/models/simulate-draw", { method: "POST", body: JSON.stringify(body) });
  }

  adminUsage(): Promise<UsageReport> {
    return this.request("/admin/usage");
  }

  adminFlags(): Promise<{ items: FeatureFlagView[] }> {
    return this.request("/admin/flags");
  }

  adminUpdateFlag(key: string, body: UpdateFeatureFlagRequest): Promise<FeatureFlagView> {
    return this.request(`/admin/flags/${encodeURIComponent(key)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  }

  adminAudit(): Promise<{ items: AuditLogView[] }> {
    return this.request("/admin/audit");
  }

  adminAnnouncements(): Promise<PageOf<AnnouncementView>> {
    return this.request("/admin/announcements");
  }

  adminCreateAnnouncement(body: UpsertAnnouncementRequest): Promise<AnnouncementView> {
    return this.request("/admin/announcements", { method: "POST", body: JSON.stringify(body) });
  }

  adminUpdateAnnouncement(id: string, body: UpsertAnnouncementRequest): Promise<AnnouncementView> {
    return this.request(`/admin/announcements/${id}`, { method: "PATCH", body: JSON.stringify(body) });
  }

  private async authPost(path: string, body: unknown): Promise<AuthResponse> {
    const session = await this.request<AuthResponse>(path, { method: "POST", body: JSON.stringify(body) }, false);
    this.writeTokens({ accessToken: session.accessToken, refreshToken: session.refreshToken });
    return session;
  }

  private async request<T>(path: string, init?: RequestInit, retry = true): Promise<T> {
    const headers = new Headers(init?.headers);
    if (init?.body) headers.set("content-type", "application/json");
    const access = this.readTokens().accessToken;
    if (access) headers.set("authorization", `Bearer ${access}`);
    const response = await fetch(`${this.baseUrl}${path}`, { ...init, headers });
    if (response.status === 401 && retry && this.readTokens().refreshToken) {
      await this.refresh();
      return this.request(path, init, false);
    }
    return parseBody<T>(response);
  }

  private async refresh(): Promise<void> {
    const refreshToken = this.readTokens().refreshToken;
    if (!refreshToken) throw new ApiError("AUTH_EXPIRED", "登入已過期，請再登入。", 401);
    const response = await fetch(`${this.baseUrl}/v1/auth/refresh`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    const session = await parseBody<AuthResponse>(response);
    this.writeTokens({ accessToken: session.accessToken, refreshToken: session.refreshToken });
  }

  private async stream(path: string, body: unknown, handlers: StreamHandlers, signal?: AbortSignal): Promise<void> {
    if (this.transport === "xhr") {
      await this.streamXhr(path, body, handlers, signal);
      return;
    }
    const headers = new Headers({ "content-type": "application/json" });
    const access = this.readTokens().accessToken;
    if (access) headers.set("authorization", `Bearer ${access}`);
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal,
    });
    if (!response.ok) {
      await parseBody(response);
      return;
    }
    if (response.body && typeof response.body.getReader === "function") {
      await readWebStream(response.body, handlers);
      return;
    }
    dispatchSse(await response.text(), handlers);
  }

  private streamXhr(path: string, body: unknown, handlers: StreamHandlers, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      let cursor = 0;
      const parser = createSseParser((event, data) => dispatchEvent(event, data, handlers));
      xhr.open("POST", `${this.baseUrl}${path}`);
      xhr.setRequestHeader("content-type", "application/json");
      const access = this.readTokens().accessToken;
      if (access) xhr.setRequestHeader("authorization", `Bearer ${access}`);
      xhr.onprogress = () => {
        const chunk = xhr.responseText.slice(cursor);
        cursor = xhr.responseText.length;
        parser.push(chunk);
      };
      xhr.onload = () => {
        parser.push(xhr.responseText.slice(cursor));
        parser.end();
        if (xhr.status >= 400) {
          reject(errorFromText(xhr.responseText, xhr.status));
          return;
        }
        resolve();
      };
      xhr.onerror = () => reject(new ApiError("UPSTREAM_UNAVAILABLE", "智泉暫時回應唔到，請稍後再試。", 0));
      xhr.onabort = () => resolve();
      signal?.addEventListener("abort", () => xhr.abort());
      xhr.send(JSON.stringify(body));
    });
  }
}

function splitSlug(slug: string): [string, string] {
  const index = slug.indexOf("/");
  if (index <= 0) return [slug, "model"];
  return [slug.slice(0, index), slug.slice(index + 1)];
}

function queryString(query?: { q?: string; cursor?: string }): string {
  if (!query) return "";
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.cursor) params.set("cursor", query.cursor);
  const text = params.toString();
  return text ? `?${text}` : "";
}

async function parseBody<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!response.ok) throw errorFromText(text, response.status);
  return (text ? JSON.parse(text) : null) as T;
}

function errorFromText(text: string, status: number): ApiError {
  try {
    const body = JSON.parse(text) as { error?: { code?: string; message?: string } };
    if (body.error?.code && body.error.message) return new ApiError(body.error.code, body.error.message, status);
  } catch {
    // Not an error envelope.
  }
  return new ApiError("INTERNAL", "智泉暫時回應唔到，請稍後再試。", status);
}

function dispatchSse(text: string, handlers: StreamHandlers): void {
  const parser = createSseParser((event, data) => dispatchEvent(event, data, handlers));
  parser.push(text);
  parser.end();
}

function dispatchEvent(event: string, data: string, handlers: StreamHandlers): void {
  const parsed = JSON.parse(data) as SseMeta & SseDelta & SseDone & SseError;
  if (event === "meta") handlers.onMeta?.(parsed);
  else if (event === "delta") handlers.onDelta?.(parsed);
  else if (event === "done") handlers.onDone?.(parsed);
  else if (event === "error") handlers.onError?.(parsed);
}

async function readWebStream(body: ReadableStream<Uint8Array>, handlers: StreamHandlers): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  const parser = createSseParser((event, data) => dispatchEvent(event, data, handlers));
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) parser.push(decoder.decode(value, { stream: true }));
  }
  parser.end();
}

export type { QuotaSnapshot };

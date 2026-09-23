# 智泉 / Wisdom Spring

**Product & Development Specification**  
**Owner:** 中盈紫達集團 · Gather Wealth Gather Wisdom Group（GWGW Group）  
**Site:** https://gwgwgroup.com/  
**Document status:** v1.0 · ready for implementation  
**Audience:** Grok Build / implementing engineer  
**Last updated:** 2026-09-23

This file is the single source of truth for the first build. Implement against it. Do not invent a second product name, a second company brand, or extra LLM providers.

---

## 0. One-screen brief

Build a consumer-style AI chat app (Grok / Gemini feel) for GWGW Group.

- Brand: **智泉 / Wisdom Spring**
- Company: **中盈紫達集團 / Gather Wealth Gather Wisdom Group**
- Only upstream: **OpenRouter**
- Product twist: **every user turn picks a random model from a Hong Kong–safe pool**
- Clients: React Native (TypeScript) app + React (TypeScript) admin
- API: Node.js + TypeScript + MySQL + Prisma
- Architecture: monorepo, shared enums/DTOs/schemas, hexagonal-ish layers, explicit controllers / services / clients

Tagline (product): **共飲智慧之泉。每一次，一個模型。**  
Group line to stay aligned with: 「誠邀您同鑒財富之鑰，共飲智慧之泉。」

---

## 1. Brand lock (do not drift)

| Use | Value |
|---|---|
| Group EN | Gather Wealth Gather Wisdom Group / GWGW Group |
| Group ZH | 中盈紫達集團 |
| Product ZH | 智泉 |
| Product EN | Wisdom Spring |
| Short engineering name | `spring` |
| Monorepo folder | `gwgw-spring` |
| Bundle / package root | `com.gwgwgroup.spring` |
| npm scope | `@spring/...` |
| OpenRouter `HTTP-Referer` | `https://gwgwgroup.com/` |
| OpenRouter `X-Title` | `GWGW Wisdom Spring` |
| Admin title | 智泉 Admin · GWGW |
| App display name ZH | 智泉 |
| App display name EN | Wisdom Spring |

Forbidden:

- YSK Limited branding, `hk.ysk.*`, `ysk` package names
- Direct OpenAI / Anthropic / Google / xAI SDKs
- User-supplied API keys in v1
- Product names Prism / Alea / Lumen as the shipped brand

---

## 2. Goals and non-goals

### Goals

- Ship a polished chat surface that feels like a single assistant.
- Hide model selection from the composer. The system picks.
- Survive Hong Kong geo-policy on OpenRouter (upstream 403 / author banned).
- Meter cost and quota so the group can run this on one company OpenRouter key.
- Give ops an admin to curate the random pool, users, and spend.

### Non-goals (v1)

- User-picked model (keep behind a future admin flag only).
- Self-hosted LLMs.
- Voice, video, multi-user workspaces.
- External tool-calling agents visible to the user.
- Training on user content. Prefer `provider.data_collection = "deny"` when the route allows it.

---

## 3. Users

| Actor | Needs |
|---|---|
| End user (HK / bilingual) | Sign in, chat, stream replies, see which model answered, stay within quota |
| Admin (GWGW staff) | Curate HK-safe model pool, weights, plans, bans, usage |
| System jobs | Sync OpenRouter catalog, probe HK availability, roll up usage, generate titles |

Locale default: `zh-HK`. Support `en` as well.

---

## 4. Product features

### 4.1 MVP (build this first)

**Account**

- Email + password and/or email OTP
- Apple Sign-In + Google Sign-In on mobile
- Refresh-token rotation, logout all devices
- Delete account

**Chat**

- Conversation list: paginated, search, pin, archive, delete
- Multi-turn chat with SSE streaming
- Random model **per user turn** (not per conversation)
- After the first token / meta event, show the requested model; on `done`, show the **served** model if fallback fired
- Stop generation (abort)
- Regenerate: new assistant message, previous one marked `SUPERSEDED`
- Copy message
- Auto title after the first completed turn (cheap small model, not the random pool star)
- Empty state with 4–6 suggested prompts in 繁中

**Quota**

- Plans: `FREE` / `PLUS` / `INTERNAL`
- Daily message cap
- Monthly USD cap (integer micros)
- Clear error codes when blocked

**Settings**

- Language `zh-HK` | `en`
- Appearance light / dark / system
- Quota remaining

**Admin**

- Users: search, plan, suspend
- Model catalog + pool + weight + region status + probe button
- Usage: USD, tokens, 403 rate, fallback rate, by model / plan
- Feature flags
- Audit log for all admin writes
- System announcement banner

### 4.2 v1.1 (do not block MVP)

- Image input (only pick vision-capable models)
- In-conversation search
- Thumbs up / down (feeds pool weight later)
- Tone preset: 簡潔 / 詳細 / 廣東話
- Export conversation
- Push: generation done, quota low

### 4.3 Explicitly out of MVP

- Marketplace of models
- Custom user system prompts beyond the three tones
- RAG over group documents
- Billing checkout (plans can be assigned in admin)

---

## 5. Hong Kong + OpenRouter constraint (critical)

OpenRouter itself does not geoblock Hong Kong. It forwards upstream provider policy.

From HK IPs / HK-issued cards, these families commonly fail with `403 Unsupported Regions` or `Author Banned`:

- `openai/*`
- `anthropic/*`
- many `x-ai/*` / Grok routes
- some closed `google/gemini-*` routes

Do **not** put those slugs in the default random pool.

Families that usually work and should seed the pool (slugs change; always sync `/api/v1/models`):

- DeepSeek
- Qwen
- Z.ai / GLM
- Moonshot / Kimi
- MiniMax
- Tencent Hunyuan / Hy
- Open-weight: Llama, Mistral, NVIDIA Nemotron, Gemma, GPT-OSS, InclusionAI Ling, Poolside Laguna, Thinking Machines Inkling
- `:free` routes — allowed for `FREE` plan only; rate-limited; not the Plus default

Three tables, never a hardcoded slug list as the only source of truth:

1. `ModelCatalog` — full OpenRouter snapshot
2. `RegionPolicy` / pool fields — `HK_SAFE` | `HK_BLOCKED` | `UNKNOWN`
3. `ModelPoolEntry` — enabled, weight, min plan, health

`UNKNOWN` never enters the random draw. New slugs must pass a probe job before `HK_SAFE`.

Company OpenRouter account: use a corporate card / billing identity that will not trip CN/HK/SG payment risk if possible. The mobile user never sees the key.

---

## 6. Random model engine

This is the product.

On each `SendMessage`:

1. Auth + quota assert (daily messages, monthly USD).
2. Detect capability: text vs vision (vision is v1.1; MVP is text-only).
3. Load enabled pool rows where:
   - `enabled = true`
   - `regionStatus = HK_SAFE`
   - `healthStatus IN (HEALTHY, DEGRADED)`
   - capability matches
   - `minPlanTier <= user.planTier`
   - unit price `<=` plan max
   - optional: not the same slug as the last two turns in this conversation
4. Weighted random → `primary`
5. Draw two more slugs from **different authors** → fallbacks
6. Call OpenRouter:

```ts
{
  model: primary,
  models: [fallback1, fallback2], // OpenRouter model-layer failover
  stream: true,
  stream_options: { include_usage: true },
  messages: trimmedHistory,
  provider: {
    allow_fallbacks: true,
    ignore: ["openai", "anthropic"], // configurable
    data_collection: "deny"
  }
}
```

7. Persist `requestedModel` and response `model` as `servedModel`.
8. Write usage + cost.
9. If the whole call dies with region/author 403: mark that slug `HK_BLOCKED`, pick a new triple **once**, retry once. No loop.

Weight suggestion:

- admin quality score × 0.4
- 24h success rate × 0.3
- inverse relative cost × 0.2
- freshness (under-used) × 0.1

Plan routing:

- `FREE`: `:free` routes + cheapest paid cap
- `PLUS` / `INTERNAL`: full paid HK-safe pool

OpenRouter already failovers providers for the same model (`allow_fallbacks` default true). Use that. Do not re-implement provider roulette.

---

## 7. UX rules

- Composer has no model picker.
- Assistant bubble shows a small badge: `智泉 · Qwen3.8 Max`.
- If fallback happened: `改用 GLM 5.3`.
- Errors in 繁中, human:
  - region:「呢個模型暫時唔支援香港地區，已自動換過。」
  - quota:「今日對話次數已用完。」
  - 429:「系統繁忙，請稍後再試。」
- Streaming protocol to the client is **ours**, not raw OpenRouter SSE.

Client events only:

```text
event: meta     data: {"messageId","conversationId","requestedModel"}
event: delta    data: {"text":"..."}
event: done     data: {"servedModel","fallbackUsed","usage","costUsdMicros"}
event: error    data: {"code","message"}
```

---

## 8. Repository layout

pnpm workspace + Turborepo.

```text
gwgw-spring/
  apps/
    api/                  # Node.js API
    admin/                # React + Vite + TS
    mobile/               # Expo React Native + TS
  packages/
    shared/               # enums, zod DTOs, error codes, constants
    domain/               # entities, VOs, ports (no Prisma, no HTTP)
    api-client/           # generated or hand-typed client used by admin + mobile
    tsconfig/
    eslint-config/
  prisma/
    schema.prisma
    migrations/
  docs/
    WISDOM_SPRING_PRODUCT_AND_DEV.md   # this file lives at repo root or docs/
  infra/
    docker-compose.yml    # mysql + redis
  .env.example
  package.json
  pnpm-workspace.yaml
  turbo.json
```

Dependency rule:

```text
mobile  → api-client → shared
admin   → api-client → shared
api     → domain → shared
api     → prisma
domain  ↛ prisma | fastify | react | expo
shared  ↛ apps
```

Package manager: **pnpm**.  
Node: **20+**.  
TypeScript: **strict**.  
Module: ESM.

---

## 9. Shared kernel (`packages/shared`)

Create these files. Names are normative.

```text
packages/shared/src/
  index.ts
  enums/
    plan-tier.ts
    user-status.ts
    conversation-status.ts
    message-role.ts
    message-status.ts
    model-region-status.ts
    model-health-status.ts
    model-capability.ts
    error-code.ts
    locale.ts
    feature-flag.ts
  schema/
    pagination.schema.ts
    auth.schema.ts
    conversation.schema.ts
    message.schema.ts
    model.schema.ts
    admin.schema.ts
  dto/          # re-export z.infer types
  errors/
    app-error.ts
  constants/
    limits.ts
    openrouter.ts
    brand.ts
  lib/
    id.ts         # ulid
    money.ts      # USD micros
    pagination.ts
```

### 9.1 Enums (copy these values)

```ts
export enum PlanTier { FREE = "FREE", PLUS = "PLUS", INTERNAL = "INTERNAL" }
export enum UserStatus { ACTIVE = "ACTIVE", SUSPENDED = "SUSPENDED", DELETED = "DELETED" }
export enum ConversationStatus { ACTIVE = "ACTIVE", ARCHIVED = "ARCHIVED", DELETED = "DELETED" }
export enum MessageRole { SYSTEM = "SYSTEM", USER = "USER", ASSISTANT = "ASSISTANT" }
export enum MessageStatus {
  PENDING = "PENDING",
  STREAMING = "STREAMING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED",
  SUPERSEDED = "SUPERSEDED",
}
export enum ModelRegionStatus { HK_SAFE = "HK_SAFE", HK_BLOCKED = "HK_BLOCKED", UNKNOWN = "UNKNOWN" }
export enum ModelHealthStatus { HEALTHY = "HEALTHY", DEGRADED = "DEGRADED", DOWN = "DOWN" }
export enum ModelCapability { TEXT = "TEXT", VISION = "VISION" }
export enum Locale { ZH_HK = "zh-HK", EN = "en" }
export enum ErrorCode {
  AUTH_INVALID = "AUTH_INVALID",
  AUTH_EXPIRED = "AUTH_EXPIRED",
  USER_SUSPENDED = "USER_SUSPENDED",
  QUOTA_DAILY_MESSAGE = "QUOTA_DAILY_MESSAGE",
  QUOTA_MONTHLY_COST = "QUOTA_MONTHLY_COST",
  MODEL_POOL_EMPTY = "MODEL_POOL_EMPTY",
  UPSTREAM_REGION_BLOCKED = "UPSTREAM_REGION_BLOCKED",
  UPSTREAM_RATE_LIMITED = "UPSTREAM_RATE_LIMITED",
  UPSTREAM_UNAVAILABLE = "UPSTREAM_UNAVAILABLE",
  STREAM_ABORTED = "STREAM_ABORTED",
  VALIDATION = "VALIDATION",
  NOT_FOUND = "NOT_FOUND",
  CONFLICT = "CONFLICT",
  INTERNAL = "INTERNAL",
}
```

### 9.2 Brand constants

```ts
export const BRAND = {
  groupZh: "中盈紫達集團",
  groupEn: "Gather Wealth Gather Wisdom Group",
  productZh: "智泉",
  productEn: "Wisdom Spring",
  referer: "https://gwgwgroup.com/",
  openRouterTitle: "GWGW Wisdom Spring",
} as const;
```

### 9.3 Limits (start here, admin-overridable later)

```ts
export const LIMITS = {
  contentMaxChars: 32_000,
  attachmentsMax: 4,
  historyMaxMessages: 40,
  reserveOutputTokens: 4096,
  fallbacksMax: 2,
  sendRetryOnRegionBlock: 1,
  freeDailyMessages: 20,
  plusDailyMessages: 200,
  freeMonthlyUsdMicros: 500_000,      // $0.50
  plusMonthlyUsdMicros: 20_000_000,   // $20
} as const;
```

### 9.4 Zod: send message

```ts
export const SendMessageRequestSchema = z.object({
  conversationId: z.string().ulid().optional(),
  content: z.string().min(1).max(32_000),
  attachments: z.array(z.object({ assetId: z.string().ulid() })).max(4).default([]),
  clientMessageId: z.string().uuid(),
});
```

Money is always `bigint` / stringified integer **USD micros** on the wire. Never float dollars in clients.

---

## 10. Domain (`packages/domain`)

Ports only. API implements them.

```ts
export interface ModelPick {
  primary: string;
  fallbacks: string[];
  reason: string;
}

export interface ModelPicker {
  pick(input: {
    planTier: PlanTier;
    capability: ModelCapability;
    excludeSlugs: string[];
  }): Promise<ModelPick>;
}

export interface QuotaPolicy {
  assertCanSend(input: {
    userId: string;
    planTier: PlanTier;
    now: Date;
  }): Promise<void>;
}

export interface ContextWindow {
  trim(messages: ChatTurn[], contextLength: number, reserveOutput: number): ChatTurn[];
}
```

Entities conceptually: `User`, `Conversation`, `Message`, `ModelPoolEntry`, `UsageRecord`.

---

## 11. Prisma / MySQL

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

enum PlanTier { FREE PLUS INTERNAL }
enum UserStatus { ACTIVE SUSPENDED DELETED }
enum ConversationStatus { ACTIVE ARCHIVED DELETED }
enum MessageRole { SYSTEM USER ASSISTANT }
enum MessageStatus { PENDING STREAMING COMPLETED FAILED CANCELLED SUPERSEDED }
enum ModelRegionStatus { HK_SAFE HK_BLOCKED UNKNOWN }
enum ModelHealthStatus { HEALTHY DEGRADED DOWN }

model User {
  id           String     @id
  email        String?    @unique
  passwordHash String?
  status       UserStatus @default(ACTIVE)
  planTier     PlanTier   @default(FREE)
  locale       String     @default("zh-HK")
  displayName  String?
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt
  conversations Conversation[]
  usage        UsageLedger[]
  refreshTokens RefreshToken[]
}

model RefreshToken {
  id        String   @id
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  hashed    String
  expiresAt DateTime
  revokedAt DateTime?
  createdAt DateTime @default(now())
  @@index([userId])
}

model Conversation {
  id            String             @id
  userId        String
  user          User               @relation(fields: [userId], references: [id])
  title         String?
  status        ConversationStatus @default(ACTIVE)
  pinnedAt      DateTime?
  lastMessageAt DateTime           @default(now())
  createdAt     DateTime           @default(now())
  updatedAt     DateTime           @updatedAt
  messages      Message[]
  @@index([userId, lastMessageAt])
}

model Message {
  id               String        @id
  conversationId   String
  conversation     Conversation  @relation(fields: [conversationId], references: [id])
  clientMessageId  String?
  role             MessageRole
  status           MessageStatus
  content          String        @db.LongText
  requestedModel   String?
  servedModel      String?
  fallbackUsed     Boolean       @default(false)
  promptTokens     Int           @default(0)
  completionTokens Int           @default(0)
  costUsdMicros    BigInt        @default(0)
  latencyMs        Int?
  errorCode        String?
  parentMessageId  String?
  createdAt        DateTime      @default(now())
  updatedAt        DateTime      @updatedAt
  @@unique([conversationId, clientMessageId])
  @@index([conversationId, createdAt])
}

model ModelCatalog {
  slug            String   @id
  name            String
  author          String
  contextLength   Int
  inputModalities Json
  pricing         Json
  isFreeRoute     Boolean  @default(false)
  raw             Json
  syncedAt        DateTime
}

model ModelPoolEntry {
  slug          String             @id
  enabled       Boolean            @default(false)
  regionStatus  ModelRegionStatus  @default(UNKNOWN)
  healthStatus  ModelHealthStatus  @default(DOWN)
  weight        Int                @default(100)
  qualityScore  Int                @default(50)
  minPlanTier   PlanTier           @default(FREE)
  lastProbeAt   DateTime?
  lastErrorCode String?
  success24h    Int                @default(0)
  fail24h       Int                @default(0)
}

model UsageLedger {
  id               String   @id
  userId           String
  user             User     @relation(fields: [userId], references: [id])
  messageId        String
  model            String
  promptTokens     Int
  completionTokens Int
  costUsdMicros    BigInt
  occurredAt       DateTime @default(now())
  @@index([userId, occurredAt])
  @@index([occurredAt])
}

model FeatureFlag {
  key       String  @id
  enabled   Boolean
  payload   Json?
  updatedAt DateTime @updatedAt
}

model AdminAuditLog {
  id        String   @id
  actorId   String
  action    String
  payload   Json
  createdAt DateTime @default(now())
  @@index([createdAt])
}

model Announcement {
  id        String   @id
  bodyZh    String
  bodyEn    String
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
}
```

IDs: ULID strings, generated in application code (`packages/shared/src/lib/id.ts`), not autoincrement.

---

## 12. API app (`apps/api`)

Prefer **Fastify + TypeScript** unless the implementer is materially faster in NestJS. Either is acceptable. Layers are not:

```text
controllers/     HTTP only. Parse, auth, call one application service, map errors.
application/     One use-case class per action.
domain ports     from packages/domain
infra/           Prisma repos, OpenRouter client, Redis, queues
```

### 12.1 Modules

| Module | Controllers | Application services |
|---|---|---|
| health | HealthController | — |
| auth | AuthController | Register, Login, Refresh, Logout |
| user | UserController | GetMe, UpdateMe, DeleteAccount |
| chat | ConversationController, MessageController | CreateConversation, ListConversations, SendMessage, AbortGeneration, RegenerateMessage, ListMessages |
| catalog | (jobs + admin) | SyncOpenRouterCatalog, ProbeHkAvailability, WeightedModelPicker |
| billing | internal | AssertQuota, RecordUsage |
| admin | AdminUserController, AdminModelController, AdminUsageController, AdminFlagController | corresponding use cases |
| asset | AssetController | PresignUpload (v1.1) |

### 12.2 Required classes / files

```text
apps/api/src/
  main.ts
  app.ts
  modules/chat/controllers/message.controller.ts
  modules/chat/application/send-message.service.ts
  modules/chat/application/abort-generation.service.ts
  modules/chat/application/regenerate-message.service.ts
  modules/chat/application/generate-title.service.ts
  modules/catalog/application/weighted-model-picker.ts
  modules/catalog/application/sync-openrouter-catalog.job.ts
  modules/catalog/application/probe-hk-availability.job.ts
  modules/catalog/infra/openrouter.client.ts
  modules/catalog/infra/openrouter-stream.parser.ts
  modules/billing/application/quota.service.ts
  infra/prisma.ts
  infra/redis.ts
  infra/queue.ts
  http/auth-guard.ts
  http/error-mapper.ts
```

### 12.3 `OpenRouterClient` contract

```ts
interface OpenRouterClient {
  listModels(): Promise<OpenRouterModel[]>;
  streamChat(input: {
    model: string;
    models?: string[];
    messages: { role: "system" | "user" | "assistant"; content: string }[];
    signal: AbortSignal;
    userRef: string; // opaque user id for abuse tracking
  }): AsyncIterable<SpringStreamEvent>;
}
```

Headers on every call:

- `Authorization: Bearer $OPENROUTER_API_KEY`
- `HTTP-Referer: https://gwgwgroup.com/`
- `X-Title: GWGW Wisdom Spring`
- `Content-Type: application/json`

Map upstream HTTP:

| Upstream | ErrorCode |
|---|---|
| 401 / 403 author or region | `UPSTREAM_REGION_BLOCKED` (then pool update) |
| 402 | `QUOTA_MONTHLY_COST` at platform level / alert admin |
| 429 | `UPSTREAM_RATE_LIMITED` |
| 5xx | `UPSTREAM_UNAVAILABLE` |

### 12.4 SendMessage sequence

```text
POST /v1/messages
  AuthGuard
  validate SendMessageRequestSchema
  idempotency: if clientMessageId exists for this conversation, return existing stream/result
  QuotaPolicy.assertCanSend
  create conversation if needed
  insert user message COMPLETED
  insert assistant message STREAMING
  ModelPicker.pick
  ContextWindow.trim
  OpenRouterClient.stream
    write SSE meta / delta
  on done: servedModel, tokens, cost, COMPLETED
  enqueue title job if first turn
  enqueue usage ledger
  on abort: CANCELLED
  on fail: FAILED + errorCode
```

Day boundary for daily quota: `Asia/Hong_Kong`.

### 12.5 HTTP surface

```text
GET    /health

POST   /v1/auth/register
POST   /v1/auth/login
POST   /v1/auth/refresh
POST   /v1/auth/logout

GET    /v1/me
PATCH  /v1/me
DELETE /v1/me

GET    /v1/conversations
POST   /v1/conversations
PATCH  /v1/conversations/:id
DELETE /v1/conversations/:id

GET    /v1/conversations/:id/messages
POST   /v1/messages                 # SSE
POST   /v1/messages/:id/abort
POST   /v1/messages/:id/regenerate  # SSE

GET    /v1/announcements

# admin, separate authz (role ADMIN)
GET    /admin/users
PATCH  /admin/users/:id
GET    /admin/models
PATCH  /admin/models/:slug
POST   /admin/models/:slug/probe
GET    /admin/usage
GET    /admin/audit
GET    /admin/flags
PATCH  /admin/flags/:key
```

JSON error envelope:

```ts
{ "error": { "code": "QUOTA_DAILY_MESSAGE", "message": "今日對話次數已用完。" } }
```

---

## 13. Mobile (`apps/mobile`)

Expo + TypeScript.

```text
apps/mobile/src/
  app/navigation.tsx
  features/auth/
  features/inbox/
  features/chat/
    ChatScreen.tsx
    MessageList.tsx
    UserBubble.tsx
    AssistantBubble.tsx
    ModelBadge.tsx
    StreamingCursor.tsx
    Composer.tsx
    QuotaBanner.tsx
    EmptyHero.tsx
  features/settings/
  shared/components/
  shared/lib/api.ts
  shared/theme/
```

State:

- TanStack Query for lists and history
- Zustand for the in-flight stream buffer + AbortController

Visual tone: calm, wealth-and-wisdom, not neon startup. Prefer deep ink, warm paper, one gold/violet accent consistent with 「紫達」 if a palette is needed:

- Ink `#1B1424`
- Paper `#F6F1E8`
- Violet `#5B3A7A`
- Gold `#C4A35A`

Empty suggested prompts (zh-HK):

1. 用三點解釋集團「聚財富、聚智慧」可以點理解。
2. 幫我寫一封禮貌嘅商務跟進電郵。
3. 將呢段文言改成淺白繁中。
4. 今日有咩國際新聞值得投資人留意？（一般知識，唔好假裝即時行情）
5. 幫我列一個健康作息清單。

Do not claim live market data in v1.

---

## 14. Admin (`apps/admin`)

React + Vite + TypeScript + TanStack Query + React Router.

Pages:

- `/login`
- `/users`
- `/models` ← most important
- `/usage`
- `/flags`
- `/audit`
- `/announcements`

Models table columns: slug, author, enabled, regionStatus, health, weight, qualityScore, minPlan, unit price, 24h success/fail, last probe, actions (enable, probe, mark blocked).

Include a **simulate draw** button that runs `WeightedModelPicker` 100 times and shows histogram. Ops need this.

---

## 15. Jobs

BullMQ + Redis.

| Job | Cadence | Does |
|---|---|---|
| `catalog.sync` | every 6 hours | GET `https://openrouter.ai/api/v1/models`, upsert `ModelCatalog`, create pool rows as `UNKNOWN` |
| `catalog.probe` | hourly | short prompt `Reply with OK` on UNKNOWN + DEGRADED + recently failed; 3 consecutive region 403 → `HK_BLOCKED` |
| `chat.title` | on first completed turn | cheap enabled model, 20 chars max title |
| `usage.rollup` | hourly | optional aggregate table later |

Seed script: after first sync, enable a conservative HK-safe allowlist of authors (`deepseek`, `qwen`, `z-ai`, `moonshotai`, `minimax`, `tencent`, `meta-llama`, `mistralai`, `nvidia`, `google` only for `gemma-*`, `openai` only for `gpt-oss-*`). Never auto-enable `openai/gpt-*` closed models or `anthropic/*`.

---

## 16. System prompt (v1)

Server-injected, not user-editable in MVP.

```text
你是「智泉」，中盈紫達集團（Gather Wealth Gather Wisdom Group）嘅智能助手。
用對應使用者語言作答；預設繁體中文（香港）。
語氣穩重、清楚、有分寸，唔好誇張營銷。
唔好自稱 Claude、GPT、Gemini 或 Grok。你代表智泉。
如果被問你係邊個模型，可以話你係智泉，並可提及今輪實際模型名稱（由系統提供）。
唔提供投資保證、醫療診斷、或任何違法指引。
唔確定就直認唔確定。
```

Pass the served model name into the title job and optionally into a hidden trailer; do not prefix every visible answer with the model name — the badge does that.

---

## 17. Security

- One company OpenRouter key in server env / secret manager. Never in the app.
- Argon2id or scrypt for passwords.
- JWT access ~15 min; refresh rotated.
- Admin routes require `role=ADMIN` (add `User.role` if missing during implement — `USER | ADMIN`).
- Rate limit login and send per IP + user.
- Idempotent `clientMessageId`.
- Logs: message id, model, tokens, error. **Do not log full prompts.**
- CORS allow admin origin + mobile does not use CORS the same way.
- TLS only in deployed env.

Add to Prisma `User.role` enum `USER | ADMIN` during implementation. First admin seeded via env `ADMIN_EMAIL`.

---

## 18. Env

```text
NODE_ENV=development
DATABASE_URL=mysql://spring:spring@localhost:3306/spring
REDIS_URL=redis://localhost:6379
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
OPENROUTER_API_KEY=
ADMIN_EMAIL=
APP_ORIGIN_ADMIN=http://localhost:5173
PUBLIC_APP_URL=https://gwgwgroup.com
```

`.env.example` must exist. Real secrets never committed.

---

## 19. Quality bar

- `tsc --noEmit` clean in every package
- ESLint + Prettier
- API: integration test for picker + quota + idempotent send (OpenRouter mocked)
- Shared schemas unit-tested
- No `any`
- No cross-app imports
- README at repo root: how to boot docker mysql/redis, migrate, run api, admin, mobile

---

## 20. Implementation order for Grok Build

Do these milestones in order. Do not skip 2.

### M1 — Skeleton

- pnpm workspace, turbo, tsconfigs, eslint
- `packages/shared` enums + zod + brand
- `packages/domain` ports
- Prisma schema + migrate
- docker-compose mysql + redis
- API health + empty Fastify app
- README

### M2 — Catalog truth

- `OpenRouterClient.listModels`
- sync job
- pool table + seed author allowlist
- `WeightedModelPicker` + unit tests with fixtures
- probe job (can run manual)

### M3 — Auth + chat vertical slice

- register / login / refresh
- SendMessage SSE with mocked OpenRouter
- then live OpenRouter behind env key
- Prisma messages + usage ledger
- abort

### M4 — Mobile chat

- auth screens
- inbox + chat + stream renderer + model badge
- empty hero, quota error mapping

### M5 — Quota, regenerate, title

- Redis daily counters (HK timezone)
- monthly cost from ledger
- regenerate
- title job

### M6 — Admin

- models page + probe + simulate draw
- users + plan + suspend
- usage dashboard
- audit + flags + announcement

### M7 — Harden

- seed first ADMIN
- rate limits
- production logging
- app icons later

Definition of done for first internal demo:

- HK account can register, send 5 messages, see 5 (possibly different) served models
- A blocked slug is not drawn after a 403 probe
- Admin can turn a model off and the next draw respects it
- Usage micros increment
- No YSK strings in repo

---

## 21. Test fixtures Grok Build should add

`packages/shared` / api tests:

- picker never returns `openai/gpt-4o` when pool is seeded with mixed catalog
- picker returns only `HK_SAFE` + `enabled`
- fallbacks are different authors when possible
- quota blocks on 21st FREE message same HK day
- duplicate `clientMessageId` does not create a second OpenRouter call
- stream parser maps usage on final chunk

---

## 22. Copy deck (zh-HK)

| Place | Copy |
|---|---|
| App name | 智泉 |
| Splash subtitle | 共飲智慧之泉 |
| New chat | 新對話 |
| Composer placeholder | 問智泉 |
| Stop | 停止 |
| Regenerate | 再生成 |
| Daily quota | 今日對話次數已用完。 |
| Region fallback | 呢個模型暫時唔支援香港地區，已自動換過。 |
| Generic fail | 智泉暫時回應唔到，請稍後再試。 |

---

## 23. Decisions already locked

1. Company is GWGW Group, not YSK.
2. Product name is 智泉 / Wisdom Spring.
3. Randomness is **per turn**, not per conversation.
4. Served model name is visible.
5. Only OpenRouter.
6. HK-safe allowlist + probe + OpenRouter `models[]` fallback.
7. Shared enums/DTOs live in `packages/shared`.
8. Money is USD micros.
9. IDs are ULID.

Open only if blocked: Fastify vs Nest — pick Fastify.

---

## 24. What Grok Build should output first

1. The monorepo tree above, compiling.
2. This document copied to `docs/WISDOM_SPRING_PRODUCT_AND_DEV.md`.
3. Working `docker compose up` + `pnpm prisma migrate dev`.
4. `WeightedModelPicker` tests green.
5. `POST /v1/messages` SSE against mock, then real key.

Do not start with UI mockups or extra providers. Start with shared kernel + picker + schema.

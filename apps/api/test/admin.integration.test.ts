import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  ErrorCode,
  FeatureFlagKey,
  UserRole,
  createId,
  hkMonthRangeFromKey,
  publicFlagItems,
} from "@spring/shared";
import { buildApp } from "../src/app";
import { createContext } from "../src/context";
import { seedCatalog } from "../src/modules/catalog/catalog-store";
import type { OpenRouterClient, StreamChatInput } from "../src/modules/catalog/infra/openrouter.client";

function fakeClient(): OpenRouterClient & { last?: StreamChatInput } {
  const state: { last?: StreamChatInput } = {};
  return {
    get last() {
      return state.last;
    },
    async listModels() {
      return [
        {
          id: "qwen/qwen3.7-flash",
          name: "Qwen 3.7 Flash",
          context_length: 32_000,
          architecture: { input_modalities: ["text"], output_modalities: ["text"] },
          pricing: { prompt: "0.00000005", completion: "0.0000001" },
        },
      ];
    },
    async listImageModels() {
      return [];
    },
    async completeChat() {
      return { text: "ok", model: "qwen/qwen3.7-flash", images: [] };
    },
    async generateImage() {
      throw new Error("unused");
    },
    streamChat(input) {
      state.last = input;
      return (async function* () {
        yield { type: "delta" as const, text: "你好。" };
        yield {
          type: "done" as const,
          model: "deepseek/deepseek-chat",
          usage: { promptTokens: 4, completionTokens: 2, costUsd: 0.0001 },
        };
      })();
    },
  };
}

async function reset(prisma: PrismaClient): Promise<void> {
  await prisma.phoneCode.deleteMany();
  await prisma.usageLedger.deleteMany();
  await prisma.adminAuditLog.deleteMany();
  await prisma.clientMessage.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.oAuthAccount.deleteMany();
  await prisma.user.deleteMany();
  await prisma.catalogEntry.deleteMany();
  await prisma.featureFlag.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.modelPoolEntry.deleteMany();
  await prisma.modelCatalog.deleteMany();
}

describe("admin panel", () => {
  const openrouter = fakeClient();
  let app: Awaited<ReturnType<typeof buildApp>>;
  let adminToken = "";
  let adminId = "";

  beforeAll(async () => {
    const ctx = await createContext({
      openrouter,
      titles: { async enqueue() {} },
    });
    await reset(ctx.prisma);
    await ctx.prisma.modelCatalog.create({
      data: {
        slug: "deepseek/deepseek-chat",
        name: "DeepSeek",
        author: "deepseek",
        contextLength: 64_000,
        inputModalities: ["text"],
        outputModalities: ["text"],
        pricing: { prompt: "0.00000014", completion: "0.00000028" },
        isFreeRoute: false,
        raw: {},
        syncedAt: new Date(),
      },
    });
    await ctx.prisma.modelPoolEntry.create({
      data: {
        slug: "deepseek/deepseek-chat",
        enabled: true,
        regionStatus: "HK_SAFE",
        healthStatus: "HEALTHY",
        weight: 100,
        qualityScore: 80,
        minPlanTier: "FREE",
      },
    });
    await ctx.prisma.modelPoolEntry.create({
      data: {
        slug: "openai/gpt-4o",
        enabled: false,
        regionStatus: "UNKNOWN",
        healthStatus: "DOWN",
        weight: 1,
        qualityScore: 1,
        minPlanTier: "PLUS",
      },
    });
    app = await buildApp({ ctx });
    const registered = await app.inject({
      method: "POST",
      url: "/v1/auth/register",
      payload: { email: `ops-${Date.now()}@gwgwgroup.com`, password: "spring-pass-1" },
    });
    expect(registered.statusCode).toBe(201);
    adminId = registered.json().user.id as string;
    await app.ctx.prisma.user.update({ where: { id: adminId }, data: { role: "ADMIN" } });
    adminToken = registered.json().accessToken as string;
  });

  afterAll(async () => {
    if (!app) return;
    await app.close();
    await app.ctx.disconnect();
  });

  function auth() {
    return { authorization: `Bearer ${adminToken}` };
  }

  it("refuses to enable a closed model and writes audit", async () => {
    const denied = await app.inject({
      method: "PATCH",
      url: "/admin/models/openai/gpt-4o",
      headers: auth(),
      payload: { enabled: true },
    });
    expect(denied.statusCode).toBe(403);
    expect(denied.json().error.code).toBe(ErrorCode.FORBIDDEN);
    const row = await app.ctx.prisma.modelPoolEntry.findUnique({ where: { slug: "openai/gpt-4o" } });
    expect(row?.enabled).toBe(false);
    const logs = await app.inject({
      method: "GET",
      url: "/admin/audit?action=model.enable.denied",
      headers: auth(),
    });
    expect(logs.json().items.some((item: { action: string }) => item.action === "model.enable.denied")).toBe(true);
  });

  it("lets admin edit pool weight", async () => {
    const updated = await app.inject({
      method: "PATCH",
      url: "/admin/models/deepseek/deepseek-chat",
      headers: auth(),
      payload: { weight: 250, qualityScore: 91, minPlanTier: "PLUS" },
    });
    expect(updated.statusCode).toBe(200);
    const models = await app.inject({ method: "GET", url: "/admin/models", headers: auth() });
    const deepseek = (models.json().items as Array<{ slug: string; weight: number; qualityScore: number; minPlanTier: string; supportsVision: boolean }>).find(
      (item) => item.slug === "deepseek/deepseek-chat",
    );
    expect(deepseek).toMatchObject({ weight: 250, qualityScore: 91, minPlanTier: "PLUS", supportsVision: false });
  });

  it("runs catalog jobs and writes audit", async () => {
    const sync = await app.inject({ method: "POST", url: "/admin/jobs/catalog-sync", headers: auth() });
    expect(sync.statusCode).toBe(200);
    expect(sync.json().upserted).toBeGreaterThan(0);
    const probe = await app.inject({ method: "POST", url: "/admin/jobs/catalog-probe", headers: auth() });
    expect(probe.statusCode).toBe(200);
    expect(typeof probe.json().probed).toBe("number");
    const logs = await app.inject({ method: "GET", url: "/admin/audit", headers: auth() });
    const actions = (logs.json().items as Array<{ action: string }>).map((item) => item.action);
    expect(actions).toContain("catalog.sync");
    expect(actions).toContain("catalog.probe");
  });

  it("lists merged flags and turns off web search for generation", async () => {
    const flags = await app.inject({ method: "GET", url: "/admin/flags", headers: auth() });
    expect(flags.statusCode).toBe(200);
    expect((flags.json().items as Array<{ key: string }>).map((item) => item.key)).toEqual(Object.values(FeatureFlagKey));
    const patched = await app.inject({
      method: "PATCH",
      url: `/admin/flags/${FeatureFlagKey.WEB_SEARCH}`,
      headers: auth(),
      payload: { enabled: false },
    });
    expect(patched.statusCode).toBe(200);
    const publicFlags = await app.inject({ method: "GET", url: "/v1/flags" });
    expect(publicFlags.json().items).toEqual(publicFlagItems([{ key: FeatureFlagKey.WEB_SEARCH, enabled: false }]));
    const member = await app.inject({
      method: "POST",
      url: "/v1/auth/register",
      payload: { email: `flag-${Date.now()}@gwgwgroup.com`, password: "spring-pass-1" },
    });
    const sent = await app.inject({
      method: "POST",
      url: "/v1/messages",
      headers: { authorization: `Bearer ${member.json().accessToken}` },
      payload: { content: "今日香港天氣", clientMessageId: randomUUID(), templateId: "search" },
    });
    expect(sent.statusCode).toBe(200);
    expect(openrouter.last?.plugins).toBeUndefined();
    await app.inject({
      method: "PATCH",
      url: `/admin/flags/${FeatureFlagKey.WEB_SEARCH}`,
      headers: auth(),
      payload: { enabled: true },
    });
  });

  it("rejects an unknown flag key", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: "/admin/flags/not_a_flag",
      headers: auth(),
      payload: { enabled: true },
    });
    expect(response.statusCode).toBe(400);
  });

  it("protects the last admin and resets guest uses", async () => {
    const demote = await app.inject({
      method: "PATCH",
      url: `/admin/users/${adminId}`,
      headers: auth(),
      payload: { role: UserRole.USER },
    });
    expect(demote.statusCode).toBe(403);
    const second = await app.inject({
      method: "POST",
      url: "/v1/auth/register",
      payload: { email: `ops2-${Date.now()}@gwgwgroup.com`, password: "spring-pass-1" },
    });
    const secondId = second.json().user.id as string;
    await app.ctx.prisma.user.update({ where: { id: secondId }, data: { role: "ADMIN", guestUses: 4 } });
    const ok = await app.inject({
      method: "PATCH",
      url: `/admin/users/${secondId}`,
      headers: auth(),
      payload: { role: UserRole.USER, resetGuestUses: true },
    });
    expect(ok.statusCode).toBe(200);
    expect(ok.json().role).toBe(UserRole.USER);
    expect(ok.json().guestUses).toBe(0);
  });

  it("includes this month's usage on the user list", async () => {
    await app.ctx.prisma.usageLedger.create({
      data: {
        id: createId(),
        userId: adminId,
        messageId: createId(),
        model: "deepseek/deepseek-chat",
        promptTokens: 2,
        completionTokens: 2,
        costUsdMicros: 500n,
        occurredAt: new Date(),
      },
    });
    const listed = await app.inject({ method: "GET", url: "/admin/users", headers: auth() });
    const row = (listed.json().items as Array<{ id: string; monthRequests: number; monthCostUsdMicros: string }>).find(
      (item) => item.id === adminId,
    );
    expect(row?.monthRequests).toBeGreaterThan(0);
    expect(Number(row?.monthCostUsdMicros)).toBeGreaterThan(0);
  });

  it("filters usage by Hong Kong month", async () => {
    const august = hkMonthRangeFromKey("2026-08");
    await app.ctx.prisma.usageLedger.create({
      data: {
        id: createId(),
        userId: adminId,
        messageId: createId(),
        model: "deepseek/deepseek-chat",
        promptTokens: 9,
        completionTokens: 9,
        costUsdMicros: 900n,
        occurredAt: new Date(august.start.getTime() + 86_400_000),
      },
    });
    const report = await app.inject({ method: "GET", url: "/admin/usage?month=2026-08", headers: auth() });
    expect(report.statusCode).toBe(200);
    expect(report.json().from).toBe(august.start.toISOString());
    expect(report.json().to).toBe(august.end.toISOString());
    expect(report.json().totals.requests).toBe(1);
    expect(report.json().totals.costUsdMicros).toBe("900");
  });

  it("edits and deletes announcements", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/admin/announcements",
      headers: auth(),
      payload: { bodyZh: "維修", bodyEn: "Maintenance", active: true },
    });
    expect(created.statusCode).toBe(201);
    const id = created.json().id as string;
    const edited = await app.inject({
      method: "PATCH",
      url: `/admin/announcements/${id}`,
      headers: auth(),
      payload: { bodyZh: "改文", bodyEn: "Edited", active: true },
    });
    expect(edited.json().bodyZh).toBe("改文");
    const removed = await app.inject({ method: "DELETE", url: `/admin/announcements/${id}`, headers: auth() });
    expect(removed.statusCode).toBe(200);
    const listed = await app.inject({ method: "GET", url: "/admin/announcements", headers: auth() });
    expect((listed.json().items as Array<{ id: string }>).some((item) => item.id === id)).toBe(false);
  });

  it("seeds catalog rows twice without unique errors", async () => {
    await seedCatalog(app.ctx.prisma);
    await seedCatalog(app.ctx.prisma);
    const listed = await app.inject({ method: "GET", url: "/admin/catalog?kind=tool", headers: auth() });
    expect((listed.json().items as Array<{ id: string }>).some((item) => item.id === "rewrite")).toBe(true);
  });

  it("hides an unlisted tool from the public catalog", async () => {
    const before = await app.inject({ method: "GET", url: "/v1/catalog/tools" });
    expect((before.json().items as Array<{ id: string }>).some((item) => item.id === "rewrite")).toBe(true);
    const patched = await app.inject({
      method: "PATCH",
      url: "/admin/catalog/tool/rewrite",
      headers: auth(),
      payload: { live: false },
    });
    expect(patched.statusCode).toBe(200);
    expect(patched.json().live).toBe(false);
    const publicTools = await app.inject({ method: "GET", url: "/v1/catalog/tools" });
    expect((publicTools.json().items as Array<{ id: string }>).some((item) => item.id === "rewrite")).toBe(false);
    const adminTools = await app.inject({ method: "GET", url: "/admin/catalog?kind=tool", headers: auth() });
    expect((adminTools.json().items as Array<{ id: string; live: boolean }>).some((item) => item.id === "rewrite" && item.live === false)).toBe(true);
    expect(JSON.stringify(publicTools.json())).not.toContain("instruction");
    await app.inject({
      method: "PATCH",
      url: "/admin/catalog/tool/rewrite",
      headers: auth(),
      payload: { live: true },
    });
  });

  async function ensureTextPool(): Promise<void> {
    await app.ctx.prisma.modelPoolEntry.updateMany({
      where: { slug: "deepseek/deepseek-chat" },
      data: { enabled: true, regionStatus: "HK_SAFE", healthStatus: "HEALTHY", minPlanTier: "FREE" },
    });
  }

  it("applies an aide instruction change to the next conversation", async () => {
    await ensureTextPool();
    const patched = await app.inject({
      method: "PATCH",
      url: "/admin/catalog/aide/biz",
      headers: auth(),
      payload: { instruction: "你而家係測試商務助手，每句以「好的」開頭。" },
    });
    expect(patched.statusCode).toBe(200);
    const member = await app.inject({
      method: "POST",
      url: "/v1/auth/register",
      payload: { email: `aide-${Date.now()}@gwgwgroup.com`, password: "spring-pass-1" },
    });
    const sent = await app.inject({
      method: "POST",
      url: "/v1/messages",
      headers: { authorization: `Bearer ${member.json().accessToken}` },
      payload: { content: "寫一封覆信", clientMessageId: randomUUID(), templateId: "biz" },
    });
    expect(sent.statusCode).toBe(200);
    expect(sent.body).toContain("event: done");
    expect(
      openrouter.last?.messages.some(
        (row) => typeof row.content === "string" && row.content.includes("每句以「好的」開頭"),
      ),
    ).toBe(true);
    const logs = await app.inject({ method: "GET", url: "/admin/audit?action=catalog.update", headers: auth() });
    expect((logs.json().items as Array<{ action: string }>).some((item) => item.action === "catalog.update")).toBe(true);
  });

  it("skips the web plugin when search is unlisted", async () => {
    await ensureTextPool();
    await app.inject({
      method: "PATCH",
      url: `/admin/flags/${FeatureFlagKey.WEB_SEARCH}`,
      headers: auth(),
      payload: { enabled: true },
    });
    await app.inject({
      method: "PATCH",
      url: "/admin/catalog/tool/search",
      headers: auth(),
      payload: { live: false },
    });
    const member = await app.inject({
      method: "POST",
      url: "/v1/auth/register",
      payload: { email: `search-off-${Date.now()}@gwgwgroup.com`, password: "spring-pass-1" },
    });
    const token = member.json().accessToken as string;
    const search = await app.inject({
      method: "POST",
      url: "/v1/messages",
      headers: { authorization: `Bearer ${token}` },
      payload: { content: "今日香港天氣", clientMessageId: randomUUID(), templateId: "search" },
    });
    expect(search.statusCode).toBe(200);
    expect(search.body).toContain("event: done");
    expect(openrouter.last?.plugins).toBeUndefined();
    const webchat = await app.inject({
      method: "POST",
      url: "/v1/messages",
      headers: { authorization: `Bearer ${token}` },
      payload: { content: "https://example.com", clientMessageId: randomUUID(), templateId: "webchat" },
    });
    expect(webchat.statusCode).toBe(200);
    expect(webchat.body).toContain("event: done");
    expect(openrouter.last?.plugins).toEqual([{ id: "web", max_results: 5 }]);
    await app.inject({
      method: "PATCH",
      url: "/admin/catalog/tool/search",
      headers: auth(),
      payload: { live: true },
    });
  });
});

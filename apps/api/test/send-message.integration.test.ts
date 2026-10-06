import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ErrorCode, FeatureFlagKey } from "@spring/shared";
import { buildApp } from "../src/app";
import { createContext } from "../src/context";
import { invalidateAppLimits } from "../src/modules/admin/app-limits";
import { invalidatePromptDocs } from "../src/modules/admin/prompt-docs";
import { ProbeHkAvailabilityJob } from "../src/modules/catalog/application/probe-hk-availability.job";
import type { OpenRouterClient, StreamChatInput } from "../src/modules/catalog/infra/openrouter.client";
import { UpstreamError } from "../src/modules/catalog/infra/openrouter-stream.parser";

function fakeClient(): OpenRouterClient & { calls: number; last?: StreamChatInput } {
  const state: { calls: number; last?: StreamChatInput } = { calls: 0 };
  return {
    get calls() {
      return state.calls;
    },
    get last() {
      return state.last;
    },
    async listModels() {
      return [];
    },
    async listImageModels() {
      return [];
    },
    async completeChat() {
      return { text: "測試標題", model: "deepseek/deepseek-chat", images: [] };
    },
    async generateImage() {
      throw new Error("unused");
    },
    streamChat(input) {
      state.calls += 1;
      state.last = input;
      return (async function* () {
        yield { type: "delta" as const, text: "你好，智泉。" };
        yield {
          type: "done" as const,
          model: "deepseek/deepseek-chat",
          usage: { promptTokens: 8, completionTokens: 4, costUsd: 0.00021 },
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
  await prisma.appSetting.deleteMany();
  await prisma.promptDoc.deleteMany();
  await prisma.modelPoolEntry.deleteMany();
  await prisma.modelCatalog.deleteMany();
  invalidateAppLimits();
  invalidatePromptDocs();
}

describe("POST /v1/messages", () => {
  const client = fakeClient();
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeAll(async () => {
    const ctx = await createContext({
      openrouter: client,
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
    app = await buildApp({ ctx });
  });

  afterAll(async () => {
    await app.close();
    await app.ctx.disconnect();
  });

  it("replays a duplicate clientMessageId without a second upstream call", async () => {
    const email = `member-${Date.now()}@gwgwgroup.com`;
    const registered = await app.inject({
      method: "POST",
      url: "/v1/auth/register",
      payload: { email, password: "spring-pass-1" },
    });
    expect(registered.statusCode).toBe(201);
    expect(registered.json().user.registered).toBe(true);
    const token = registered.json().accessToken as string;
    const body = { content: "講下智慧之泉", clientMessageId: randomUUID() };
    const first = await app.inject({
      method: "POST",
      url: "/v1/messages",
      headers: { authorization: `Bearer ${token}` },
      payload: body,
    });
    expect(first.statusCode).toBe(200);
    expect(first.body).toContain("event: meta");
    expect(first.body).toContain("\"generationKind\":\"text-to-text\"");
    expect(first.body).toContain("event: delta");
    expect(first.body).toContain("你好，智泉。");
    expect(first.body).toContain("event: done");
    expect(first.body).toContain("deepseek/deepseek-chat");

    const second = await app.inject({
      method: "POST",
      url: "/v1/messages",
      headers: { authorization: `Bearer ${token}` },
      payload: body,
    });
    expect(second.statusCode).toBe(200);
    expect(second.body).toContain("你好，智泉。");
    expect(client.calls).toBe(1);

    const users = await app.ctx.prisma.message.count({ where: { role: "USER" } });
    const ledger = await app.ctx.prisma.usageLedger.count();
    expect(users).toBe(1);
    expect(ledger).toBe(1);
    const usage = await app.ctx.prisma.usageLedger.findFirst();
    expect(usage?.costUsdMicros).toBe(210n);
    expect(client.last?.plugins).toBeUndefined();

    const messageId = JSON.parse(first.body.match(/data: (\{"messageId".*\})/)?.[1] ?? "{}").messageId as string;
    const regenerated = await app.inject({
      method: "POST",
      url: `/v1/messages/${messageId}/regenerate`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(regenerated.statusCode).toBe(200);
    expect(regenerated.body).toContain("event: done");
    expect(client.calls).toBe(2);
    const original = await app.ctx.prisma.message.findUnique({ where: { id: messageId } });
    expect(original?.status).toBe("SUPERSEDED");
    expect(await app.ctx.prisma.usageLedger.count()).toBe(2);
  });

  it("sends the OpenRouter web plugin for search turns", async () => {
    const registered = await app.inject({
      method: "POST",
      url: "/v1/auth/register",
      payload: { email: `search-${Date.now()}@gwgwgroup.com`, password: "spring-pass-1" },
    });
    const token = registered.json().accessToken as string;
    const response = await app.inject({
      method: "POST",
      url: "/v1/messages",
      headers: { authorization: `Bearer ${token}` },
      payload: { content: "今日香港天氣", clientMessageId: randomUUID(), templateId: "search" },
    });
    expect(response.statusCode).toBe(200);
    expect(response.body).toContain("event: done");
    expect(client.last?.plugins).toEqual([{ id: "web", max_results: 5 }]);
    expect(client.last?.messages.some((row) => typeof row.content === "string" && row.content.includes("即時網頁搜尋"))).toBe(true);
  });

  it("omits the web plugin when web_search is off", async () => {
    await app.ctx.prisma.featureFlag.upsert({
      where: { key: FeatureFlagKey.WEB_SEARCH },
      create: { key: FeatureFlagKey.WEB_SEARCH, enabled: false },
      update: { enabled: false },
    });
    const registered = await app.inject({
      method: "POST",
      url: "/v1/auth/register",
      payload: { email: `noweb-${Date.now()}@gwgwgroup.com`, password: "spring-pass-1" },
    });
    const token = registered.json().accessToken as string;
    const response = await app.inject({
      method: "POST",
      url: "/v1/messages",
      headers: { authorization: `Bearer ${token}` },
      payload: { content: "今日香港天氣", clientMessageId: randomUUID(), templateId: "search" },
    });
    expect(response.statusCode).toBe(200);
    expect(response.body).toContain("event: done");
    expect(client.last?.plugins).toBeUndefined();
    await app.ctx.prisma.featureFlag.deleteMany({ where: { key: FeatureFlagKey.WEB_SEARCH } });
  });

  it("uses the memo write template without a web plugin", async () => {
    const registered = await app.inject({
      method: "POST",
      url: "/v1/auth/register",
      payload: { email: `memo-${Date.now()}@gwgwgroup.com`, password: "spring-pass-1" },
    });
    const token = registered.json().accessToken as string;
    const response = await app.inject({
      method: "POST",
      url: "/v1/messages",
      headers: { authorization: `Bearer ${token}` },
      payload: { content: "聽日交報告", clientMessageId: randomUUID(), mode: "write", templateId: "memo" },
    });
    expect(response.statusCode).toBe(200);
    expect(response.body).toContain("event: done");
    expect(client.last?.plugins).toBeUndefined();
    expect(client.last?.messages.some((row) => typeof row.content === "string" && row.content.includes("短備忘"))).toBe(true);
  });

  it("marks a slug HK_BLOCKED after three region 403 probes", async () => {
    let attempts = 0;
    const blockedClient: OpenRouterClient = {
      async listModels() {
        return [];
      },
      async listImageModels() {
        return [];
      },
      streamChat() {
        throw new Error("unused");
      },
      async completeChat() {
        attempts += 1;
        throw new UpstreamError(ErrorCode.UPSTREAM_REGION_BLOCKED, "Unsupported region", 403);
      },
      async generateImage() {
        throw new Error("unused");
      },
    };
    await app.ctx.prisma.modelPoolEntry.create({
      data: { slug: "x-ai/grok-test", enabled: true, regionStatus: "UNKNOWN", healthStatus: "DOWN" },
    });
    const probe = new ProbeHkAvailabilityJob(app.ctx.prisma, blockedClient, false);
    await probe.probeSlug("x-ai/grok-test");
    await probe.probeSlug("x-ai/grok-test");
    const before = await app.ctx.prisma.modelPoolEntry.findUnique({ where: { slug: "x-ai/grok-test" } });
    expect(before?.regionStatus).toBe("UNKNOWN");
    expect(before?.consecutiveRegionBlocks).toBe(2);
    await probe.probeSlug("x-ai/grok-test");
    const after = await app.ctx.prisma.modelPoolEntry.findUnique({ where: { slug: "x-ai/grok-test" } });
    expect(after?.regionStatus).toBe("HK_BLOCKED");
    expect(attempts).toBe(3);
  });
});

describe("POST /v1/messages dead-endpoint retry", () => {
  const dead = "google/gemma-2-9b-it";
  const live = "qwen/qwen3.7-flash";
  const requested: string[] = [];
  const client: OpenRouterClient = {
    async listModels() {
      return [];
    },
    async listImageModels() {
      return [];
    },
    async completeChat() {
      return { text: "標題", model: live, images: [] };
    },
    async generateImage() {
      throw new Error("unused");
    },
    streamChat(input) {
      requested.push(input.model);
      if (input.model === dead) {
        throw new UpstreamError(ErrorCode.UPSTREAM_UNAVAILABLE, "No endpoints found", 404);
      }
      return (async function* () {
        yield { type: "delta" as const, text: "泉" };
        yield {
          type: "done" as const,
          model: live,
          usage: { promptTokens: 4, completionTokens: 1, costUsd: 0.00001 },
        };
      })();
    },
  };
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeAll(async () => {
    const ctx = await createContext({
      openrouter: client,
      titles: { async enqueue() {} },
    });
    await reset(ctx.prisma);
    for (const slug of [dead, live]) {
      await ctx.prisma.modelCatalog.create({
        data: {
          slug,
          name: slug,
          author: slug.split("/")[0] ?? "unknown",
          contextLength: 32_000,
          inputModalities: ["text"],
          outputModalities: ["text"],
          pricing: { prompt: "0.00000005", completion: "0.0000001" },
          isFreeRoute: false,
          raw: {},
          syncedAt: new Date(),
        },
      });
    }
    await ctx.prisma.modelPoolEntry.create({
      data: {
        slug: dead,
        enabled: true,
        regionStatus: "HK_SAFE",
        healthStatus: "HEALTHY",
        weight: 10_000,
        qualityScore: 100,
        minPlanTier: "FREE",
      },
    });
    await ctx.prisma.modelPoolEntry.create({
      data: {
        slug: live,
        enabled: true,
        regionStatus: "HK_SAFE",
        healthStatus: "HEALTHY",
        weight: 1,
        qualityScore: 1,
        minPlanTier: "FREE",
      },
    });
    app = await buildApp({ ctx });
  });

  afterAll(async () => {
    await app.close();
    await app.ctx.disconnect();
  });

  it("redraws after a 404 and leaves the dead slug HK_SAFE", async () => {
    const registered = await app.inject({
      method: "POST",
      url: "/v1/auth/register",
      payload: { email: `retry-${Date.now()}@gwgwgroup.com`, password: "spring-pass-1" },
    });
    const token = registered.json().accessToken as string;
    const response = await app.inject({
      method: "POST",
      url: "/v1/messages",
      headers: { authorization: `Bearer ${token}` },
      payload: { content: "用一個字答：泉", clientMessageId: randomUUID() },
    });
    expect(response.statusCode).toBe(200);
    expect(response.body).toContain("event: done");
    expect(response.body).toContain("泉");
    expect(requested[0]).toBe(dead);
    expect(requested[1]).toBe(live);
    const down = await app.ctx.prisma.modelPoolEntry.findUnique({ where: { slug: dead } });
    expect(down?.healthStatus).toBe("DOWN");
    expect(down?.regionStatus).toBe("HK_SAFE");
    expect(down?.lastErrorCode).toBe(ErrorCode.UPSTREAM_UNAVAILABLE);
  });
});

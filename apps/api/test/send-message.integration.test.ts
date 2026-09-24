import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ErrorCode } from "@spring/shared";
import { buildApp } from "../src/app";
import { createContext } from "../src/context";
import { ProbeHkAvailabilityJob } from "../src/modules/catalog/application/probe-hk-availability.job";
import type { OpenRouterClient } from "../src/modules/catalog/infra/openrouter.client";
import { UpstreamError } from "../src/modules/catalog/infra/openrouter-stream.parser";

function fakeClient(): OpenRouterClient & { calls: number } {
  const state = { calls: 0 };
  return {
    get calls() {
      return state.calls;
    },
    async listModels() {
      return [];
    },
    async completeChat() {
      return { text: "測試標題", model: "deepseek/deepseek-chat", images: [] };
    },
    streamChat() {
      state.calls += 1;
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
  await prisma.usageLedger.deleteMany();
  await prisma.adminAuditLog.deleteMany();
  await prisma.clientMessage.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.oAuthAccount.deleteMany();
  await prisma.user.deleteMany();
  await prisma.modelPoolEntry.deleteMany();
  await prisma.modelCatalog.deleteMany();
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

  it("marks a slug HK_BLOCKED after three region 403 probes", async () => {
    let attempts = 0;
    const blockedClient: OpenRouterClient = {
      async listModels() {
        return [];
      },
      streamChat() {
        throw new Error("unused");
      },
      async completeChat() {
        attempts += 1;
        throw new UpstreamError(ErrorCode.UPSTREAM_REGION_BLOCKED, "Unsupported region", 403);
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

import { randomUUID } from "node:crypto";
import { mkdir, rm } from "node:fs/promises";
import type { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ErrorCode, createId } from "@spring/shared";
import { buildApp } from "../src/app";
import { createContext } from "../src/context";
import { ProbeHkAvailabilityJob } from "../src/modules/catalog/application/probe-hk-availability.job";
import type { GenerateImageResult, OpenRouterClient } from "../src/modules/catalog/infra/openrouter.client";
import { persistGeneratedImage } from "../src/modules/chat/infra/generated-image.store";
import { env } from "../src/env";
import { UpstreamError } from "../src/modules/catalog/infra/openrouter-stream.parser";

const PIXEL =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

function imageClient(result: GenerateImageResult): OpenRouterClient & { streamCalls: number; imageCalls: number } {
  const state = { streamCalls: 0, imageCalls: 0 };
  return {
    get streamCalls() {
      return state.streamCalls;
    },
    get imageCalls() {
      return state.imageCalls;
    },
    async listModels() {
      return [];
    },
    async listImageModels() {
      return [];
    },
    async completeChat() {
      return { text: "標題", model: "deepseek/deepseek-chat", images: [] };
    },
    async generateImage() {
      state.imageCalls += 1;
      return result;
    },
    streamChat() {
      state.streamCalls += 1;
      throw new Error("streamChat should not run for image turns");
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
  await prisma.refreshToken.deleteMany();
  await prisma.oAuthAccount.deleteMany();
  await prisma.user.deleteMany();
  await prisma.modelPoolEntry.deleteMany();
  await prisma.modelCatalog.deleteMany();
}

async function seedText(prisma: PrismaClient): Promise<void> {
  await prisma.modelCatalog.create({
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
  await prisma.modelPoolEntry.create({
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
}

async function seedImage(prisma: PrismaClient): Promise<void> {
  await prisma.modelCatalog.create({
    data: {
      slug: "qwen/qwen-image-3",
      name: "Qwen Image 3",
      author: "qwen",
      contextLength: 8_192,
      inputModalities: ["text"],
      outputModalities: ["image"],
      pricing: { prompt: "0", completion: "0" },
      isFreeRoute: false,
      raw: {},
      syncedAt: new Date(),
    },
  });
  await prisma.modelPoolEntry.create({
    data: {
      slug: "qwen/qwen-image-3",
      enabled: true,
      regionStatus: "HK_SAFE",
      healthStatus: "HEALTHY",
      weight: 100,
      qualityScore: 80,
      minPlanTier: "FREE",
    },
  });
}

describe("image generation", () => {
  const client = imageClient({
    model: "qwen/qwen-image-3",
    promptTokens: 0,
    completionTokens: 12,
    costUsd: 0.03,
    images: [{ url: "https://cdn.example/spring.png" }],
  });
  let app: Awaited<ReturnType<typeof buildApp>>;
  let token: string;

  beforeAll(async () => {
    await mkdir(env.generatedDir, { recursive: true });
    const ctx = await createContext({
      openrouter: client,
      titles: { async enqueue() {} },
    });
    await reset(ctx.prisma);
    await seedText(ctx.prisma);
    app = await buildApp({ ctx });
    const registered = await app.inject({
      method: "POST",
      url: "/v1/auth/register",
      payload: { email: `image-${Date.now()}@gwgwgroup.com`, password: "spring-pass-1" },
    });
    expect(registered.statusCode).toBe(201);
    token = registered.json().accessToken as string;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
      await app.ctx.disconnect();
    }
    await rm(env.generatedDir, { recursive: true, force: true });
  });

  it("keeps capabilities.image false until an HK_SAFE image model is in the pool", async () => {
    const before = await app.inject({
      method: "GET",
      url: "/v1/capabilities",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(before.json().image).toBe(false);
    await seedImage(app.ctx.prisma);
    const after = await app.inject({
      method: "GET",
      url: "/v1/capabilities",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(after.json().image).toBe(true);
  });

  it("stores imageUrl from the Image API and lists it on image conversations", async () => {
    const sent = await app.inject({
      method: "POST",
      url: "/v1/messages",
      headers: { authorization: `Bearer ${token}` },
      payload: { content: "一枝松", clientMessageId: randomUUID(), mode: "image", imageStyle: "ink" },
    });
    expect(sent.statusCode).toBe(200);
    expect(sent.body).toContain("event: done");
    expect(sent.body).toContain("https://cdn.example/spring.png");
    expect(client.streamCalls).toBe(0);
    expect(client.imageCalls).toBe(1);

    const listed = await app.inject({
      method: "GET",
      url: "/v1/conversations?mode=image",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(listed.statusCode).toBe(200);
    const items = listed.json().items as Array<{ id: string; mode: string; lastImageUrl: string | null }>;
    expect(items).toHaveLength(1);
    expect(items[0]?.mode).toBe("image");
    expect(items[0]?.lastImageUrl).toBe("https://cdn.example/spring.png");

    const chat = await app.inject({
      method: "GET",
      url: `/v1/conversations/${items[0]?.id}/messages?limit=100`,
      headers: { authorization: `Bearer ${token}` },
    });
    const messages = chat.json().items as Array<{ role: string; imageUrl: string | null }>;
    expect(messages.some((row) => row.role === "ASSISTANT" && row.imageUrl === "https://cdn.example/spring.png")).toBe(true);
  });

  it("writes b64 images and serves them at /v1/generated/:id", async () => {
    const id = createId();
    const path = await persistGeneratedImage(id, { b64: PIXEL, mediaType: "image/png" });
    expect(path).toBe(`/v1/generated/${id}`);
    const response = await app.inject({ method: "GET", url: path });
    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toMatch(/image\/png/);
    expect(Buffer.from(response.rawPayload).length).toBeGreaterThan(10);
  });

  it("probes image models through generateImage", async () => {
    let attempts = 0;
    const blocked: OpenRouterClient = {
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
        throw new Error("text probe should not run");
      },
      async generateImage() {
        attempts += 1;
        throw new UpstreamError(ErrorCode.UPSTREAM_REGION_BLOCKED, "Unsupported region", 403);
      },
    };
    await app.ctx.prisma.modelCatalog.create({
      data: {
        slug: "qwen/qwen-image-blocked",
        name: "blocked",
        author: "qwen",
        contextLength: 1024,
        inputModalities: ["text"],
        outputModalities: ["image"],
        pricing: {},
        isFreeRoute: false,
        raw: {},
        syncedAt: new Date(),
      },
    });
    await app.ctx.prisma.modelPoolEntry.create({
      data: { slug: "qwen/qwen-image-blocked", enabled: true, regionStatus: "UNKNOWN", healthStatus: "DOWN" },
    });
    const probe = new ProbeHkAvailabilityJob(app.ctx.prisma, blocked, false);
    await probe.probeSlug("qwen/qwen-image-blocked");
    await probe.probeSlug("qwen/qwen-image-blocked");
    await probe.probeSlug("qwen/qwen-image-blocked");
    const after = await app.ctx.prisma.modelPoolEntry.findUnique({ where: { slug: "qwen/qwen-image-blocked" } });
    expect(after?.regionStatus).toBe("HK_BLOCKED");
    expect(attempts).toBe(3);
  });
});

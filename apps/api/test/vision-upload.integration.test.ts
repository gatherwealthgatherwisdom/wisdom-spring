import { randomUUID } from "node:crypto";
import { mkdir, rm } from "node:fs/promises";
import type { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  ErrorCode,
  FEATURE_OFF_COPY,
  FILE_LATER_COPY,
  FILE_PROMPT,
  FeatureFlagKey,
  IMAGE_MODE_NO_UPLOAD_COPY,
  IMAGE_TOO_LARGE_COPY,
  LIMITS,
  LOOK_PROMPT,
} from "@spring/shared";
import { buildApp } from "../src/app";
import { createContext } from "../src/context";
import { env } from "../src/env";
import type { ChatMessage, OpenRouterClient, StreamChatInput } from "../src/modules/catalog/infra/openrouter.client";

const PIXEL =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

function visionClient(): OpenRouterClient & {
  streamCalls: number;
  imageCalls: number;
  lastMessages: ChatMessage[];
  last?: StreamChatInput;
} {
  const state: { streamCalls: number; imageCalls: number; lastMessages: ChatMessage[]; last?: StreamChatInput } = {
    streamCalls: 0,
    imageCalls: 0,
    lastMessages: [],
  };
  return {
    get streamCalls() {
      return state.streamCalls;
    },
    get imageCalls() {
      return state.imageCalls;
    },
    get lastMessages() {
      return state.lastMessages;
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
      return { text: "睇圖", model: "qwen/qwen-2.5-vl-7b-instruct", images: [] };
    },
    async generateImage() {
      state.imageCalls += 1;
      throw new Error("generateImage should not run for vision turns");
    },
    streamChat(input) {
      state.streamCalls += 1;
      state.last = input;
      state.lastMessages = input.messages;
      return (async function* () {
        yield { type: "delta" as const, text: "見到一點綠。" };
        yield {
          type: "done" as const,
          model: "qwen/qwen-2.5-vl-7b-instruct",
          usage: { promptTokens: 10, completionTokens: 6, costUsd: 0.0001 },
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
  await prisma.featureFlag.deleteMany();
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

async function seedVision(prisma: PrismaClient): Promise<void> {
  await prisma.modelCatalog.create({
    data: {
      slug: "qwen/qwen-2.5-vl-7b-instruct",
      name: "Qwen VL",
      author: "qwen",
      contextLength: 32_000,
      inputModalities: ["text", "image"],
      outputModalities: ["text"],
      pricing: { prompt: "0.0000002", completion: "0.0000004" },
      isFreeRoute: false,
      raw: {},
      syncedAt: new Date(),
    },
  });
  await prisma.modelPoolEntry.create({
    data: {
      slug: "qwen/qwen-2.5-vl-7b-instruct",
      enabled: true,
      regionStatus: "HK_SAFE",
      healthStatus: "HEALTHY",
      weight: 100,
      qualityScore: 80,
      minPlanTier: "FREE",
    },
  });
}

describe("photo uploads and vision", () => {
  const client = visionClient();
  let app: Awaited<ReturnType<typeof buildApp>>;
  let token: string;
  let otherToken: string;

  beforeAll(async () => {
    await mkdir(env.uploadsDir, { recursive: true });
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
      payload: { email: `vision-${Date.now()}@gwgwgroup.com`, password: "spring-pass-1" },
    });
    expect(registered.statusCode).toBe(201);
    token = registered.json().accessToken as string;
    const other = await app.inject({
      method: "POST",
      url: "/v1/auth/register",
      payload: { email: `vision-other-${Date.now()}@gwgwgroup.com`, password: "spring-pass-1" },
    });
    expect(other.statusCode).toBe(201);
    otherToken = other.json().accessToken as string;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
      await app.ctx.disconnect();
    }
    await rm(env.uploadsDir, { recursive: true, force: true });
  });

  it("rejects an upload without a token", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/v1/uploads",
      payload: { mime: "image/png", data: PIXEL },
    });
    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe(ErrorCode.AUTH_INVALID);
  });

  it("rejects unknown files and oversized payloads", async () => {
    const unknown = await app.inject({
      method: "POST",
      url: "/v1/uploads",
      headers: { authorization: `Bearer ${token}` },
      payload: { mime: "text/plain", data: Buffer.from("hello").toString("base64") },
    });
    expect(unknown.statusCode).toBe(400);
    expect(unknown.json().error.code).toBe(ErrorCode.VALIDATION);
    expect(unknown.json().error.message).toBe(FILE_LATER_COPY);

    const huge = Buffer.alloc(LIMITS.uploadMaxBytes + 1, 0xff);
    huge[0] = 0xff;
    huge[1] = 0xd8;
    huge[2] = 0xff;
    const oversize = await app.inject({
      method: "POST",
      url: "/v1/uploads",
      headers: { authorization: `Bearer ${token}` },
      payload: { mime: "image/jpeg", data: huge.toString("base64") },
    });
    expect(oversize.statusCode).toBe(400);
    expect(oversize.json().error.message).toBe(IMAGE_TOO_LARGE_COPY);
  });

  it("stores a jpeg-or-png upload and serves the bytes", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/v1/uploads",
      headers: { authorization: `Bearer ${token}` },
      payload: { mime: "image/png", data: PIXEL },
    });
    expect(created.statusCode).toBe(201);
    const body = created.json() as { id: string; url: string; mime: string; byteSize: number };
    expect(body.mime).toBe("image/png");
    expect(body.url).toBe(`/v1/uploads/${body.id}`);
    expect(body.byteSize).toBeGreaterThan(10);
    const fetched = await app.inject({ method: "GET", url: body.url });
    expect(fetched.statusCode).toBe(200);
    expect(fetched.headers["content-type"]).toMatch(/image\/png/);
    expect(Buffer.from(fetched.rawPayload).length).toBe(body.byteSize);
  });

  it("keeps capabilities.vision false until an HK_SAFE vision model is in the pool", async () => {
    const before = await app.inject({
      method: "GET",
      url: "/v1/capabilities",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(before.json().vision).toBe(false);
    await seedVision(app.ctx.prisma);
    const after = await app.inject({
      method: "GET",
      url: "/v1/capabilities",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(after.json().vision).toBe(true);
    expect(after.json().image).toBe(false);
  });

  it("rejects someone else's assetId", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/v1/uploads",
      headers: { authorization: `Bearer ${token}` },
      payload: { mime: "image/png", data: PIXEL },
    });
    const assetId = created.json().id as string;
    const sent = await app.inject({
      method: "POST",
      url: "/v1/messages",
      headers: { authorization: `Bearer ${otherToken}` },
      payload: { content: "", clientMessageId: randomUUID(), attachments: [{ assetId }] },
    });
    expect(sent.statusCode).toBe(404);
    expect(sent.json().error.code).toBe(ErrorCode.NOT_FOUND);
  });

  it("rejects attachments on an image-generation turn", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/v1/uploads",
      headers: { authorization: `Bearer ${token}` },
      payload: { mime: "image/png", data: PIXEL },
    });
    const sent = await app.inject({
      method: "POST",
      url: "/v1/messages",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        content: "一枝松",
        clientMessageId: randomUUID(),
        mode: "image",
        attachments: [{ assetId: created.json().id }],
      },
    });
    expect(sent.statusCode).toBe(400);
    expect(sent.json().error.code).toBe(ErrorCode.VALIDATION);
    expect(sent.json().error.message).toBe(IMAGE_MODE_NO_UPLOAD_COPY);
  });

  it("sends a data URL on an empty caption and draws a vision model", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/v1/uploads",
      headers: { authorization: `Bearer ${token}` },
      payload: { mime: "image/png", data: PIXEL },
    });
    expect(created.statusCode).toBe(201);
    const assetId = created.json().id as string;
    const sent = await app.inject({
      method: "POST",
      url: "/v1/messages",
      headers: { authorization: `Bearer ${token}` },
      payload: { content: "", clientMessageId: randomUUID(), attachments: [{ assetId }] },
    });
    expect(sent.statusCode).toBe(200);
    expect(sent.body).toContain("event: done");
    expect(sent.body).toContain("qwen/qwen-2.5-vl-7b-instruct");
    expect(sent.body).toContain("見到一點綠。");
    expect(client.imageCalls).toBe(0);
    expect(client.streamCalls).toBeGreaterThan(0);
    const lastUser = [...client.lastMessages].reverse().find((row) => row.role === "user");
    expect(Array.isArray(lastUser?.content)).toBe(true);
    const parts = lastUser?.content as Array<{ type?: string; text?: string; image_url?: { url?: string } }>;
    expect(parts.some((part) => part.type === "text" && part.text === LOOK_PROMPT)).toBe(true);
    expect(parts.some((part) => part.type === "image_url" && part.image_url?.url?.startsWith("data:image/png;base64,"))).toBe(
      true,
    );

    const listed = await app.inject({
      method: "GET",
      url: "/v1/conversations",
      headers: { authorization: `Bearer ${token}` },
    });
    const conversationId = (listed.json().items as Array<{ id: string }>)[0]?.id;
    expect(conversationId).toBeTruthy();
    const chat = await app.inject({
      method: "GET",
      url: `/v1/conversations/${conversationId}/messages?limit=100`,
      headers: { authorization: `Bearer ${token}` },
    });
    const messages = chat.json().items as Array<{
      role: string;
      content: string;
      attachments: Array<{ id: string; url: string; mime: string }>;
    }>;
    const userTurn = messages.find((row) => row.role === "USER");
    expect(userTurn?.content).toBe("");
    expect(userTurn?.attachments).toEqual([{ id: assetId, url: `/v1/uploads/${assetId}`, mime: "image/png" }]);
  });

  it("stores a pdf and sends it through the file-parser plugin", async () => {
    const bytes = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");
    const created = await app.inject({
      method: "POST",
      url: "/v1/uploads",
      headers: { authorization: `Bearer ${token}` },
      payload: { mime: "application/pdf", data: bytes.toString("base64") },
    });
    expect(created.statusCode).toBe(201);
    const body = created.json() as { id: string; url: string; mime: string; byteSize: number };
    expect(body.mime).toBe("application/pdf");
    expect(body.byteSize).toBe(bytes.length);
    const fetched = await app.inject({ method: "GET", url: body.url });
    expect(fetched.statusCode).toBe(200);
    expect(String(fetched.headers["content-type"])).toMatch(/application\/pdf/);

    const sent = await app.inject({
      method: "POST",
      url: "/v1/messages",
      headers: { authorization: `Bearer ${token}` },
      payload: { content: "", clientMessageId: randomUUID(), attachments: [{ assetId: body.id }] },
    });
    expect(sent.statusCode).toBe(200);
    expect(sent.body).toContain("event: done");
    expect(client.last?.plugins).toEqual([{ id: "file-parser", pdf: { engine: "pdf-text" } }]);
    const lastUser = [...client.lastMessages].reverse().find((row) => row.role === "user");
    expect(Array.isArray(lastUser?.content)).toBe(true);
    const parts = lastUser?.content as Array<{
      type?: string;
      text?: string;
      file?: { filename?: string; file_data?: string };
    }>;
    expect(parts.some((part) => part.type === "text" && part.text === FILE_PROMPT)).toBe(true);
    expect(
      parts.some(
        (part) =>
          part.type === "file" &&
          typeof part.file?.file_data === "string" &&
          part.file.file_data.startsWith("data:application/pdf;base64,"),
      ),
    ).toBe(true);
  });

  it("rejects pdf uploads when pdf_upload is off", async () => {
    await app.ctx.prisma.featureFlag.upsert({
      where: { key: FeatureFlagKey.PDF_UPLOAD },
      create: { key: FeatureFlagKey.PDF_UPLOAD, enabled: false },
      update: { enabled: false },
    });
    const bytes = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");
    const created = await app.inject({
      method: "POST",
      url: "/v1/uploads",
      headers: { authorization: `Bearer ${token}` },
      payload: { mime: "application/pdf", data: bytes.toString("base64") },
    });
    expect(created.statusCode).toBe(400);
    expect(created.json().error.message).toBe(FEATURE_OFF_COPY);
    await app.ctx.prisma.featureFlag.deleteMany({ where: { key: FeatureFlagKey.PDF_UPLOAD } });
  });

  it("hides vision capability when the flag is off", async () => {
    await app.ctx.prisma.featureFlag.upsert({
      where: { key: FeatureFlagKey.VISION },
      create: { key: FeatureFlagKey.VISION, enabled: false },
      update: { enabled: false },
    });
    const caps = await app.inject({
      method: "GET",
      url: "/v1/capabilities",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(caps.json().vision).toBe(false);
    const created = await app.inject({
      method: "POST",
      url: "/v1/uploads",
      headers: { authorization: `Bearer ${token}` },
      payload: { mime: "image/png", data: PIXEL },
    });
    expect(created.statusCode).toBe(400);
    expect(created.json().error.message).toBe(FEATURE_OFF_COPY);
    await app.ctx.prisma.featureFlag.deleteMany({ where: { key: FeatureFlagKey.VISION } });
  });
});

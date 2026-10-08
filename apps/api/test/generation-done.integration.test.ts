import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ErrorCode } from "@spring/shared";
import { buildApp } from "../src/app";
import { createContext } from "../src/context";
import { invalidateAppLimits } from "../src/modules/admin/app-limits";
import { invalidatePromptDocs } from "../src/modules/admin/prompt-docs";
import { toActingUser } from "../src/modules/auth/acting-user";
import type { OpenRouterClient, StreamChatInput } from "../src/modules/catalog/infra/openrouter.client";
import type { SseSink } from "../src/http/sse";
import { MemoryPushSender } from "../src/modules/user/push-sender";

function holdingClient(): OpenRouterClient & {
  armHold: () => Promise<void>;
} {
  let hold: { started: () => void } | null = null;
  return {
    armHold() {
      return new Promise<void>((resolve) => {
        hold = { started: resolve };
      });
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
    streamChat(input: StreamChatInput) {
      const waiting = hold;
      hold = null;
      if (!waiting) {
        return (async function* () {
          yield { type: "delta" as const, text: "你好，智泉。" };
          yield {
            type: "done" as const,
            model: "deepseek/deepseek-chat",
            usage: { promptTokens: 8, completionTokens: 4, costUsd: 0.00021 },
          };
        })();
      }
      return (async function* () {
        yield { type: "delta" as const, text: "部分回覆" };
        waiting.started();
        await new Promise<never>((_, reject) => {
          const fail = () => reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
          if (input.signal.aborted) fail();
          else input.signal.addEventListener("abort", fail, { once: true });
        });
      })();
    },
  };
}

function detachedSink(left: boolean): SseSink {
  const abort = new AbortController();
  if (left) abort.abort();
  return {
    signal: abort.signal,
    send() {},
    close() {},
  };
}

async function reset(prisma: PrismaClient): Promise<void> {
  await prisma.deviceToken.deleteMany();
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

async function seedPool(prisma: PrismaClient): Promise<void> {
  await prisma.modelCatalog.create({
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

describe("generation after the client leaves", () => {
  const client = holdingClient();
  const memory = new MemoryPushSender();
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeAll(async () => {
    const ctx = await createContext({
      openrouter: client,
      titles: { async enqueue() {} },
      push: memory,
    });
    await reset(ctx.prisma);
    await seedPool(ctx.prisma);
    app = await buildApp({ ctx });
  });

  afterAll(async () => {
    if (!app) return;
    await app.close();
    await app.ctx.disconnect();
  });

  async function member(email: string) {
    const registered = await app.inject({
      method: "POST",
      url: "/v1/auth/register",
      payload: { email, password: "spring-pass-1" },
    });
    expect(registered.statusCode).toBe(201);
    const token = registered.json().accessToken as string;
    const userId = registered.json().user.id as string;
    const row = await app.ctx.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const device = `ExponentPushToken[done-${userId.slice(0, 8)}]`;
    await app.inject({
      method: "POST",
      url: "/v1/devices",
      headers: { authorization: `Bearer ${token}` },
      payload: { token: device, platform: "ios" },
    });
    return { token, userId, acting: toActingUser(row), device };
  }

  it("completes the turn and sends generation_done when the client already left", async () => {
    memory.sent.length = 0;
    const session = await member(`leave-${Date.now()}@gwgwgroup.com`);
    const prepared = await app.ctx.sendMessage.prepare(session.acting, {
      content: "講下智慧之泉",
      clientMessageId: randomUUID(),
      attachments: [],
    });
    expect(prepared.kind).toBe("generate");
    if (prepared.kind !== "generate") return;
    await app.ctx.sendMessage.continue(session.acting, prepared, detachedSink(true));
    const stored = await app.ctx.prisma.message.findUnique({ where: { id: prepared.assistantMessageId } });
    expect(stored?.status).toBe("COMPLETED");
    expect(stored?.content).toBe("你好，智泉。");
    expect(memory.sent.filter((item) => item.data.kind === "generation_done")).toEqual([
      {
        to: session.device,
        title: "智泉已經回覆",
        body: "打開對話睇回覆。",
        data: { kind: "generation_done", conversationId: prepared.conversationId },
      },
    ]);
  });

  it("does not push generation_done while the client is still watching", async () => {
    memory.sent.length = 0;
    const session = await member(`watch-${Date.now()}@gwgwgroup.com`);
    const prepared = await app.ctx.sendMessage.prepare(session.acting, {
      content: "講下智慧之泉",
      clientMessageId: randomUUID(),
      attachments: [],
    });
    expect(prepared.kind).toBe("generate");
    if (prepared.kind !== "generate") return;
    await app.ctx.sendMessage.continue(session.acting, prepared, detachedSink(false));
    const stored = await app.ctx.prisma.message.findUnique({ where: { id: prepared.assistantMessageId } });
    expect(stored?.status).toBe("COMPLETED");
    expect(memory.sent.filter((item) => item.data.kind === "generation_done")).toEqual([]);
  });

  it("skips generation_done when the user turned the switch off", async () => {
    memory.sent.length = 0;
    const session = await member(`off-${Date.now()}@gwgwgroup.com`);
    await app.inject({
      method: "PATCH",
      url: "/v1/me",
      headers: { authorization: `Bearer ${session.token}` },
      payload: { notifyGenerationDone: false },
    });
    const acting = toActingUser(await app.ctx.prisma.user.findUniqueOrThrow({ where: { id: session.userId } }));
    const prepared = await app.ctx.sendMessage.prepare(acting, {
      content: "講下智慧之泉",
      clientMessageId: randomUUID(),
      attachments: [],
    });
    expect(prepared.kind).toBe("generate");
    if (prepared.kind !== "generate") return;
    await app.ctx.sendMessage.continue(acting, prepared, detachedSink(true));
    expect(memory.sent.filter((item) => item.data.kind === "generation_done")).toEqual([]);
  });

  it("still cancels when the stop endpoint fires", async () => {
    memory.sent.length = 0;
    const session = await member(`stop-${Date.now()}@gwgwgroup.com`);
    const started = client.armHold();
    const pending = app.inject({
      method: "POST",
      url: "/v1/messages",
      headers: { authorization: `Bearer ${session.token}` },
      payload: { content: "講下智慧之泉", clientMessageId: randomUUID() },
    });
    await started;
    const streaming = await app.ctx.prisma.message.findFirst({
      where: { conversation: { userId: session.userId }, role: "ASSISTANT", status: "STREAMING" },
    });
    expect(streaming).toBeTruthy();
    const stopped = await app.inject({
      method: "POST",
      url: `/v1/messages/${streaming?.id}/abort`,
      headers: { authorization: `Bearer ${session.token}` },
    });
    expect(stopped.statusCode).toBe(200);
    const response = await pending;
    expect(response.statusCode).toBe(200);
    expect(response.body).toContain(ErrorCode.STREAM_ABORTED);
    const stored = await app.ctx.prisma.message.findUnique({ where: { id: streaming?.id } });
    expect(stored?.status).toBe("CANCELLED");
    expect(memory.sent.filter((item) => item.data.kind === "generation_done")).toEqual([]);
  });
});

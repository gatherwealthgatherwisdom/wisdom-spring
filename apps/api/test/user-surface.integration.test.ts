import type { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ErrorCode, FeatureFlagKey, createId, hkMonthRange } from "@spring/shared";
import { buildApp } from "../src/app";
import { createContext } from "../src/context";
import type { OpenRouterClient } from "../src/modules/catalog/infra/openrouter.client";

function unusedClient(): OpenRouterClient {
  return {
    async listModels() {
      return [];
    },
    async listImageModels() {
      return [];
    },
    async completeChat() {
      throw new Error("unused");
    },
    async generateImage() {
      throw new Error("unused");
    },
    streamChat() {
      throw new Error("unused");
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
  await prisma.announcement.deleteMany();
  await prisma.featureFlag.deleteMany();
}

async function register(app: Awaited<ReturnType<typeof buildApp>>, email: string): Promise<string> {
  const response = await app.inject({
    method: "POST",
    url: "/v1/auth/register",
    payload: { email, password: "spring-pass-1" },
  });
  expect(response.statusCode).toBe(201);
  return response.json().accessToken as string;
}

describe("home and me live data", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeAll(async () => {
    const ctx = await createContext({
      openrouter: unusedClient(),
      titles: { async enqueue() {} },
    });
    await reset(ctx.prisma);
    app = await buildApp({ ctx });
  });

  afterAll(async () => {
    if (!app) return;
    await app.close();
    await app.ctx.disconnect();
  });

  it("lists only active announcements without a token", async () => {
    await app.ctx.prisma.announcement.createMany({
      data: [
        { id: createId(), bodyZh: "維修今晚", bodyEn: "Maintenance tonight", active: true },
        { id: createId(), bodyZh: "舊告示", bodyEn: "Old notice", active: false },
      ],
    });
    const response = await app.inject({ method: "GET", url: "/v1/announcements" });
    expect(response.statusCode).toBe(200);
    const items = response.json().items as { bodyZh: string; active: boolean }[];
    expect(items).toHaveLength(1);
    expect(items[0]?.bodyZh).toBe("維修今晚");
    expect(items[0]?.active).toBe(true);
  });

  it("returns user_model_picker false when the flag row is missing", async () => {
    await app.ctx.prisma.featureFlag.deleteMany();
    const response = await app.inject({ method: "GET", url: "/v1/flags" });
    expect(response.statusCode).toBe(200);
    expect(response.json().items).toEqual([{ key: FeatureFlagKey.USER_MODEL_PICKER, enabled: false }]);
  });

  it("reads the stored flag without exposing payload", async () => {
    await app.ctx.prisma.featureFlag.upsert({
      where: { key: FeatureFlagKey.USER_MODEL_PICKER },
      create: { key: FeatureFlagKey.USER_MODEL_PICKER, enabled: true, payload: { secret: 1 } },
      update: { enabled: true, payload: { secret: 1 } },
    });
    const response = await app.inject({ method: "GET", url: "/v1/flags" });
    expect(response.statusCode).toBe(200);
    expect(response.json().items).toEqual([{ key: FeatureFlagKey.USER_MODEL_PICKER, enabled: true }]);
    expect(JSON.stringify(response.json())).not.toContain("secret");
  });

  it("rejects usage without a token", async () => {
    const response = await app.inject({ method: "GET", url: "/v1/me/usage" });
    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe(ErrorCode.AUTH_INVALID);
  });

  it("sums this Hong Kong month for the signed-in user", async () => {
    const token = await register(app, `usage-${Date.now()}@gwgwgroup.com`);
    const other = await register(app, `other-${Date.now()}@gwgwgroup.com`);
    const me = await app.inject({ method: "GET", url: "/v1/me", headers: { authorization: `Bearer ${token}` } });
    const otherMe = await app.inject({ method: "GET", url: "/v1/me", headers: { authorization: `Bearer ${other}` } });
    const userId = me.json().user.id as string;
    const otherId = otherMe.json().user.id as string;
    const range = hkMonthRange(new Date());
    await app.ctx.prisma.usageLedger.createMany({
      data: [
        {
          id: createId(),
          userId,
          messageId: createId(),
          model: "deepseek/deepseek-chat",
          promptTokens: 8,
          completionTokens: 4,
          costUsdMicros: 210n,
          occurredAt: new Date(),
        },
        {
          id: createId(),
          userId,
          messageId: createId(),
          model: "qwen/qwen-2.5-72b-instruct",
          promptTokens: 3,
          completionTokens: 2,
          costUsdMicros: 100n,
          occurredAt: new Date(),
        },
        {
          id: createId(),
          userId,
          messageId: createId(),
          model: "deepseek/deepseek-chat",
          promptTokens: 9,
          completionTokens: 9,
          costUsdMicros: 999n,
          occurredAt: new Date(range.start.getTime() - 1_000),
        },
        {
          id: createId(),
          userId: otherId,
          messageId: createId(),
          model: "deepseek/deepseek-chat",
          promptTokens: 1,
          completionTokens: 1,
          costUsdMicros: 50n,
          occurredAt: new Date(),
        },
      ],
    });
    const usage = await app.inject({
      method: "GET",
      url: "/v1/me/usage",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(usage.statusCode).toBe(200);
    expect(usage.json()).toMatchObject({
      from: range.start.toISOString(),
      to: range.end.toISOString(),
      requests: 2,
      costUsdMicros: "310",
      promptTokens: 11,
      completionTokens: 6,
    });
  });
});

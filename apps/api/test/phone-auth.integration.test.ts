import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ErrorCode, LIMITS } from "@spring/shared";
import { buildApp } from "../src/app";
import { createContext } from "../src/context";
import type { SmsSender } from "../src/modules/auth/sms-sender";
import type { OpenRouterClient } from "../src/modules/catalog/infra/openrouter.client";

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

class CapturingSms implements SmsSender {
  code = "";
  async send(_phone: string, code: string): Promise<void> {
    this.code = code;
  }
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

describe("phone login", () => {
  const client = fakeClient();
  const sms = new CapturingSms();
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeAll(async () => {
    const ctx = await createContext({
      openrouter: client,
      titles: { async enqueue() {} },
      sms,
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

  async function issue(phone: string) {
    const requested = await app.inject({ method: "POST", url: "/v1/auth/phone/request", payload: { phone } });
    expect(requested.statusCode).toBe(200);
    expect(requested.json()).toEqual({ ok: true });
    expect(JSON.stringify(requested.json())).not.toContain(sms.code);
    return sms.code;
  }

  it("rejects numbers that are not Hong Kong mobiles", async () => {
    const response = await app.inject({ method: "POST", url: "/v1/auth/phone/request", payload: { phone: "31234567" } });
    expect(response.statusCode).toBe(400);
  });

  it("rejects a wrong code and an expired code", async () => {
    const phone = "61111111";
    const code = await issue(phone);
    const wrong = await app.inject({
      method: "POST",
      url: "/v1/auth/phone/verify",
      payload: { phone, code: code === "000000" ? "111111" : "000000" },
    });
    expect(wrong.statusCode).toBe(401);
    const expiredPhone = "62222222";
    const expiredCode = await issue(expiredPhone);
    await app.ctx.prisma.phoneCode.updateMany({
      where: { phone: "+85262222222", usedAt: null },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    const expired = await app.inject({
      method: "POST",
      url: "/v1/auth/phone/verify",
      payload: { phone: expiredPhone, code: expiredCode },
    });
    expect(expired.statusCode).toBe(401);
  });

  it("invalidates the previous code when a new one is sent", async () => {
    const phone = "63333333";
    const first = await issue(phone);
    const second = await issue(phone);
    expect(second).not.toBe(first);
    const stale = await app.inject({
      method: "POST",
      url: "/v1/auth/phone/verify",
      payload: { phone, code: first },
    });
    expect(stale.statusCode).toBe(401);
    const fresh = await app.inject({
      method: "POST",
      url: "/v1/auth/phone/verify",
      payload: { phone, code: second },
    });
    expect(fresh.statusCode).toBe(200);
    expect(fresh.json().user.registered).toBe(false);
    expect(fresh.json().user.phone).toBe("+85263333333");
    expect(fresh.json().user.guestLimit).toBe(LIMITS.guestTrialMessages);
  });

  it("allows five generations, then requires registration", async () => {
    const phone = "+852 6444 4444";
    const code = await issue(phone);
    const verified = await app.inject({
      method: "POST",
      url: "/v1/auth/phone/verify",
      payload: { phone, code },
    });
    expect(verified.statusCode).toBe(200);
    expect(verified.json().user.registered).toBe(false);
    let token = verified.json().accessToken as string;
    const callsBefore = client.calls;

    const firstBody = { content: "第一次", clientMessageId: randomUUID(), attachments: [] };
    const first = await app.inject({
      method: "POST",
      url: "/v1/messages",
      headers: { authorization: `Bearer ${token}` },
      payload: firstBody,
    });
    expect(first.statusCode).toBe(200);

    const again = await issue(phone);
    const relogin = await app.inject({
      method: "POST",
      url: "/v1/auth/phone/verify",
      payload: { phone, code: again },
    });
    expect(relogin.statusCode).toBe(200);
    token = relogin.json().accessToken as string;
    expect(relogin.json().user.guestUses).toBe(1);

    const replay = await app.inject({
      method: "POST",
      url: "/v1/messages",
      headers: { authorization: `Bearer ${token}` },
      payload: firstBody,
    });
    expect(replay.statusCode).toBe(200);
    expect(client.calls).toBe(callsBefore + 1);
    const afterReplay = await app.ctx.prisma.user.findUnique({ where: { phone: "+85264444444" } });
    expect(afterReplay?.guestUses).toBe(1);

    for (let index = 0; index < 3; index += 1) {
      const sent = await app.inject({
        method: "POST",
        url: "/v1/messages",
        headers: { authorization: `Bearer ${token}` },
        payload: { content: `第${index + 2}次`, clientMessageId: randomUUID(), attachments: [] },
      });
      expect(sent.statusCode).toBe(200);
    }
    expect(client.calls).toBe(callsBefore + 4);

    const messageId = JSON.parse(first.body.match(/data: (\{"messageId".*\})/)?.[1] ?? "{}").messageId as string;
    const regenerated = await app.inject({
      method: "POST",
      url: `/v1/messages/${messageId}/regenerate`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(regenerated.statusCode).toBe(200);
    const used = await app.ctx.prisma.user.findUnique({ where: { phone: "+85264444444" } });
    expect(used?.guestUses).toBe(5);

    const blocked = await app.inject({
      method: "POST",
      url: "/v1/messages",
      headers: { authorization: `Bearer ${token}` },
      payload: { content: "第六次", clientMessageId: randomUUID(), attachments: [] },
    });
    expect(blocked.statusCode).toBe(429);
    expect(blocked.json().error.code).toBe(ErrorCode.QUOTA_GUEST);
    expect(blocked.json().error.message).toBe("試用 5 次已用完。完成註冊後可以繼續用。");
    expect((await app.ctx.prisma.user.findUnique({ where: { phone: "+85264444444" } }))?.guestUses).toBe(5);

    const registered = await app.inject({
      method: "POST",
      url: "/v1/auth/register/phone",
      headers: { authorization: `Bearer ${token}` },
      payload: { displayName: "阿泉" },
    });
    expect(registered.statusCode).toBe(200);
    expect(registered.json().user.registered).toBe(true);
    expect(registered.json().user.displayName).toBe("阿泉");

    const after = await app.inject({
      method: "POST",
      url: "/v1/messages",
      headers: { authorization: `Bearer ${token}` },
      payload: { content: "註冊之後", clientMessageId: randomUUID(), attachments: [] },
    });
    expect(after.statusCode).toBe(200);
    const account = await app.ctx.prisma.user.findUnique({ where: { phone: "+85264444444" } });
    expect(account?.guestUses).toBe(5);
    expect(account?.registeredAt).not.toBeNull();
    const me = await app.inject({
      method: "GET",
      url: "/v1/me",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(me.json().quota.dailyUsed).toBe(1);
    expect(me.json().user.registered).toBe(true);
  });

  it("keeps email accounts on the daily allowance", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/v1/auth/register",
      payload: { email: `keep-${Date.now()}@gwgwgroup.com`, password: "spring-pass-1" },
    });
    expect(response.statusCode).toBe(201);
    expect(response.json().user.registered).toBe(true);
    const row = await app.ctx.prisma.user.findUnique({ where: { email: response.json().user.email } });
    expect(row?.registeredAt).not.toBeNull();
  });
});

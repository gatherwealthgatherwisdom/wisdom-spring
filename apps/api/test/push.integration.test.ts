import type { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DEV_PHONE_CODE, ErrorCode, hkDayKey, LIMITS, createId } from "@spring/shared";
import { buildApp } from "../src/app";
import { createContext } from "../src/context";
import { invalidateAppLimits } from "../src/modules/admin/app-limits";
import { invalidatePromptDocs } from "../src/modules/admin/prompt-docs";
import type { OpenRouterClient } from "../src/modules/catalog/infra/openrouter.client";
import { PushService } from "../src/modules/user/push.service";
import { MemoryPushSender, type PushMessage, type PushSender } from "../src/modules/user/push-sender";

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

class InvalidatingPushSender implements PushSender {
  readonly sent: PushMessage[] = [];
  constructor(private readonly invalid: string[]) {}
  async send(messages: PushMessage[]) {
    this.sent.push(...messages);
    return { invalidTokens: this.invalid };
  }
}

const IOS = "ExponentPushToken[spring-ios-1]";
const ANDROID = "ExponentPushToken[spring-android-1]";
const DEAD = "ExponentPushToken[spring-dead-1]";

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
  await prisma.announcement.deleteMany();
  await prisma.featureFlag.deleteMany();
  await prisma.appSetting.deleteMany();
  await prisma.promptDoc.deleteMany();
  invalidateAppLimits();
  invalidatePromptDocs();
}

async function register(
  app: Awaited<ReturnType<typeof buildApp>>,
  email: string,
): Promise<{ token: string; refresh: string; userId: string }> {
  const response = await app.inject({
    method: "POST",
    url: "/v1/auth/register",
    payload: { email, password: "spring-pass-1" },
  });
  expect(response.statusCode).toBe(201);
  const body = response.json() as { accessToken: string; refreshToken: string; user: { id: string } };
  return { token: body.accessToken, refresh: body.refreshToken, userId: body.user.id };
}

describe("device tokens and quota-low push", () => {
  const memory = new MemoryPushSender();
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeAll(async () => {
    const ctx = await createContext({
      openrouter: unusedClient(),
      titles: { async enqueue() {} },
      push: memory,
    });
    await reset(ctx.prisma);
    app = await buildApp({ ctx });
  });

  afterAll(async () => {
    if (!app) return;
    await app.close();
    await app.ctx.disconnect();
  });

  it("registers, reassigns, and deletes a device token", async () => {
    const first = await register(app, `push-a-${Date.now()}@gwgwgroup.com`);
    const created = await app.inject({
      method: "POST",
      url: "/v1/devices",
      headers: { authorization: `Bearer ${first.token}` },
      payload: { token: IOS, platform: "ios" },
    });
    expect(created.statusCode).toBe(200);
    expect(created.json()).toEqual({ ok: true });
    const stored = await app.ctx.prisma.deviceToken.findUnique({ where: { token: IOS } });
    expect(stored?.userId).toBe(first.userId);
    expect(stored?.platform).toBe("ios");

    const second = await register(app, `push-b-${Date.now()}@gwgwgroup.com`);
    const moved = await app.inject({
      method: "POST",
      url: "/v1/devices",
      headers: { authorization: `Bearer ${second.token}` },
      payload: { token: IOS, platform: "android" },
    });
    expect(moved.statusCode).toBe(200);
    const afterMove = await app.ctx.prisma.deviceToken.findUnique({ where: { token: IOS } });
    expect(afterMove?.userId).toBe(second.userId);
    expect(afterMove?.platform).toBe("android");
    expect(await app.ctx.prisma.deviceToken.count({ where: { userId: first.userId } })).toBe(0);

    const removed = await app.inject({
      method: "DELETE",
      url: "/v1/devices",
      headers: { authorization: `Bearer ${second.token}` },
      payload: { token: IOS },
    });
    expect(removed.statusCode).toBe(200);
    expect(await app.ctx.prisma.deviceToken.count({ where: { token: IOS } })).toBe(0);
  });

  it("rejects a non-Expo token and unauthenticated device calls", async () => {
    const session = await register(app, `push-bad-${Date.now()}@gwgwgroup.com`);
    const bad = await app.inject({
      method: "POST",
      url: "/v1/devices",
      headers: { authorization: `Bearer ${session.token}` },
      payload: { token: "fcm:not-expo", platform: "ios" },
    });
    expect(bad.statusCode).toBe(400);
    expect(bad.json().error.code).toBe(ErrorCode.VALIDATION);
    const anon = await app.inject({
      method: "POST",
      url: "/v1/devices",
      payload: { token: IOS, platform: "ios" },
    });
    expect(anon.statusCode).toBe(401);
  });

  it("writes notify flags on PATCH /v1/me", async () => {
    const session = await register(app, `push-me-${Date.now()}@gwgwgroup.com`);
    const before = await app.inject({
      method: "GET",
      url: "/v1/me",
      headers: { authorization: `Bearer ${session.token}` },
    });
    expect(before.json().user.notifyGenerationDone).toBe(true);
    expect(before.json().user.notifyQuotaLow).toBe(true);
    const patched = await app.inject({
      method: "PATCH",
      url: "/v1/me",
      headers: { authorization: `Bearer ${session.token}` },
      payload: { notifyGenerationDone: false, notifyQuotaLow: false },
    });
    expect(patched.statusCode).toBe(200);
    expect(patched.json().user.notifyGenerationDone).toBe(false);
    expect(patched.json().user.notifyQuotaLow).toBe(false);
    const again = await app.inject({
      method: "GET",
      url: "/v1/me",
      headers: { authorization: `Bearer ${session.token}` },
    });
    expect(again.json().user.notifyQuotaLow).toBe(false);
  });

  it("sends quota_low once per Hong Kong day at remaining 3", async () => {
    memory.sent.length = 0;
    const session = await register(app, `push-quota-${Date.now()}@gwgwgroup.com`);
    await app.inject({
      method: "POST",
      url: "/v1/devices",
      headers: { authorization: `Bearer ${session.token}` },
      payload: { token: ANDROID, platform: "android" },
    });
    const day = hkDayKey(new Date());
    await app.ctx.redis.set(`spring:quota:daily:${session.userId}:${day}`, String(LIMITS.freeDailyMessages - 3));
    await app.ctx.push.afterCompletedTurn({
      userId: session.userId,
      conversationId: createId(),
      left: false,
    });
    expect(memory.sent).toHaveLength(1);
    expect(memory.sent[0]?.to).toBe(ANDROID);
    expect(memory.sent[0]?.title).toBe("今日額度將盡");
    expect(memory.sent[0]?.body).toBe("今日仲剩 3 次。");
    expect(memory.sent[0]?.data).toEqual({ kind: "quota_low" });

    await app.ctx.push.afterCompletedTurn({
      userId: session.userId,
      conversationId: createId(),
      left: false,
    });
    expect(memory.sent).toHaveLength(1);
  });

  it("does not send quota_low above the threshold or when the switch is off", async () => {
    memory.sent.length = 0;
    const session = await register(app, `push-skip-${Date.now()}@gwgwgroup.com`);
    await app.inject({
      method: "POST",
      url: "/v1/devices",
      headers: { authorization: `Bearer ${session.token}` },
      payload: { token: `ExponentPushToken[skip-${session.userId.slice(0, 8)}]`, platform: "ios" },
    });
    const day = hkDayKey(new Date());
    await app.ctx.redis.set(`spring:quota:daily:${session.userId}:${day}`, String(LIMITS.freeDailyMessages - 4));
    await app.ctx.push.afterCompletedTurn({
      userId: session.userId,
      conversationId: createId(),
      left: false,
    });
    expect(memory.sent).toHaveLength(0);

    await app.ctx.redis.set(`spring:quota:daily:${session.userId}:${day}`, String(LIMITS.freeDailyMessages - 3));
    await app.inject({
      method: "PATCH",
      url: "/v1/me",
      headers: { authorization: `Bearer ${session.token}` },
      payload: { notifyQuotaLow: false },
    });
    await app.ctx.push.afterCompletedTurn({
      userId: session.userId,
      conversationId: createId(),
      left: false,
    });
    expect(memory.sent).toHaveLength(0);
  });

  it("sends quota_low to a guest at remaining 1", async () => {
    memory.sent.length = 0;
    const phone = `+8529111${String(Date.now()).slice(-4)}`;
    const requested = await app.inject({
      method: "POST",
      url: "/v1/auth/phone/request",
      payload: { phone },
    });
    expect(requested.statusCode).toBe(200);
    const verified = await app.inject({
      method: "POST",
      url: "/v1/auth/phone/verify",
      payload: { phone, code: DEV_PHONE_CODE },
    });
    expect(verified.statusCode).toBe(200);
    expect(verified.json().user.registered).toBe(false);
    const token = verified.json().accessToken as string;
    const userId = verified.json().user.id as string;
    await app.ctx.prisma.user.update({ where: { id: userId }, data: { guestUses: LIMITS.guestTrialMessages - 1 } });
    const guestToken = `ExponentPushToken[guest-${userId.slice(0, 8)}]`;
    await app.inject({
      method: "POST",
      url: "/v1/devices",
      headers: { authorization: `Bearer ${token}` },
      payload: { token: guestToken, platform: "ios" },
    });
    await app.ctx.push.afterCompletedTurn({ userId, conversationId: createId(), left: false });
    expect(memory.sent).toHaveLength(1);
    expect(memory.sent[0]?.data).toEqual({ kind: "quota_low" });
    expect(memory.sent[0]?.body).toBe("今日仲剩 1 次。");
  });

  it("clears tokens on logout all and on account delete", async () => {
    const session = await register(app, `push-out-${Date.now()}@gwgwgroup.com`);
    const token = `ExponentPushToken[out-${session.userId.slice(0, 8)}]`;
    await app.inject({
      method: "POST",
      url: "/v1/devices",
      headers: { authorization: `Bearer ${session.token}` },
      payload: { token, platform: "ios" },
    });
    const logout = await app.inject({
      method: "POST",
      url: "/v1/auth/logout",
      headers: { authorization: `Bearer ${session.token}` },
      payload: { refreshToken: session.refresh, all: true },
    });
    expect(logout.statusCode).toBe(200);
    expect(await app.ctx.prisma.deviceToken.count({ where: { userId: session.userId } })).toBe(0);

    const other = await register(app, `push-del-${Date.now()}@gwgwgroup.com`);
    const otherToken = `ExponentPushToken[del-${other.userId.slice(0, 8)}]`;
    await app.inject({
      method: "POST",
      url: "/v1/devices",
      headers: { authorization: `Bearer ${other.token}` },
      payload: { token: otherToken, platform: "android" },
    });
    const deleted = await app.inject({
      method: "DELETE",
      url: "/v1/me",
      headers: { authorization: `Bearer ${other.token}` },
    });
    expect(deleted.statusCode).toBe(200);
    expect(await app.ctx.prisma.deviceToken.count({ where: { userId: other.userId } })).toBe(0);
  });

  it("drops DeviceNotRegistered tokens", async () => {
    const session = await register(app, `push-dead-${Date.now()}@gwgwgroup.com`);
    const sender = new InvalidatingPushSender([DEAD]);
    const push = new PushService(app.ctx.prisma, app.ctx.redis, app.ctx.quota, sender);
    await push.register(session.userId, DEAD, "ios");
    const day = hkDayKey(new Date());
    await app.ctx.redis.set(`spring:quota:daily:${session.userId}:${day}`, String(LIMITS.freeDailyMessages - 2));
    await push.afterCompletedTurn({ userId: session.userId, conversationId: createId(), left: false });
    expect(sender.sent).toHaveLength(1);
    expect(await app.ctx.prisma.deviceToken.count({ where: { token: DEAD } })).toBe(0);
  });
});

import type { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ErrorCode, Locale, UserStatus, createId } from "@spring/shared";
import { buildApp } from "../src/app";
import { createContext } from "../src/context";
import { invalidateAppLimits } from "../src/modules/admin/app-limits";
import { invalidatePromptDocs } from "../src/modules/admin/prompt-docs";
import type { OpenRouterClient } from "../src/modules/catalog/infra/openrouter.client";
import { MemoryPushSender } from "../src/modules/user/push-sender";

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
  await prisma.inboxNotice.deleteMany();
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
): Promise<{ token: string; userId: string }> {
  const response = await app.inject({
    method: "POST",
    url: "/v1/auth/register",
    payload: { email, password: "spring-pass-1" },
  });
  expect(response.statusCode).toBe(201);
  const body = response.json() as { accessToken: string; user: { id: string } };
  return { token: body.accessToken, userId: body.user.id };
}

describe("admin inbox broadcast", () => {
  const memory = new MemoryPushSender();
  let app: Awaited<ReturnType<typeof buildApp>>;
  let adminToken = "";
  let withDeviceId = "";
  let withoutDeviceId = "";
  let englishId = "";
  let userToken = "";

  beforeAll(async () => {
    const ctx = await createContext({
      openrouter: unusedClient(),
      titles: { async enqueue() {} },
      push: memory,
    });
    await reset(ctx.prisma);
    app = await buildApp({ ctx });
    const admin = await register(app, `ops-inbox-${Date.now()}@gwgwgroup.com`);
    await app.ctx.prisma.user.update({ where: { id: admin.userId }, data: { role: "ADMIN" } });
    adminToken = admin.token;
    const withDevice = await register(app, `inbox-a-${Date.now()}@gwgwgroup.com`);
    withDeviceId = withDevice.userId;
    userToken = withDevice.token;
    const device = await app.inject({
      method: "POST",
      url: "/v1/devices",
      headers: { authorization: `Bearer ${withDevice.token}` },
      payload: { token: "ExponentPushToken[admin-inbox-1]", platform: "ios" },
    });
    expect(device.statusCode).toBe(200);
    const without = await register(app, `inbox-b-${Date.now()}@gwgwgroup.com`);
    withoutDeviceId = without.userId;
    const english = await register(app, `inbox-en-${Date.now()}@gwgwgroup.com`);
    englishId = english.userId;
    await app.ctx.prisma.user.update({ where: { id: englishId }, data: { locale: Locale.EN } });
    const suspended = await register(app, `inbox-s-${Date.now()}@gwgwgroup.com`);
    await app.ctx.prisma.user.update({
      where: { id: suspended.userId },
      data: { status: UserStatus.SUSPENDED },
    });
  });

  afterAll(async () => {
    if (!app) return;
    await app.close();
    await app.ctx.disconnect();
  });

  function auth() {
    return { authorization: `Bearer ${adminToken}` };
  }

  it("refuses a normal user and an empty target list", async () => {
    const forbidden = await app.inject({
      method: "POST",
      url: "/admin/inbox/send",
      headers: { authorization: `Bearer ${userToken}` },
      payload: { titleZh: "維護", bodyZh: "今晚暫停。", all: true },
    });
    expect(forbidden.statusCode).toBe(403);
    const empty = await app.inject({
      method: "POST",
      url: "/admin/inbox/send",
      headers: auth(),
      payload: { titleZh: "維護", bodyZh: "今晚暫停。" },
    });
    expect(empty.statusCode).toBe(400);
    expect(empty.json().error.code).toBe(ErrorCode.VALIDATION);
  });

  it("sends to two selected users and skips a missing id", async () => {
    memory.sent.length = 0;
    const missing = await app.inject({
      method: "POST",
      url: "/admin/inbox/send",
      headers: auth(),
      payload: { titleZh: "維護", bodyZh: "今晚暫停。", userIds: [createId()] },
    });
    expect(missing.statusCode).toBe(404);
    const sent = await app.inject({
      method: "POST",
      url: "/admin/inbox/send",
      headers: auth(),
      payload: {
        titleZh: "系統維護",
        bodyZh: "今晚十時暫停服務。",
        titleEn: "Maintenance",
        bodyEn: "Service pauses at 10pm.",
        userIds: [withDeviceId, withoutDeviceId],
      },
    });
    expect(sent.statusCode).toBe(200);
    expect(sent.json()).toEqual({ userCount: 2, delivered: 1, withoutDevice: 1 });
    expect(memory.sent).toHaveLength(1);
    expect(memory.sent[0]?.data.kind).toBe("admin");
    expect(memory.sent[0]?.title).toBe("系統維護");
    const notices = await app.ctx.prisma.inboxNotice.findMany({
      where: { kind: "admin", userId: { in: [withDeviceId, withoutDeviceId] } },
    });
    expect(notices).toHaveLength(2);
    const listed = await app.inject({
      method: "GET",
      url: "/v1/inbox",
      headers: { authorization: `Bearer ${userToken}` },
    });
    expect(listed.statusCode).toBe(200);
    expect(listed.json().items[0].kind).toBe("admin");
    expect(listed.json().items[0].title).toBe("系統維護");
  });

  it("sends to every active user and writes audit", async () => {
    memory.sent.length = 0;
    const audience = await app.inject({ method: "GET", url: "/admin/inbox/audience", headers: auth() });
    expect(audience.statusCode).toBe(200);
    expect(audience.json().count).toBe(4);
    const sent = await app.inject({
      method: "POST",
      url: "/admin/inbox/send",
      headers: auth(),
      payload: {
        titleZh: "全部通知",
        bodyZh: "請更新應用。",
        titleEn: "Everyone",
        bodyEn: "Please update the app.",
        all: true,
      },
    });
    expect(sent.statusCode).toBe(200);
    expect(sent.json().userCount).toBe(4);
    expect(sent.json().delivered).toBe(1);
    expect(sent.json().withoutDevice).toBe(3);
    const english = await app.ctx.prisma.inboxNotice.findFirst({
      where: { userId: englishId, title: "Everyone" },
      orderBy: { createdAt: "desc" },
    });
    expect(english?.body).toBe("Please update the app.");
    const audit = await app.inject({
      method: "GET",
      url: "/admin/audit?action=inbox.send",
      headers: auth(),
    });
    expect(audit.statusCode).toBe(200);
    expect(audit.json().items[0].action).toBe("inbox.send");
    expect(audit.json().items[0].payload.userCount).toBe(4);
    const both = await app.inject({
      method: "POST",
      url: "/admin/inbox/send",
      headers: auth(),
      payload: { titleZh: "錯", bodyZh: "錯", all: true, userIds: [withDeviceId] },
    });
    expect(both.statusCode).toBe(400);
  });
});

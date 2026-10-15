import type { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  ADMIN_OTP_NEED_APP,
  DEFAULT_ADMIN_PHONE,
  DEV_PHONE_CODE,
  ErrorCode,
  UserRole,
  createId,
} from "@spring/shared";
import { buildApp } from "../src/app";
import { createContext } from "../src/context";
import { invalidateAppLimits } from "../src/modules/admin/app-limits";
import { invalidatePromptDocs } from "../src/modules/admin/prompt-docs";
import type { SmsLog, SmsSender } from "../src/modules/auth/sms-sender";
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

class RecordingSms implements SmsSender {
  readonly sent: Array<{ phone: string; code: string }> = [];
  async send(phone: string, code: string, _log: SmsLog): Promise<void> {
    this.sent.push({ phone, code });
  }
}

const ADMIN_ORIGIN = "http://localhost:5173";
const DEVICE = "ExponentPushToken[admin-otp-1]";

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

describe("admin OTP via app inbox", () => {
  const sms = new RecordingSms();
  const memory = new MemoryPushSender();
  let app: Awaited<ReturnType<typeof buildApp>>;
  let accessToken = "";
  let userId = "";

  beforeAll(async () => {
    const ctx = await createContext({
      openrouter: unusedClient(),
      titles: { async enqueue() {} },
      sms,
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

  it("still sends SMS when the admin phone signs in from the app", async () => {
    const requested = await app.inject({
      method: "POST",
      url: "/v1/auth/phone/request",
      payload: { phone: DEFAULT_ADMIN_PHONE },
    });
    expect(requested.statusCode).toBe(200);
    expect(sms.sent).toHaveLength(1);
    expect(sms.sent[0]?.code).toBe(DEV_PHONE_CODE);
    const verified = await app.inject({
      method: "POST",
      url: "/v1/auth/phone/verify",
      payload: { phone: DEFAULT_ADMIN_PHONE, code: DEV_PHONE_CODE },
    });
    expect(verified.statusCode).toBe(200);
    expect(verified.json().user.role).toBe(UserRole.ADMIN);
    accessToken = verified.json().accessToken as string;
    userId = verified.json().user.id as string;
    const device = await app.inject({
      method: "POST",
      url: "/v1/devices",
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { token: DEVICE, platform: "ios" },
    });
    expect(device.statusCode).toBe(200);
  });

  it("pushes OTP to the app from the admin site and never SMSes", async () => {
    sms.sent.length = 0;
    memory.sent.length = 0;
    const requested = await app.inject({
      method: "POST",
      url: "/v1/auth/phone/request",
      headers: { origin: ADMIN_ORIGIN },
      payload: { phone: DEFAULT_ADMIN_PHONE },
    });
    expect(requested.statusCode).toBe(200);
    expect(requested.json()).toEqual({ ok: true });
    expect(JSON.stringify(requested.json())).not.toContain(DEV_PHONE_CODE);
    expect(sms.sent).toEqual([]);
    expect(memory.sent).toHaveLength(1);
    expect(memory.sent[0]?.to).toBe(DEVICE);
    expect(memory.sent[0]?.title).toBe("智泉驗證碼");
    expect(memory.sent[0]?.body).toBe("智泉驗證碼 123456，5 分鐘內有效。");
    expect(memory.sent[0]?.data.kind).toBe("otp");
    expect(memory.sent[0]?.data.code).toBe(DEV_PHONE_CODE);
    expect(memory.sent[0]?.data.noticeId).toEqual(expect.any(String));

    const inbox = await app.inject({
      method: "GET",
      url: "/v1/inbox",
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(inbox.statusCode).toBe(200);
    expect(inbox.json().unreadCount).toBe(1);
    expect(inbox.json().items).toHaveLength(1);
    expect(inbox.json().items[0].kind).toBe("otp");
    expect(inbox.json().items[0].body).toContain(DEV_PHONE_CODE);
    expect(inbox.json().items[0].expired).toBe(false);
  });

  it("masks the code after verify and still signs the admin in", async () => {
    const verified = await app.inject({
      method: "POST",
      url: "/v1/auth/phone/verify",
      payload: { phone: DEFAULT_ADMIN_PHONE, code: DEV_PHONE_CODE },
    });
    expect(verified.statusCode).toBe(200);
    accessToken = verified.json().accessToken as string;
    const inbox = await app.inject({
      method: "GET",
      url: "/v1/inbox",
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(inbox.json().items[0].body).toBe("智泉驗證碼 ••••••，5 分鐘內有效。");
    expect(inbox.json().items[0].body).not.toContain(DEV_PHONE_CODE);
    expect(inbox.json().items[0].data?.code).toBeUndefined();
    expect(inbox.json().unreadCount).toBe(0);
  });

  it("masks an expired OTP even when unread", async () => {
    sms.sent.length = 0;
    memory.sent.length = 0;
    const requested = await app.inject({
      method: "POST",
      url: "/v1/auth/phone/request",
      headers: { origin: "http://127.0.0.1:5173" },
      payload: { phone: DEFAULT_ADMIN_PHONE },
    });
    expect(requested.statusCode).toBe(200);
    expect(sms.sent).toEqual([]);
    const noticeId = memory.sent[0]?.data.noticeId as string;
    await app.ctx.prisma.inboxNotice.update({
      where: { id: noticeId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    const inbox = await app.inject({
      method: "GET",
      url: "/v1/inbox",
      headers: { authorization: `Bearer ${accessToken}` },
    });
    const item = inbox.json().items.find((row: { id: string }) => row.id === noticeId);
    expect(item?.expired).toBe(true);
    expect(item?.body).toContain("••••••");
    expect(item?.body).not.toContain(DEV_PHONE_CODE);
  });

  it("lets the owner mark a notice read", async () => {
    const listed = await app.inject({
      method: "GET",
      url: "/v1/inbox",
      headers: { authorization: `Bearer ${accessToken}` },
    });
    const id = listed.json().items[0].id as string;
    const read = await app.inject({
      method: "POST",
      url: `/v1/inbox/${id}/read`,
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(read.statusCode).toBe(200);
    expect(read.json().id).toBe(id);
    expect(read.json().readAt).toEqual(expect.any(String));
  });

  it("rejects admin-site OTP when no device is registered and does not fall back to SMS", async () => {
    sms.sent.length = 0;
    memory.sent.length = 0;
    await app.ctx.prisma.phoneCode.updateMany({
      where: { phone: DEFAULT_ADMIN_PHONE, usedAt: null },
      data: { usedAt: new Date() },
    });
    await app.inject({
      method: "DELETE",
      url: "/v1/devices",
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { token: DEVICE },
    });
    const requested = await app.inject({
      method: "POST",
      url: "/v1/auth/phone/request",
      headers: { origin: ADMIN_ORIGIN },
      payload: { phone: DEFAULT_ADMIN_PHONE },
    });
    expect(requested.statusCode).toBe(502);
    expect(requested.json().error.code).toBe(ErrorCode.UPSTREAM_UNAVAILABLE);
    expect(requested.json().error.message).toBe(ADMIN_OTP_NEED_APP);
    expect(sms.sent).toEqual([]);
    expect(memory.sent).toEqual([]);
    const verify = await app.inject({
      method: "POST",
      url: "/v1/auth/phone/verify",
      payload: { phone: DEFAULT_ADMIN_PHONE, code: DEV_PHONE_CODE },
    });
    expect(verify.statusCode).toBe(401);
  });

  it("still SMSes an ordinary user from the admin origin", async () => {
    sms.sent.length = 0;
    const phone = "+85292220001";
    const requested = await app.inject({
      method: "POST",
      url: "/v1/auth/phone/request",
      headers: { origin: ADMIN_ORIGIN },
      payload: { phone },
    });
    expect(requested.statusCode).toBe(200);
    expect(sms.sent).toEqual([{ phone, code: DEV_PHONE_CODE }]);
  });

  it("rejects inbox without a session and clears notices on delete", async () => {
    expect((await app.inject({ method: "GET", url: "/v1/inbox" })).statusCode).toBe(401);
    await app.ctx.prisma.inboxNotice.create({
      data: {
        id: createId(),
        userId,
        kind: "admin",
        title: "營運通知",
        body: "系統維護",
      },
    });
    expect(await app.ctx.prisma.inboxNotice.count({ where: { userId } })).toBeGreaterThan(0);
    const deleted = await app.inject({
      method: "DELETE",
      url: "/v1/me",
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(deleted.statusCode).toBe(200);
    expect(await app.ctx.prisma.inboxNotice.count({ where: { userId } })).toBe(0);
  });
});

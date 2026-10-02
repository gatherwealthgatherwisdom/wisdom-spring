import type { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  ErrorCode,
  EXPORT_ASSISTANT,
  EXPORT_USER,
  FEEDBACK_ONLY_ASSISTANT_COPY,
  MessageRole,
  MessageStatus,
  createId,
} from "@spring/shared";
import { buildApp } from "../src/app";
import { createContext } from "../src/context";
import { invalidateAppLimits } from "../src/modules/admin/app-limits";
import { invalidatePromptDocs } from "../src/modules/admin/prompt-docs";
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
  await prisma.asset.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.oAuthAccount.deleteMany();
  await prisma.user.deleteMany();
  await prisma.catalogEntry.deleteMany();
  await prisma.featureFlag.deleteMany();
  await prisma.appSetting.deleteMany();
  await prisma.promptDoc.deleteMany();
  invalidateAppLimits();
  invalidatePromptDocs();
}

async function register(app: Awaited<ReturnType<typeof buildApp>>, email: string): Promise<{ token: string; userId: string }> {
  const response = await app.inject({
    method: "POST",
    url: "/v1/auth/register",
    payload: { email, password: "spring-pass-1" },
  });
  expect(response.statusCode).toBe(201);
  const token = response.json().accessToken as string;
  const me = await app.inject({ method: "GET", url: "/v1/me", headers: { authorization: `Bearer ${token}` } });
  return { token, userId: me.json().user.id as string };
}

async function seedThread(
  prisma: PrismaClient,
  userId: string,
  title: string,
): Promise<{ conversationId: string; userMessageId: string; assistantId: string; supersededId: string }> {
  const conversationId = createId();
  const userMessageId = createId();
  const assistantId = createId();
  const supersededId = createId();
  await prisma.conversation.create({
    data: { id: conversationId, userId, title },
  });
  await prisma.message.createMany({
    data: [
      {
        id: userMessageId,
        conversationId,
        role: MessageRole.USER,
        status: MessageStatus.COMPLETED,
        content: "請用繁體中文講水墨同松樹。",
        createdAt: new Date("2026-01-01T00:00:01.000Z"),
      },
      {
        id: supersededId,
        conversationId,
        role: MessageRole.ASSISTANT,
        status: MessageStatus.SUPERSEDED,
        content: "舊回覆有水墨二字，不應命中。",
        requestedModel: "deepseek/deepseek-chat",
        servedModel: "deepseek/deepseek-chat",
        createdAt: new Date("2026-01-01T00:00:02.000Z"),
      },
      {
        id: assistantId,
        conversationId,
        role: MessageRole.ASSISTANT,
        status: MessageStatus.COMPLETED,
        content: "松樹常配淡墨留白。",
        imageUrl: "/v1/generated/01HTESTIMAGE00000000000001",
        requestedModel: "deepseek/deepseek-chat",
        servedModel: "deepseek/deepseek-chat",
        createdAt: new Date("2026-01-01T00:00:03.000Z"),
      },
    ],
  });
  return { conversationId, userMessageId, assistantId, supersededId };
}

describe("conversation search, feedback, export", () => {
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

  it("finds messages by body and skips superseded", async () => {
    const { token, userId } = await register(app, `search-${Date.now()}@gwgwgroup.com`);
    const { conversationId } = await seedThread(app.ctx.prisma, userId, "閒聊");
    const hit = await app.inject({
      method: "GET",
      url: `/v1/conversations/${conversationId}/messages?q=${encodeURIComponent("水墨")}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(hit.statusCode).toBe(200);
    const items = hit.json().items as { content: string; status: string }[];
    expect(items.map((row) => row.content)).toEqual(["請用繁體中文講水墨同松樹。"]);
    expect(items.every((row) => row.status === MessageStatus.COMPLETED)).toBe(true);

    const miss = await app.inject({
      method: "GET",
      url: `/v1/conversations/${conversationId}/messages?q=${encodeURIComponent("舊回覆")}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(miss.json().items).toEqual([]);
  });

  it("finds a conversation from message body in the drawer list", async () => {
    const { token, userId } = await register(app, `list-${Date.now()}@gwgwgroup.com`);
    const { conversationId } = await seedThread(app.ctx.prisma, userId, "無關鍵字標題");
    const response = await app.inject({
      method: "GET",
      url: `/v1/conversations?q=${encodeURIComponent("松樹")}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(response.statusCode).toBe(200);
    const items = response.json().items as { id: string }[];
    expect(items.map((row) => row.id)).toContain(conversationId);
  });

  it("rejects another user's conversation", async () => {
    const owner = await register(app, `owner-${Date.now()}@gwgwgroup.com`);
    const other = await register(app, `other-${Date.now()}@gwgwgroup.com`);
    const { conversationId, assistantId } = await seedThread(app.ctx.prisma, owner.userId, "別人");
    const messages = await app.inject({
      method: "GET",
      url: `/v1/conversations/${conversationId}/messages?q=松`,
      headers: { authorization: `Bearer ${other.token}` },
    });
    expect(messages.statusCode).toBe(404);
    expect(messages.json().error.code).toBe(ErrorCode.NOT_FOUND);
    const exported = await app.inject({
      method: "GET",
      url: `/v1/conversations/${conversationId}/export`,
      headers: { authorization: `Bearer ${other.token}` },
    });
    expect(exported.statusCode).toBe(404);
    const feedback = await app.inject({
      method: "POST",
      url: `/v1/messages/${assistantId}/feedback`,
      headers: { authorization: `Bearer ${other.token}` },
      payload: { rating: "up" },
    });
    expect(feedback.statusCode).toBe(404);
  });

  it("stores thumbs on completed assistant messages", async () => {
    const { token, userId } = await register(app, `rate-${Date.now()}@gwgwgroup.com`);
    const { assistantId, userMessageId } = await seedThread(app.ctx.prisma, userId, "反饋");
    const up = await app.inject({
      method: "POST",
      url: `/v1/messages/${assistantId}/feedback`,
      headers: { authorization: `Bearer ${token}` },
      payload: { rating: "up" },
    });
    expect(up.statusCode).toBe(200);
    expect(up.json().feedback).toBe("up");
    const down = await app.inject({
      method: "POST",
      url: `/v1/messages/${assistantId}/feedback`,
      headers: { authorization: `Bearer ${token}` },
      payload: { rating: "down" },
    });
    expect(down.json().feedback).toBe("down");
    const again = await app.inject({
      method: "POST",
      url: `/v1/messages/${assistantId}/feedback`,
      headers: { authorization: `Bearer ${token}` },
      payload: { rating: "down" },
    });
    expect(again.json().feedback).toBeNull();
    const userRate = await app.inject({
      method: "POST",
      url: `/v1/messages/${userMessageId}/feedback`,
      headers: { authorization: `Bearer ${token}` },
      payload: { rating: "up" },
    });
    expect(userRate.statusCode).toBe(400);
    expect(userRate.json().error.code).toBe(ErrorCode.VALIDATION);
    expect(userRate.json().error.message).toBe(FEEDBACK_ONLY_ASSISTANT_COPY);
  });

  it("exports completed turns without model names", async () => {
    const { token, userId } = await register(app, `export-${Date.now()}@gwgwgroup.com`);
    const { conversationId } = await seedThread(app.ctx.prisma, userId, "睇圖");
    const response = await app.inject({
      method: "GET",
      url: `/v1/conversations/${conversationId}/export`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(response.statusCode).toBe(200);
    const body = response.json() as { title: string; markdown: string };
    expect(body.title).toBe("睇圖");
    expect(body.markdown).toContain(`**${EXPORT_USER}**`);
    expect(body.markdown).toContain(`**${EXPORT_ASSISTANT}**`);
    expect(body.markdown).toContain("請用繁體中文講水墨同松樹。");
    expect(body.markdown).toContain("松樹常配淡墨留白。");
    expect(body.markdown).toContain("![](/v1/generated/01HTESTIMAGE00000000000001)");
    expect(body.markdown).not.toContain("舊回覆");
    expect(body.markdown).not.toMatch(/deepseek|gpt|claude|gemini/i);
  });

  it("returns a last-turn preview on the list and fetch-by-id", async () => {
    const { token, userId } = await register(app, `preview-${Date.now()}@gwgwgroup.com`);
    const { conversationId } = await seedThread(app.ctx.prisma, userId, "預覽");
    const listed = await app.inject({
      method: "GET",
      url: "/v1/conversations",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(listed.statusCode).toBe(200);
    const row = (listed.json().items as Array<{ id: string; preview: string | null; previewRole: string | null }>).find(
      (item) => item.id === conversationId,
    );
    expect(row?.preview).toBe("松樹常配淡墨留白。");
    expect(row?.previewRole).toBe(MessageRole.ASSISTANT);

    const one = await app.inject({
      method: "GET",
      url: `/v1/conversations/${conversationId}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(one.statusCode).toBe(200);
    expect(one.json().preview).toBe("松樹常配淡墨留白。");
    expect(one.json().title).toBe("預覽");
  });

  it("returns 404 for another user's conversation id", async () => {
    const owner = await register(app, `get-owner-${Date.now()}@gwgwgroup.com`);
    const other = await register(app, `get-other-${Date.now()}@gwgwgroup.com`);
    const { conversationId } = await seedThread(app.ctx.prisma, owner.userId, "別人");
    const response = await app.inject({
      method: "GET",
      url: `/v1/conversations/${conversationId}`,
      headers: { authorization: `Bearer ${other.token}` },
    });
    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe(ErrorCode.NOT_FOUND);
  });

  it("pages messages with a createdAt cursor", async () => {
    const { token, userId } = await register(app, `page-${Date.now()}@gwgwgroup.com`);
    const conversationId = createId();
    await app.ctx.prisma.conversation.create({ data: { id: conversationId, userId, title: "長對話" } });
    const first = createId();
    const second = createId();
    const third = createId();
    await app.ctx.prisma.message.createMany({
      data: [
        {
          id: first,
          conversationId,
          role: MessageRole.USER,
          status: MessageStatus.COMPLETED,
          content: "第一句",
          createdAt: new Date("2026-01-01T00:00:01.000Z"),
        },
        {
          id: second,
          conversationId,
          role: MessageRole.ASSISTANT,
          status: MessageStatus.COMPLETED,
          content: "第二句",
          createdAt: new Date("2026-01-01T00:00:02.000Z"),
        },
        {
          id: third,
          conversationId,
          role: MessageRole.USER,
          status: MessageStatus.COMPLETED,
          content: "第三句",
          createdAt: new Date("2026-01-01T00:00:03.000Z"),
        },
      ],
    });
    const page1 = await app.inject({
      method: "GET",
      url: `/v1/conversations/${conversationId}/messages?limit=2`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(page1.statusCode).toBe(200);
    const body1 = page1.json() as { items: Array<{ content: string }>; nextCursor: string | null };
    expect(body1.items.map((row) => row.content)).toEqual(["第二句", "第三句"]);
    expect(body1.nextCursor).toBeTruthy();

    const page2 = await app.inject({
      method: "GET",
      url: `/v1/conversations/${conversationId}/messages?limit=2&cursor=${encodeURIComponent(body1.nextCursor ?? "")}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(page2.statusCode).toBe(200);
    const body2 = page2.json() as { items: Array<{ content: string }>; nextCursor: string | null };
    expect(body2.items.map((row) => row.content)).toEqual(["第一句"]);
    expect(body2.nextCursor).toBeNull();
  });
});

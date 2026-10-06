import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createId, ErrorCode } from "@spring/shared";
import { expect, test } from "@playwright/test";
import { api, expectError, phoneLogin } from "../src/api";
import {
  clickLabel,
  clickText,
  loadMobileSession,
  TEST_USER_B_PHONE,
  TEST_USER_PHONE,
  visibleText,
} from "../src/helpers";
import { clearPhoneRateLimits } from "../src/rate-limit";

const TITLE = "<b>松針</b>";
const PNG = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../fixtures/look.png")).toString("base64");

test.describe.configure({ mode: "serial" });

let owner: Awaited<ReturnType<typeof phoneLogin>>;
let stranger: Awaited<ReturnType<typeof phoneLogin>>;
let conversationId: string;
let assetId: string;

test.beforeAll(async ({ request }) => {
  clearPhoneRateLimits();
  owner = await phoneLogin(request, TEST_USER_PHONE);
  stranger = await phoneLogin(request, TEST_USER_B_PHONE);
  const created = await api(request, "POST", "/v1/conversations", {
    token: owner.accessToken,
    data: { title: TITLE },
  });
  const createdText = await created.text();
  expect(created.status(), createdText).toBe(201);
  conversationId = (JSON.parse(createdText) as { id: string }).id;

  const uploaded = await api(request, "POST", "/v1/uploads", {
    token: owner.accessToken,
    data: { mime: "image/png", data: PNG },
  });
  const uploadedText = await uploaded.text();
  expect(uploaded.status(), uploadedText).toBe(201);
  assetId = (JSON.parse(uploadedText) as { id: string }).id;
});

test("a second phone cannot read or change another user's thread", async ({ request }) => {
  const token = stranger.accessToken;
  await expectError(await api(request, "GET", `/v1/conversations/${conversationId}`, { token }), 404, ErrorCode.NOT_FOUND);
  await expectError(
    await api(request, "PATCH", `/v1/conversations/${conversationId}`, { token, data: { title: "改走" } }),
    404,
    ErrorCode.NOT_FOUND,
  );
  await expectError(await api(request, "DELETE", `/v1/conversations/${conversationId}`, { token }), 404, ErrorCode.NOT_FOUND);
  await expectError(
    await api(request, "GET", `/v1/conversations/${conversationId}/messages`, { token }),
    404,
    ErrorCode.NOT_FOUND,
  );
  await expectError(
    await api(request, "GET", `/v1/conversations/${conversationId}/export`, { token }),
    404,
    ErrorCode.NOT_FOUND,
  );

  const listed = await api(request, "GET", "/v1/conversations", { token });
  const listedBody = (await listed.json()) as { items: Array<{ id: string }> };
  expect(listedBody.items.map((row) => row.id)).not.toContain(conversationId);

  const synced = await api(request, "GET", "/v1/conversations/sync", { token });
  const syncedBody = (await synced.json()) as { items: Array<{ id: string }> };
  expect(syncedBody.items.map((row) => row.id)).not.toContain(conversationId);

  const batched = await api(request, "POST", "/v1/conversations/batch", {
    token,
    data: { ids: [conversationId], delete: true },
  });
  const batchedText = await batched.text();
  expect(batched.ok(), batchedText).toBeTruthy();
  const batchedBody = JSON.parse(batchedText) as { deletedIds: string[] };
  expect(batchedBody.deletedIds).not.toContain(conversationId);

  const still = await api(request, "GET", `/v1/conversations/${conversationId}`, { token: owner.accessToken });
  expect(still.ok(), await still.text()).toBeTruthy();

  await expectError(
    await api(request, "POST", "/v1/messages", {
      token,
      data: { conversationId, content: "睇下", clientMessageId: randomUUID(), attachments: [] },
    }),
    404,
    ErrorCode.NOT_FOUND,
  );
  await expectError(
    await api(request, "POST", "/v1/messages", {
      token,
      data: { content: "呢張圖", clientMessageId: randomUUID(), attachments: [{ assetId }] },
    }),
    404,
    ErrorCode.NOT_FOUND,
  );

  const messageId = createId();
  await expectError(
    await api(request, "POST", `/v1/messages/${messageId}/feedback`, { token, data: { rating: "up" } }),
    404,
    ErrorCode.NOT_FOUND,
  );
  await expectError(await api(request, "POST", `/v1/messages/${messageId}/abort`, { token }), 404, ErrorCode.NOT_FOUND);
  await expectError(
    await api(request, "POST", `/v1/messages/${messageId}/regenerate`, { token }),
    404,
    ErrorCode.NOT_FOUND,
  );

  for (const q of ["%", "_", "'", '"']) {
    const search = await api(request, "GET", `/v1/conversations?q=${encodeURIComponent(q)}`, { token });
    expect([200, 400], await search.text()).toContain(search.status());
    expect(search.status()).not.toBe(500);
  }
});

test("the owner sees the title as text and the other phone cannot search it", async ({ page, browser, request }) => {
  await loadMobileSession(page, owner);
  await clickText(page, "對話");
  await clickLabel(page, "對話列表");
  await expect(page.getByPlaceholder("搜尋對話").filter({ visible: true })).toBeVisible();
  await expect(visibleText(page, TITLE).first()).toBeVisible({ timeout: 20_000 });

  const otherContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    baseURL: "http://127.0.0.1:8081",
  });
  const other = await otherContext.newPage();
  try {
    await loadMobileSession(other, stranger);
    await clickText(other, "對話");
    await clickLabel(other, "對話列表");
    await expect(other.getByPlaceholder("搜尋對話").filter({ visible: true })).toBeVisible();
    await other.getByPlaceholder("搜尋對話").filter({ visible: true }).fill("松針");
    await expect(other.getByText("松針")).toHaveCount(0);
    await expect(other.getByText(TITLE, { exact: true })).toHaveCount(0);
  } finally {
    await otherContext.close();
  }

  const listed = await api(request, "GET", "/v1/conversations", { token: owner.accessToken });
  const ids = ((await listed.json()) as { items: Array<{ id: string }> }).items.map((row) => row.id);
  expect(ids).toContain(conversationId);
});

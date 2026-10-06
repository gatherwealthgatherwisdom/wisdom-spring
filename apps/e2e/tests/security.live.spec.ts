import { randomUUID } from "node:crypto";
import {
  ErrorCode,
  FILE_LATER_COPY,
  IMAGE_FORMAT_COPY,
  IMAGE_TOO_LARGE_COPY,
  SYSTEM_PROMPT,
} from "@spring/shared";
import { expect, test } from "@playwright/test";
import { API, api, phoneLogin } from "../src/api";
import {
  clickLabel,
  clickText,
  KIND_BADGE,
  LIVE_SKIP_COPY,
  loadMobileSession,
  TEST_USER_PHONE,
  visibleText,
} from "../src/helpers";
import { clearPhoneRateLimits } from "../src/rate-limit";

const TEXT_PROMPT = "只回覆一個字：春";
const SYSTEM_SNIPPET = SYSTEM_PROMPT.split("\n")[0] ?? SYSTEM_PROMPT;
const LEAKS = ["sk-or-", "passwordHash", "OPENROUTER", "JWT_ACCESS", "https://openrouter.ai/api/v1", SYSTEM_SNIPPET];

test.describe.configure({ mode: "serial" });

function usedOf(body: {
  user: { registered: boolean; guestUses: number };
  quota: { dailyUsed: number };
}): number {
  return body.user.registered ? body.quota.dailyUsed : body.user.guestUses;
}

function assertNoLeaks(label: string, text: string): void {
  for (const needle of LEAKS) {
    expect(text.includes(needle), `${label} leaked ${needle}`).toBe(false);
  }
}

async function readMe(request: Parameters<typeof api>[0], token: string) {
  const response = await api(request, "GET", "/v1/me", { token });
  const text = await response.text();
  expect(response.ok(), text).toBeTruthy();
  return JSON.parse(text) as {
    user: { registered: boolean; guestUses: number; guestLimit: number; role: string; planTier: string };
    quota: { dailyUsed: number; dailyLimit: number };
  };
}

let owner: Awaited<ReturnType<typeof phoneLogin>>;

test.beforeAll(async ({ request }) => {
  clearPhoneRateLimits();
  owner = await phoneLogin(request, TEST_USER_PHONE);
});

test("uploads reject the wrong type, magic mismatch, and oversize", async ({ request }) => {
  const token = owner.accessToken;
  const plain = await api(request, "POST", "/v1/uploads", {
    token,
    data: { mime: "text/plain", data: Buffer.from("hello").toString("base64") },
  });
  const plainBody = (await plain.json()) as { error: { code: string; message: string } };
  expect(plain.status()).toBe(400);
  expect(plainBody.error.code).toBe(ErrorCode.VALIDATION);
  expect(plainBody.error.message).toBe(FILE_LATER_COPY);

  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
  const mismatch = await api(request, "POST", "/v1/uploads", {
    token,
    data: { mime: "image/png", data: jpeg.toString("base64") },
  });
  const mismatchBody = (await mismatch.json()) as { error: { code: string; message: string } };
  expect(mismatch.status()).toBe(400);
  expect(mismatchBody.error.code).toBe(ErrorCode.VALIDATION);
  expect(mismatchBody.error.message).toBe(IMAGE_FORMAT_COPY);

  const limits = (await (await api(request, "GET", "/v1/limits")).json()) as { uploadMaxBytes: number };
  const huge = Buffer.alloc(limits.uploadMaxBytes + 1, 0xff);
  huge[0] = 0xff;
  huge[1] = 0xd8;
  huge[2] = 0xff;
  const oversize = await fetch(`${API}/v1/uploads`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ mime: "image/jpeg", data: huge.toString("base64") }),
  });
  expect(oversize.status).toBe(400);
  const oversizeBody = (await oversize.json()) as { error: { code: string; message: string } };
  expect(oversizeBody.error.code).toBe(ErrorCode.VALIDATION);
  expect(oversizeBody.error.message).toBe(IMAGE_TOO_LARGE_COPY);
});

test("a live turn does not leak secrets and a replay does not add quota", async ({ request }) => {
  let me = await readMe(request, owner.accessToken);
  if (!me.user.registered && me.user.guestUses >= me.user.guestLimit) {
    const registered = await api(request, "POST", "/v1/auth/register/phone", {
      token: owner.accessToken,
      data: {},
    });
    expect(registered.ok(), await registered.text()).toBeTruthy();
    me = await readMe(request, owner.accessToken);
  }
  if (me.user.registered && me.quota.dailyUsed >= me.quota.dailyLimit) {
    test.skip(true, "quota exhausted");
  }
  if (!me.user.registered && me.user.guestUses >= me.user.guestLimit) {
    test.skip(true, "guest trial exhausted");
  }

  const before = usedOf(me);
  const clientMessageId = randomUUID();
  const sent = await request.fetch(`${API}/v1/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${owner.accessToken}`,
      "Content-Type": "application/json",
    },
    data: { content: TEXT_PROMPT, clientMessageId, attachments: [] },
    timeout: 120_000,
  });
  const stream = await sent.text();
  if (!sent.ok()) {
    if (LIVE_SKIP_COPY.some((copy) => stream.includes(copy))) test.skip(true, stream.slice(0, 200));
    if (stream.includes(ErrorCode.QUOTA_GUEST) || stream.includes(ErrorCode.QUOTA_DAILY_MESSAGE)) {
      test.skip(true, stream.slice(0, 200));
    }
    if (stream.includes(ErrorCode.UPSTREAM_RATE_LIMITED) || stream.includes(ErrorCode.MODEL_POOL_EMPTY)) {
      test.skip(true, stream.slice(0, 200));
    }
    throw new Error(`live send ${sent.status()} ${stream.slice(0, 400)}`);
  }
  if (LIVE_SKIP_COPY.some((copy) => stream.includes(copy))) test.skip(true, stream.slice(0, 200));
  expect(stream).toMatch(/智泉|春|delta|done/);
  assertNoLeaks("sse", stream);

  const after = await readMe(request, owner.accessToken);
  expect(usedOf(after)).toBeGreaterThan(before);
  assertNoLeaks("me", JSON.stringify(after));

  const replayed = await request.fetch(`${API}/v1/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${owner.accessToken}`,
      "Content-Type": "application/json",
    },
    data: { content: TEXT_PROMPT, clientMessageId, attachments: [] },
    timeout: 60_000,
  });
  const replayText = await replayed.text();
  expect(replayed.ok(), replayText).toBeTruthy();
  assertNoLeaks("replay", replayText);
  const afterReplay = await readMe(request, owner.accessToken);
  expect(usedOf(afterReplay)).toBe(usedOf(after));

  const copy = await (await api(request, "GET", "/v1/copy")).text();
  expect(copy).not.toContain("system");
  assertNoLeaks("copy", copy);

  const verify = await api(request, "POST", "/v1/auth/phone/verify", {
    data: { phone: TEST_USER_PHONE, code: "000000" },
  });
  const verifyText = await verify.text();
  expect(verifyText).not.toContain("123456");
  assertNoLeaks("verify", verifyText);
});

test("the phone UI shows a 智泉 badge and no secrets after the live turn", async ({ page }) => {
  const me = await page.request.get(`${API}/v1/me`, {
    headers: { Authorization: `Bearer ${owner.accessToken}` },
  });
  const meBody = (await me.json()) as { user: unknown };
  await loadMobileSession(page, { ...owner, user: meBody.user });
  await clickText(page, "我的");
  await expect(page.getByText(/已用 \d+／\d+/).filter({ visible: true })).toBeVisible();
  await expect(page.getByText("sk-or-")).toHaveCount(0);
  await expect(page.getByText("passwordHash")).toHaveCount(0);
  await clickText(page, "立即同步");
  await clickText(page, "對話");
  await clickLabel(page, "對話列表");
  const search = page.getByPlaceholder("搜尋對話").filter({ visible: true });
  await expect(search).toBeVisible();
  await search.fill("春");
  const hit = visibleText(page, TEXT_PROMPT).or(visibleText(page, "春")).first();
  await expect(hit).toBeVisible({ timeout: 20_000 });
  await hit.click();
  await expect(page.getByText(KIND_BADGE).filter({ visible: true })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/\bGPT\b|\bClaude\b|\bGemini\b/)).toHaveCount(0);
});

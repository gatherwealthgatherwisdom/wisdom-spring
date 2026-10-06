import { DEFAULT_ADMIN_PHONE, DEV_PHONE_CODE, ErrorCode } from "@spring/shared";
import { expect, test } from "@playwright/test";
import { api, expectError, phoneLogin } from "../src/api";
import {
  submitAdminOtp,
  TEST_LOCKOUT_PHONE,
  TEST_USER_B_PHONE,
  TEST_USER_LOCAL,
  TEST_USER_PHONE,
} from "../src/helpers";
import { clearPhoneRateLimits, clearRouteRateLimit } from "../src/rate-limit";

const ADMIN_GET = [
  "/admin/users",
  "/admin/models",
  "/admin/flags",
  "/admin/limits",
  "/admin/copy",
  "/admin/catalog",
  "/admin/usage",
  "/admin/audit",
  "/admin/announcements",
] as const;

test.beforeEach(() => {
  clearPhoneRateLimits();
});

test("foreign and landline numbers are rejected", async ({ request }) => {
  await expectError(
    await api(request, "POST", "/v1/auth/phone/request", { data: { phone: "+12025550123" } }),
    400,
    ErrorCode.VALIDATION,
  );
  await expectError(
    await api(request, "POST", "/v1/auth/phone/request", { data: { phone: "+85328123456" } }),
    400,
    ErrorCode.VALIDATION,
  );
});

test("OTP responses omit the code and lock after five wrong tries", async ({ request }) => {
  const requested = await api(request, "POST", "/v1/auth/phone/request", { data: { phone: TEST_LOCKOUT_PHONE } });
  const requestedText = await requested.text();
  expect(requested.ok(), requestedText).toBeTruthy();
  expect(requestedText).toBe(JSON.stringify({ ok: true }));
  expect(requestedText).not.toContain(DEV_PHONE_CODE);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const wrong = await api(request, "POST", "/v1/auth/phone/verify", {
      data: { phone: TEST_LOCKOUT_PHONE, code: "000000" },
    });
    const text = await wrong.text();
    expect(text).not.toContain(DEV_PHONE_CODE);
    expect(wrong.status(), text).toBe(401);
    expect(JSON.parse(text).error.code).toBe(ErrorCode.AUTH_INVALID);
  }

  const locked = await api(request, "POST", "/v1/auth/phone/verify", {
    data: { phone: TEST_LOCKOUT_PHONE, code: DEV_PHONE_CODE },
  });
  const lockedText = await locked.text();
  expect(lockedText).not.toContain(DEV_PHONE_CODE);
  expect(locked.status(), lockedText).toBe(401);
  expect(JSON.parse(lockedText).error.code).toBe(ErrorCode.AUTH_INVALID);

  const refresh = await api(request, "POST", "/v1/auth/phone/request", { data: { phone: TEST_LOCKOUT_PHONE } });
  expect(refresh.ok(), await refresh.text()).toBeTruthy();
});

test("email accounts stay USER and cannot open admin routes", async ({ request }) => {
  const email = `sec-${Date.now()}@gwgwgroup.com`;
  const registered = await api(request, "POST", "/v1/auth/register", {
    data: { email, password: "spring-pass-1" },
  });
  const registeredText = await registered.text();
  expect(registered.status(), registeredText).toBe(201);
  const session = JSON.parse(registeredText) as {
    accessToken: string;
    user: { role: string };
  };
  expect(session.user.role).toBe("USER");
  for (const path of ["/admin/users", "/admin/copy", "/admin/limits"] as const) {
    await expectError(await api(request, "GET", path, { token: session.accessToken }), 403, ErrorCode.FORBIDDEN);
  }
});

test("an ordinary phone is forbidden on every admin route", async ({ request }) => {
  const session = await phoneLogin(request, TEST_USER_PHONE);
  expect(session.user.role).toBe("USER");
  for (const path of ADMIN_GET) {
    await expectError(await api(request, "GET", path, { token: session.accessToken }), 403, ErrorCode.FORBIDDEN);
  }
  const admin = await phoneLogin(request, DEFAULT_ADMIN_PHONE);
  expect(admin.user.role).toBe("ADMIN");
  const models = await api(request, "GET", "/admin/models", { token: admin.accessToken });
  expect(models.ok(), await models.text()).toBeTruthy();
});

test("email login rate-limit returns the busy copy", async ({ request }) => {
  clearRouteRateLimit("POST/v1/auth/login");
  let last: Awaited<ReturnType<typeof api>> | undefined;
  for (let attempt = 0; attempt < 11; attempt += 1) {
    last = await api(request, "POST", "/v1/auth/login", {
      data: { email: "nobody@gwgwgroup.com", password: "wrong-password" },
    });
  }
  expect(last).toBeDefined();
  const text = await last!.text();
  expect(last!.status(), text).toBe(429);
  const body = JSON.parse(text) as { error: { code: string; message: string } };
  expect(body.error.code).toBe(ErrorCode.UPSTREAM_RATE_LIMITED);
  expect(body.error.message).toBe("系統繁忙，請稍後再試。");
});

test("refresh tokens rotate and logout revokes them", async ({ request }) => {
  const session = await phoneLogin(request, TEST_USER_PHONE);
  const rotated = await api(request, "POST", "/v1/auth/refresh", { data: { refreshToken: session.refreshToken } });
  const rotatedText = await rotated.text();
  expect(rotated.ok(), rotatedText).toBeTruthy();
  const next = JSON.parse(rotatedText) as { refreshToken: string };
  await expectError(
    await api(request, "POST", "/v1/auth/refresh", { data: { refreshToken: session.refreshToken } }),
    401,
    ErrorCode.AUTH_EXPIRED,
  );
  const logout = await api(request, "POST", "/v1/auth/logout", { data: { refreshToken: next.refreshToken } });
  expect(logout.ok(), await logout.text()).toBeTruthy();
  await expectError(
    await api(request, "POST", "/v1/auth/refresh", { data: { refreshToken: next.refreshToken } }),
    401,
    ErrorCode.AUTH_EXPIRED,
  );
});

test("a suspended user cannot use the API until restored", async ({ request }) => {
  const member = await phoneLogin(request, TEST_USER_B_PHONE);
  const admin = await phoneLogin(request, DEFAULT_ADMIN_PHONE);
  try {
    const suspended = await api(request, "PATCH", `/admin/users/${member.user.id}`, {
      token: admin.accessToken,
      data: { status: "SUSPENDED" },
    });
    expect(suspended.ok(), await suspended.text()).toBeTruthy();
    await expectError(
      await api(request, "GET", "/v1/me", { token: member.accessToken }),
      403,
      ErrorCode.USER_SUSPENDED,
    );
  } finally {
    const restored = await api(request, "PATCH", `/admin/users/${member.user.id}`, {
      token: admin.accessToken,
      data: { status: "ACTIVE" },
    });
    expect(restored.ok(), await restored.text()).toBeTruthy();
  }
  const me = await api(request, "GET", "/v1/me", { token: member.accessToken });
  expect(me.ok(), await me.text()).toBeTruthy();
});

test("an ordinary number cannot open the admin shell", async ({ page }) => {
  await page.goto("http://127.0.0.1:5173/models");
  await submitAdminOtp(page, TEST_USER_LOCAL);
  await expect(page.getByRole("alert").filter({ hasText: "沒有權限" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "模型池" })).toHaveCount(0);
});

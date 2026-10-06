import { createId, ErrorCode } from "@spring/shared";
import { expect, test } from "@playwright/test";
import { API, api, expectError, phoneLogin } from "../src/api";
import { TEST_USER_PHONE } from "../src/helpers";
import { clearPhoneRateLimits } from "../src/rate-limit";

const UNSIGNED_JWT =
  "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiIwMUFSWjNOREVLVFNWNFJGRlE2OUc1RkFWIiwicm9sZSI6IkFETUlOIn0.";

const PUBLIC_GET = [
  "/health",
  "/v1/flags",
  "/v1/limits",
  "/v1/copy",
  "/v1/announcements",
  "/v1/catalog/tools",
  "/v1/catalog/aides",
  "/v1/catalog/write",
  "/v1/catalog/styles",
  "/v1/catalog/languages",
  "/v1/catalog/discover",
] as const;

const AUTH_GET = [
  "/v1/me",
  "/v1/capabilities",
  "/v1/conversations",
  "/v1/me/usage",
  "/v1/conversations/sync",
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

const AUTH_POST = [
  "/v1/messages",
  "/v1/uploads",
  "/v1/conversations",
  "/admin/jobs/catalog-sync",
] as const;

test.describe("live API gates", () => {
  test("public surfaces are reachable without a session", async ({ request }) => {
    for (const path of PUBLIC_GET) {
      const response = await api(request, "GET", path);
      expect(response.status(), path).toBe(200);
    }

    const copy = (await (await api(request, "GET", "/v1/copy")).json()) as Record<string, unknown>;
    expect(Object.keys(copy).sort()).toEqual(["emptyHero"]);
    expect(copy).not.toHaveProperty("system");
    expect(copy).not.toHaveProperty("look");

    const write = (await (await api(request, "GET", "/v1/catalog/write")).json()) as {
      items: Array<Record<string, unknown>>;
    };
    const styles = (await (await api(request, "GET", "/v1/catalog/styles")).json()) as {
      items: Array<Record<string, unknown>>;
    };
    for (const item of [...write.items, ...styles.items]) {
      expect(item).not.toHaveProperty("instruction");
    }
  });

  test("protected routes reject a missing token", async ({ request }) => {
    for (const path of AUTH_GET) {
      await expectError(await api(request, "GET", path), 401, ErrorCode.AUTH_INVALID);
    }
    for (const path of AUTH_POST) {
      await expectError(await api(request, "POST", path, { data: {} }), 401, ErrorCode.AUTH_INVALID);
    }
  });

  test("rejected tokens stay unauthorized", async ({ request }) => {
    const headers = [
      { Authorization: "Bearer not-a-jwt" },
      { Authorization: "Bearer " },
      { Authorization: "Basic dXNlcjpwYXNz" },
      { Authorization: `Bearer ${UNSIGNED_JWT}` },
    ];
    for (const header of headers) {
      await expectError(await api(request, "GET", "/v1/me", { headers: header }), 401, ErrorCode.AUTH_INVALID);
      await expectError(await api(request, "GET", "/admin/models", { headers: header }), 401, ErrorCode.AUTH_INVALID);
    }
  });

  test("CORS allows admin and Expo origins only", async ({ request }) => {
    const allowed = ["http://127.0.0.1:5173", "http://127.0.0.1:8081"];
    for (const origin of allowed) {
      const response = await api(request, "GET", "/health", { headers: { Origin: origin } });
      expect(response.status()).toBe(200);
      expect(response.headers()["access-control-allow-origin"]).toBe(origin);
      const preflight = await api(request, "OPTIONS", "/v1/me", {
        headers: {
          Origin: origin,
          "Access-Control-Request-Method": "GET",
          "Access-Control-Request-Headers": "authorization",
        },
      });
      expect(preflight.status()).toBe(204);
      expect(preflight.headers()["access-control-allow-origin"]).toBe(origin);
    }

    const blocked = await api(request, "GET", "/health", { headers: { Origin: "https://evil.example" } });
    expect(blocked.status()).toBe(200);
    expect(blocked.headers()["access-control-allow-origin"] ?? "").not.toContain("evil.example");

    const blockedPreflight = await api(request, "OPTIONS", "/v1/me", {
      headers: {
        Origin: "https://evil.example",
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "authorization",
      },
    });
    expect(blockedPreflight.headers()["access-control-allow-origin"] ?? "").not.toContain("evil.example");
  });

  test("upload and generated ids that are not ULIDs are not found", async ({ request }) => {
    const missing = [
      "/v1/uploads/not-a-ulid",
      "/v1/generated/not-a-ulid",
      "/v1/uploads/%2e%2e%2f.env",
      `/v1/uploads/${createId()}`,
      `/v1/generated/${createId()}`,
    ];
    for (const path of missing) {
      await expectError(await api(request, "GET", path), 404, ErrorCode.NOT_FOUND);
    }
    const normalized = await request.fetch(`${API}/v1/uploads/../package.json`);
    expect(normalized.status()).toBe(404);
  });

  test("oversized JSON is rejected", async () => {
    const response = await fetch(`${API}/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: `{"email":"a@b.com","password":"${"x".repeat(1_200_000)}"}`,
    });
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error?: { code?: string } };
    expect(body.error?.code).toBe(ErrorCode.VALIDATION);
  });

  test("profile updates cannot change role or plan", async ({ request }) => {
    clearPhoneRateLimits();
    const session = await phoneLogin(request, TEST_USER_PHONE);
    expect(session.user.role).toBe("USER");
    expect(session.user.planTier).toBe("FREE");
    await expectError(
      await api(request, "PATCH", "/v1/me", {
        token: session.accessToken,
        data: { role: "ADMIN", planTier: "PLUS" },
      }),
      400,
      ErrorCode.VALIDATION,
    );
    const me = await api(request, "GET", "/v1/me", { token: session.accessToken });
    expect(me.ok()).toBeTruthy();
    const body = (await me.json()) as { user: { role: string; planTier: string } };
    expect(body.user.role).toBe("USER");
    expect(body.user.planTier).toBe("FREE");
  });
});

test("unsigned admin UI stays on the login form", async ({ page }) => {
  await page.goto("http://127.0.0.1:5173/models");
  await expect(page.getByText("ADMIN · GWGW")).toBeVisible();
  await expect(page.getByRole("button", { name: "發送驗證碼" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "模型池" })).toHaveCount(0);
});

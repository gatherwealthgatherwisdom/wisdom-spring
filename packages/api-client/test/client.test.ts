import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, SpringClient, type SessionTokens } from "../src/index";

const EXPIRED = JSON.stringify({ error: { code: "AUTH_EXPIRED", message: "登入已過期，請再登入。" } });
const SSE = "event: meta\ndata: {\"conversationId\":\"c1\",\"messageId\":\"m1\"}\n\n";

function session(access: string, refresh: string): SessionTokens {
  return { accessToken: access, refreshToken: refresh };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("SpringClient session", () => {
  const tokens = { current: session("old-access", "refresh-1") };
  let client: SpringClient;

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function makeClient() {
    client = new SpringClient(
      "http://api.test",
      () => tokens.current,
      (next) => {
        tokens.current = next;
      },
    );
  }

  it("refreshes once then retries send after a 401", async () => {
    tokens.current = session("old-access", "refresh-1");
    makeClient();
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const auth = new Headers(init?.headers).get("authorization");
      if (url.endsWith("/v1/auth/refresh")) {
        return json({
          accessToken: "new-access",
          refreshToken: "refresh-2",
          expiresIn: 900,
          user: { id: "u1" },
        });
      }
      if (url.endsWith("/v1/messages") && auth === "Bearer old-access") {
        return new Response(EXPIRED, { status: 401, headers: { "content-type": "application/json" } });
      }
      if (url.endsWith("/v1/messages") && auth === "Bearer new-access") {
        return new Response(SSE, { status: 200, headers: { "content-type": "text/event-stream" } });
      }
      throw new Error(`unexpected ${url} ${auth}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    const metas: string[] = [];
    await client.sendMessage(
      { content: "hi", attachments: [], clientMessageId: "11111111-1111-4111-8111-111111111111" },
      { onMeta: (event) => metas.push(event.conversationId) },
    );
    expect(tokens.current.accessToken).toBe("new-access");
    expect(tokens.current.refreshToken).toBe("refresh-2");
    expect(metas).toEqual(["c1"]);
    expect(fetchMock.mock.calls.filter((call) => String(call[0]).endsWith("/v1/auth/refresh"))).toHaveLength(1);
  });

  it("shares one refresh across overlapping 401s", async () => {
    tokens.current = session("old-access", "refresh-1");
    makeClient();
    let refreshes = 0;
    vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const auth = new Headers(init?.headers).get("authorization");
      if (url.endsWith("/v1/auth/refresh")) {
        refreshes += 1;
        return json({
          accessToken: "new-access",
          refreshToken: "refresh-2",
          expiresIn: 900,
          user: { id: "u1" },
        });
      }
      if (auth === "Bearer old-access") {
        return new Response(EXPIRED, { status: 401, headers: { "content-type": "application/json" } });
      }
      return json({ user: { id: "u1" }, quota: { dailyUsed: 0, dailyLimit: 20 } });
    });
    await Promise.all([client.me(), client.me()]);
    expect(refreshes).toBe(1);
    expect(tokens.current.accessToken).toBe("new-access");
  });

  it("clears tokens when refresh is rejected", async () => {
    tokens.current = session("old-access", "stale-refresh");
    makeClient();
    vi.stubGlobal("fetch", async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/v1/auth/refresh")) {
        return new Response(EXPIRED, { status: 401, headers: { "content-type": "application/json" } });
      }
      return new Response(EXPIRED, { status: 401, headers: { "content-type": "application/json" } });
    });
    await expect(client.me()).rejects.toMatchObject({ code: "AUTH_EXPIRED" });
    expect(tokens.current.accessToken).toBeNull();
    expect(tokens.current.refreshToken).toBeNull();
  });
});

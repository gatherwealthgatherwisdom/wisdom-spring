import { describe, expect, it } from "vitest";
import {
  ExpoPushSender,
  EXPO_PUSH_URL,
  LogPushSender,
  NoopPushSender,
  createPushSender,
  type PushMessage,
} from "../src/modules/user/push-sender";

const sample: PushMessage = {
  to: "ExponentPushToken[abc]",
  title: "今日額度將盡",
  body: "今日尚餘 3 次。",
  data: { kind: "quota_low" },
};

describe("createPushSender", () => {
  it("uses Noop in tests, Log in development, and Expo in production", () => {
    expect(createPushSender({ nodeEnv: "test", expoAccessToken: "tok" })).toBeInstanceOf(NoopPushSender);
    expect(createPushSender({ nodeEnv: "development", expoAccessToken: "tok" })).toBeInstanceOf(LogPushSender);
    expect(createPushSender({ nodeEnv: "production", expoAccessToken: "tok" })).toBeInstanceOf(ExpoPushSender);
    expect(createPushSender({ nodeEnv: "production", expoAccessToken: "   " })).toBeInstanceOf(ExpoPushSender);
  });
});

describe("ExpoPushSender", () => {
  it("posts to Expo and collects DeviceNotRegistered tokens", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const post: typeof fetch = async (url, init) => {
      calls.push({ url: String(url), init: init ?? {} });
      return new Response(
        JSON.stringify({
          data: [{ status: "ok" }, { status: "error", details: { error: "DeviceNotRegistered" } }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    };
    const sender = new ExpoPushSender({ expoAccessToken: "expo-secret" }, post);
    const result = await sender.send([
      sample,
      { ...sample, to: "ExponentPushToken[dead]" },
    ]);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(EXPO_PUSH_URL);
    expect(calls[0]?.init.method).toBe("POST");
    const headers = calls[0]?.init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer expo-secret");
    const body = JSON.parse(String(calls[0]?.init.body)) as Array<{
      to: string;
      channelId: string;
      sound: string;
    }>;
    expect(body[0]?.channelId).toBe("spring-default");
    expect(body[0]?.sound).toBe("default");
    expect(result.invalidTokens).toEqual(["ExponentPushToken[dead]"]);
  });

  it("omits Authorization when the access token is empty", async () => {
    const calls: Array<{ init: RequestInit }> = [];
    const post: typeof fetch = async (_url, init) => {
      calls.push({ init: init ?? {} });
      return new Response(JSON.stringify({ data: [{ status: "ok" }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };
    await new ExpoPushSender({ expoAccessToken: "" }, post).send([sample]);
    const headers = calls[0]?.init.headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });

  it("returns no invalid tokens when Expo is unreachable", async () => {
    const post: typeof fetch = async () => {
      throw new Error("connect");
    };
    const result = await new ExpoPushSender({ expoAccessToken: "tok" }, post).send([sample]);
    expect(result.invalidTokens).toEqual([]);
  });
});

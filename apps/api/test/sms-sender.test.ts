import { describe, expect, it } from "vitest";
import { AppError, ErrorCode } from "@spring/shared";
import {
  createSmsSender,
  LogSmsSender,
  TwilioSmsSender,
  type SmsLog,
} from "../src/modules/auth/sms-sender";

function capture(): { log: SmsLog; lines: Array<{ phone: string; code: string }> } {
  const lines: Array<{ phone: string; code: string }> = [];
  return {
    lines,
    log: {
      warn(obj) {
        lines.push(obj);
      },
    },
  };
}

const twilioEnv = {
  smsProviderKey: "auth-token",
  smsAccountSid: "ACaccount",
  smsFrom: "+85230000000",
};

describe("LogSmsSender", () => {
  it("prints the code outside production", async () => {
    const seen = capture();
    await new LogSmsSender({ nodeEnv: "development", smsProviderKey: "" }).send("+85291234567", "123456", seen.log);
    expect(seen.lines).toEqual([{ phone: "+85291234567", code: "123456" }]);
  });

  it("refuses to pretend a text was sent in production", async () => {
    const seen = capture();
    const sender = new LogSmsSender({ nodeEnv: "production", smsProviderKey: "vendor-key" });
    await expect(sender.send("+85291234567", "123456", seen.log)).rejects.toBeInstanceOf(AppError);
    expect(seen.lines).toEqual([]);
  });
});

describe("TwilioSmsSender", () => {
  it("posts To, From, and the verification body with Basic auth", async () => {
    const seen = capture();
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const post: typeof fetch = async (url, init) => {
      calls.push({ url: String(url), init: init ?? {} });
      return new Response("{}", { status: 201 });
    };
    await new TwilioSmsSender(twilioEnv, post).send("+85366123456", "654321", seen.log);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.twilio.com/2010-04-01/Accounts/ACaccount/Messages.json");
    const headers = new Headers(calls[0]?.init.headers);
    expect(headers.get("authorization")).toBe(`Basic ${Buffer.from("ACaccount:auth-token").toString("base64")}`);
    expect(headers.get("content-type")).toBe("application/x-www-form-urlencoded");
    const body = new URLSearchParams(String(calls[0]?.init.body));
    expect(body.get("To")).toBe("+85366123456");
    expect(body.get("From")).toBe("+85230000000");
    expect(body.get("Body")).toBe("智泉驗證碼 654321，5 分鐘內有效。");
    expect(seen.lines).toEqual([]);
  });

  it("uses MessagingServiceSid when SMS_FROM is an MG sid", async () => {
    const seen = capture();
    let encoded = "";
    const post: typeof fetch = async (_url, init) => {
      encoded = String(init?.body);
      return new Response("{}", { status: 201 });
    };
    await new TwilioSmsSender({ ...twilioEnv, smsFrom: "MGservice" }, post).send("+8613800138000", "111222", seen.log);
    const body = new URLSearchParams(encoded);
    expect(body.get("MessagingServiceSid")).toBe("MGservice");
    expect(body.get("From")).toBeNull();
  });

  it("throws without calling Twilio when credentials are missing", async () => {
    const seen = capture();
    let called = 0;
    const post: typeof fetch = async () => {
      called += 1;
      return new Response("{}", { status: 201 });
    };
    const sender = new TwilioSmsSender({ smsProviderKey: "", smsAccountSid: "", smsFrom: "" }, post);
    await expect(sender.send("+85291234567", "123456", seen.log)).rejects.toMatchObject({
      code: ErrorCode.INTERNAL,
    });
    expect(called).toBe(0);
    expect(seen.lines).toEqual([]);
  });

  it("maps Twilio errors without logging the code", async () => {
    const seen = capture();
    const post: typeof fetch = async () => new Response("denied", { status: 401 });
    await expect(new TwilioSmsSender(twilioEnv, post).send("+85291234567", "123456", seen.log)).rejects.toMatchObject({
      code: ErrorCode.UPSTREAM_UNAVAILABLE,
    });
    expect(JSON.stringify(seen.lines)).not.toContain("123456");
  });
});

describe("createSmsSender", () => {
  it("logs in development and uses Twilio in production", () => {
    expect(createSmsSender({ nodeEnv: "development", ...twilioEnv })).toBeInstanceOf(LogSmsSender);
    expect(createSmsSender({ nodeEnv: "test", ...twilioEnv })).toBeInstanceOf(LogSmsSender);
    expect(createSmsSender({ nodeEnv: "production", ...twilioEnv })).toBeInstanceOf(TwilioSmsSender);
  });
});

import { describe, expect, it } from "vitest";
import { AppError, ErrorCode } from "@spring/shared";
import {
  createSmsSender,
  LogSmsSender,
  MeteorsisSmsSender,
  toUnicode16Hex,
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

const meteorsisEnv = {
  smsUsername: "apiuser",
  smsPassword: "apipass",
  smsSenderId: "TestSMS",
};

function parseSendUrl(url: string): URLSearchParams {
  const parsed = new URL(url);
  expect(parsed.origin + parsed.pathname).toBe("https://www.meteorsis.com/misweb/f_sendsms.aspx");
  return parsed.searchParams;
}

describe("toUnicode16Hex", () => {
  it("encodes the Meteorsis Unicode-16 fixture", () => {
    expect(toUnicode16Hex("你好嗎?a")).toBe("4F60597D55CE003F0061");
  });
});

describe("LogSmsSender", () => {
  it("prints the code outside production", async () => {
    const seen = capture();
    await new LogSmsSender({ nodeEnv: "development" }).send("+85291234567", "123456", seen.log);
    expect(seen.lines).toEqual([{ phone: "+85291234567", code: "123456" }]);
  });

  it("refuses to pretend a text was sent in production", async () => {
    const seen = capture();
    const sender = new LogSmsSender({ nodeEnv: "production" });
    await expect(sender.send("+85291234567", "123456", seen.log)).rejects.toBeInstanceOf(AppError);
    expect(seen.lines).toEqual([]);
  });
});

describe("MeteorsisSmsSender", () => {
  it("GETs Unicode-16 content, recipient without +, and langeng=0", async () => {
    const seen = capture();
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const get: typeof fetch = async (url, init) => {
      calls.push({ url: String(url), init: init ?? {} });
      return new Response("SMSDID:10001", { status: 200 });
    };
    await new MeteorsisSmsSender(meteorsisEnv, get).send("+85366123456", "654321", seen.log);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.init.method).toBe("GET");
    const params = parseSendUrl(calls[0]?.url ?? "");
    expect(params.get("username")).toBe("apiuser");
    expect(params.get("password")).toBe("apipass");
    expect(params.get("langeng")).toBe("0");
    expect(params.get("recipient")).toBe("85366123456");
    expect(params.get("dos")).toBe("now");
    expect(params.get("senderid")).toBe("TestSMS");
    expect(params.get("content")).toBe(toUnicode16Hex("智泉驗證碼 654321，5 分鐘內有效。"));
    expect(seen.lines).toEqual([]);
  });

  it("strips + from Hong Kong and mainland numbers", async () => {
    const seen = capture();
    const recipients: string[] = [];
    const get: typeof fetch = async (url) => {
      recipients.push(parseSendUrl(String(url)).get("recipient") ?? "");
      return new Response("SMSDID:10002", { status: 200 });
    };
    const sender = new MeteorsisSmsSender(meteorsisEnv, get);
    await sender.send("+85291234567", "111222", seen.log);
    await sender.send("+8613800138000", "111222", seen.log);
    expect(recipients).toEqual(["85291234567", "8613800138000"]);
  });

  it("throws without calling Meteorsis when credentials are missing", async () => {
    const seen = capture();
    let called = 0;
    const get: typeof fetch = async () => {
      called += 1;
      return new Response("SMSDID:1", { status: 200 });
    };
    const sender = new MeteorsisSmsSender({ smsUsername: "", smsPassword: "", smsSenderId: "" }, get);
    await expect(sender.send("+85291234567", "123456", seen.log)).rejects.toMatchObject({
      code: ErrorCode.INTERNAL,
    });
    expect(called).toBe(0);
    expect(seen.lines).toEqual([]);
  });

  it("maps ERROR bodies on HTTP 200 without logging the code", async () => {
    const seen = capture();
    const get: typeof fetch = async () => new Response("ERROR:3", { status: 200 });
    await expect(new MeteorsisSmsSender(meteorsisEnv, get).send("+85291234567", "123456", seen.log)).rejects.toMatchObject({
      code: ErrorCode.UPSTREAM_UNAVAILABLE,
    });
    expect(JSON.stringify(seen.lines)).not.toContain("123456");
  });

  it("maps network failures without logging the code or the URL", async () => {
    const seen = capture();
    const get: typeof fetch = async () => {
      throw new Error("connect");
    };
    await expect(new MeteorsisSmsSender(meteorsisEnv, get).send("+85291234567", "123456", seen.log)).rejects.toMatchObject({
      code: ErrorCode.UPSTREAM_UNAVAILABLE,
    });
    expect(JSON.stringify(seen.lines)).not.toContain("123456");
    expect(JSON.stringify(seen.lines)).not.toContain("meteorsis");
    expect(JSON.stringify(seen.lines)).not.toContain("apipass");
  });
});

describe("createSmsSender", () => {
  it("logs in development and uses Meteorsis in production", () => {
    expect(createSmsSender({ nodeEnv: "development", ...meteorsisEnv })).toBeInstanceOf(LogSmsSender);
    expect(createSmsSender({ nodeEnv: "test", ...meteorsisEnv })).toBeInstanceOf(LogSmsSender);
    expect(createSmsSender({ nodeEnv: "production", ...meteorsisEnv })).toBeInstanceOf(MeteorsisSmsSender);
  });
});

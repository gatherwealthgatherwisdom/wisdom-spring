import { describe, expect, it } from "vitest";
import { isAllowlisted } from "../src/constants/allowlist";
import { ErrorCode } from "../src/enums/error-code";
import { messageFor } from "../src/constants/messages";
import { hkDayKey, hkMonthRange } from "../src/lib/hk-time";
import { decimalToScaled, usdPerTokenToMicrosPerMillion, usdToMicros } from "../src/lib/money";
import { SendMessageRequestSchema } from "../src/schema/message.schema";

describe("money", () => {
  it("converts USD to micros", () => {
    expect(usdToMicros(0.00014)).toBe(140n);
    expect(usdToMicros(0.5)).toBe(500_000n);
    expect(usdToMicros(20)).toBe(20_000_000n);
  });

  it("converts per-token price strings to micros per million", () => {
    expect(usdPerTokenToMicrosPerMillion("0.00000014")).toBe(140_000n);
    expect(decimalToScaled("1.5", 2)).toBe(150n);
  });
});

describe("allowlist", () => {
  it("keeps closed frontier models out of the default pool", () => {
    expect(isAllowlisted("openai/gpt-4o")).toBe(false);
    expect(isAllowlisted("openai/gpt-4o-mini")).toBe(false);
    expect(isAllowlisted("anthropic/claude-3.5-sonnet")).toBe(false);
    expect(isAllowlisted("google/gemini-2.5-flash")).toBe(false);
    expect(isAllowlisted("x-ai/grok-2")).toBe(false);
    expect(isAllowlisted("openai/gpt-oss-20b")).toBe(true);
    expect(isAllowlisted("google/gemma-2-9b-it")).toBe(true);
    expect(isAllowlisted("google/gemma-2-9b-it:free")).toBe(true);
    expect(isAllowlisted("deepseek/deepseek-chat")).toBe(true);
    expect(isAllowlisted("qwen/qwen-2.5-72b-instruct")).toBe(true);
    expect(isAllowlisted("meta-llama/llama-3.3-70b-instruct:free")).toBe(true);
  });
});

describe("Hong Kong calendar", () => {
  it("splits the day at Hong Kong midnight", () => {
    expect(hkDayKey(new Date("2026-09-23T15:59:00.000Z"))).toBe("2026-09-23");
    expect(hkDayKey(new Date("2026-09-23T16:00:00.000Z"))).toBe("2026-09-24");
  });

  it("bounds the month in Hong Kong", () => {
    const range = hkMonthRange(new Date("2026-09-23T04:00:00.000Z"));
    expect(range.start.toISOString()).toBe("2026-08-31T16:00:00.000Z");
    expect(range.end.toISOString()).toBe("2026-09-30T16:00:00.000Z");
  });
});

describe("SendMessageRequestSchema", () => {
  it("accepts a text turn and defaults attachments", () => {
    const parsed = SendMessageRequestSchema.parse({
      content: "你好",
      clientMessageId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(parsed.attachments).toEqual([]);
    expect(parsed.content).toBe("你好");
  });

  it("rejects an empty message", () => {
    const result = SendMessageRequestSchema.safeParse({
      content: "   ",
      clientMessageId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(false);
  });
});

describe("copy", () => {
  it("uses the Hong Kong quota line", () => {
    expect(messageFor(ErrorCode.QUOTA_DAILY_MESSAGE)).toBe("今日對話次數已用完。");
  });
});

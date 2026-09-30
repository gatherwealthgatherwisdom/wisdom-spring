import { describe, expect, it } from "vitest";
import { isAllowlisted } from "../src/constants/allowlist";
import { ErrorCode } from "../src/enums/error-code";
import { messageFor } from "../src/constants/messages";
import { APP_SETTING_DEFAULTS, limitsFor } from "../src/constants/limits";
import { FLAG_DEFAULTS, FeatureFlagKey, publicFlagItems } from "../src/enums/feature-flag";
import { PlanTier } from "../src/enums/plan-tier";
import { UpdateLimitsSchema } from "../src/schema/admin.schema";
import { hkDayKey, hkMonthRange, hkMonthRangeFromKey } from "../src/lib/hk-time";
import { formatE164, formatLocalDigits, normalizeHkMobile, normalizeMobile } from "../src/lib/phone";
import { decimalToScaled, microsToUsd, usdPerTokenToMicrosPerMillion, usdToMicros } from "../src/lib/money";
import { CATALOG_KINDS, SPRING_AIDES, SPRING_TOOLS, toolInstruction, usesWebSearch } from "../src/constants/catalog";
import { IMAGE_STYLES, TRANSLATE_LANGUAGES, WRITE_TEMPLATES } from "../src/constants/tools";
import { isImageMime, isPdfMime, isUploadMime } from "../src/constants/uploads";
import { SendMessageRequestSchema } from "../src/schema/message.schema";
import { createId } from "../src/lib/id";
import { searchNeedle } from "../src/lib/search";
import { conversationMarkdown, EXPORT_ASSISTANT, EXPORT_UNTITLED, EXPORT_USER } from "../src/lib/conversation-export";
import { ratingOf } from "../src/constants/feedback";
import { MessageRole } from "../src/enums/message-role";

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

  it("formats ledger micros as USD", () => {
    expect(microsToUsd(210n)).toBe("0.0002");
    expect(microsToUsd("500000")).toBe("0.5000");
    expect(microsToUsd("not-a-number")).toBe("0.0000");
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
    expect(isAllowlisted("openai/gpt-oss-20b:free")).toBe(true);
    expect(isAllowlisted("openai/gpt-oss-20b:batch")).toBe(false);
    expect(isAllowlisted("google/gemma-2-9b-it")).toBe(true);
    expect(isAllowlisted("google/gemma-2-9b-it:free")).toBe(true);
    expect(isAllowlisted("google/gemma-3-12b-it")).toBe(true);
    expect(isAllowlisted("deepseek/deepseek-chat")).toBe(true);
    expect(isAllowlisted("qwen/qwen-2.5-72b-instruct")).toBe(true);
    expect(isAllowlisted("qwen/qwen-image-3")).toBe(true);
    expect(isAllowlisted("qwen/qwen-2.5-vl-7b-instruct")).toBe(true);
    expect(isAllowlisted("qwen/qwen3.7-flash:batch")).toBe(false);
    expect(isAllowlisted("openai/gpt-image-2")).toBe(false);
    expect(isAllowlisted("google/gemini-3.1-flash-image")).toBe(false);
    expect(isAllowlisted("x-ai/grok-imagine-image-quality")).toBe(false);
    expect(isAllowlisted("meta-llama/llama-3.3-70b-instruct:free")).toBe(true);
    expect(isAllowlisted("inclusionai/ling-3.0-flash")).toBe(true);
    expect(isAllowlisted("poolside/laguna-s-2.1")).toBe(true);
    expect(isAllowlisted("thinkingmachines/inkling")).toBe(true);
    expect(isAllowlisted("thinkingmachines/inkling:free")).toBe(true);
    expect(isAllowlisted("thinkingmachines/inkling:batch")).toBe(false);
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

  it("parses a YYYY-MM key", () => {
    const range = hkMonthRangeFromKey("2026-09");
    expect(range.start.toISOString()).toBe("2026-08-31T16:00:00.000Z");
    expect(range.end.toISOString()).toBe("2026-09-30T16:00:00.000Z");
  });

  it("rejects a bad month key", () => {
    expect(() => hkMonthRangeFromKey("2026-13")).toThrow("month");
  });
});

describe("plan limits overlay", () => {
  it("keeps PLUS and INTERNAL price caps null when settings change", () => {
    expect(limitsFor(PlanTier.FREE).dailyMessages).toBe(20);
    expect(limitsFor(PlanTier.FREE, { ...APP_SETTING_DEFAULTS, freeDailyMessages: 1 }).dailyMessages).toBe(1);
    const plus = limitsFor(PlanTier.PLUS, { ...APP_SETTING_DEFAULTS, plusDailyMessages: 3, plusMonthlyUsdMicros: 2 });
    expect(plus.dailyMessages).toBe(3);
    expect(plus.monthlyUsdMicros).toBe(2n);
    expect(plus.maxPromptUsdMicrosPerMillion).toBeNull();
    expect(plus.maxCompletionUsdMicrosPerMillion).toBeNull();
    expect(limitsFor(PlanTier.INTERNAL).maxPromptUsdMicrosPerMillion).toBeNull();
  });

  it("rejects empty and out-of-range admin limit patches", () => {
    expect(UpdateLimitsSchema.safeParse({}).success).toBe(false);
    expect(UpdateLimitsSchema.safeParse({ guestTrialMessages: 101 }).success).toBe(false);
    expect(UpdateLimitsSchema.safeParse({ freeDailyMessages: 0 }).success).toBe(false);
    expect(UpdateLimitsSchema.safeParse({ uploadMaxBytes: 1024 }).success).toBe(false);
    expect(UpdateLimitsSchema.safeParse({ freeDailyMessages: 1 }).success).toBe(true);
  });
});

describe("public flags", () => {
  it("fills missing keys from defaults", () => {
    expect(publicFlagItems([])).toEqual(
      Object.values(FeatureFlagKey).map((key) => ({ key, enabled: FLAG_DEFAULTS[key] })),
    );
    expect(publicFlagItems([{ key: FeatureFlagKey.WEB_SEARCH, enabled: false }]).find((item) => item.key === FeatureFlagKey.WEB_SEARCH)).toEqual({
      key: FeatureFlagKey.WEB_SEARCH,
      enabled: false,
    });
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

  it("accepts an empty caption when a photo is attached", () => {
    const parsed = SendMessageRequestSchema.parse({
      content: "   ",
      attachments: [{ assetId: createId() }],
      clientMessageId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(parsed.content).toBe("");
    expect(parsed.attachments).toHaveLength(1);
  });
});

describe("copy", () => {
  it("uses the Hong Kong quota line", () => {
    expect(messageFor(ErrorCode.QUOTA_DAILY_MESSAGE)).toBe("今日對話次數已用完。");
    expect(messageFor(ErrorCode.QUOTA_GUEST)).toBe("試用 5 次已用完。完成註冊後可以繼續用。");
  });
});

describe("search needle", () => {
  it("trims and strips LIKE wildcards", () => {
    expect(searchNeedle("  睇圖  ")).toBe("睇圖");
    expect(searchNeedle("%foo_bar\\")).toBe("foobar");
    expect(searchNeedle("   ")).toBe("");
  });
});

describe("feedback rating", () => {
  it("only keeps up and down", () => {
    expect(ratingOf("up")).toBe("up");
    expect(ratingOf("down")).toBe("down");
    expect(ratingOf("side")).toBeNull();
    expect(ratingOf(null)).toBeNull();
  });
});

describe("conversation export", () => {
  it("writes 用戶 and 智泉 without model names", () => {
    const markdown = conversationMarkdown("睇圖", [
      { role: MessageRole.USER, content: "請睇呢張圖", attachments: [{ url: "/v1/uploads/01HTESTUPLOAD0000000000001" }] },
      {
        role: MessageRole.ASSISTANT,
        content: "見到一點綠。",
        imageUrl: "/v1/generated/01HTESTIMAGE00000000000001",
      },
    ]);
    expect(markdown.startsWith(`# 睇圖\n`)).toBe(true);
    expect(markdown).toContain(`**${EXPORT_USER}**`);
    expect(markdown).toContain(`**${EXPORT_ASSISTANT}**`);
    expect(markdown).toContain("![](/v1/uploads/01HTESTUPLOAD0000000000001)");
    expect(markdown).toContain("![](/v1/generated/01HTESTIMAGE00000000000001)");
    expect(markdown).not.toMatch(/deepseek|qwen|gpt|claude|gemini/i);
  });

  it("falls back to 新對話", () => {
    expect(conversationMarkdown(null, [])).toBe(`# ${EXPORT_UNTITLED}\n`);
  });
});

describe("tool catalog", () => {
  it("marks rewrite, search, and memo live", () => {
    expect(SPRING_TOOLS.find((item) => item.id === "rewrite")?.live).toBe(true);
    expect(SPRING_TOOLS.find((item) => item.id === "search")?.live).toBe(true);
    expect(SPRING_TOOLS.find((item) => item.id === "webchat")?.live).toBe(true);
    expect(SPRING_TOOLS.find((item) => item.id === "memo")?.live).toBe(true);
    expect(SPRING_TOOLS.find((item) => item.id === "photo")?.live).toBe(true);
    expect(SPRING_TOOLS.find((item) => item.id === "pdf")?.live).toBe(true);
    expect(SPRING_TOOLS.find((item) => item.id === "search")?.icon).toBe("search-outline");
    expect(SPRING_TOOLS.every((item) => item.page === 0 || item.page === 1 || item.page === 2)).toBe(true);
  });

  it("exposes aide instructions without claiming web results", () => {
    expect(SPRING_AIDES).toHaveLength(3);
    expect(toolInstruction("biz")).toMatch(/商務/);
    expect(toolInstruction("solve")).toMatch(/步驟/);
    expect(toolInstruction("detect")).toMatch(/唔好聲稱/);
    expect(toolInstruction("search")).toMatch(/即時網頁搜尋/);
    expect(usesWebSearch("search")).toBe(true);
    expect(usesWebSearch("webchat")).toBe(true);
    expect(usesWebSearch("rewrite")).toBe(false);
  });

  it("carries write, image, and translate catalog kinds", () => {
    expect(CATALOG_KINDS).toEqual(["tool", "aide", "write", "image", "translate"]);
    expect(WRITE_TEMPLATES.every((item) => item.blurbZh.length > 0 && item.instruction.length > 0)).toBe(true);
    expect(IMAGE_STYLES.map((item) => item.id)).toEqual(["ink", "paper", "night"]);
    expect(TRANSLATE_LANGUAGES.map((item) => item.id)).toEqual(["zh-HK", "zh-CN", "en", "ja"]);
  });

  it("accepts pdf uploads separately from images", () => {
    expect(isUploadMime("application/pdf")).toBe(true);
    expect(isPdfMime("application/pdf")).toBe(true);
    expect(isImageMime("application/pdf")).toBe(false);
    expect(isPdfMime("image/png")).toBe(false);
  });
});

describe("Hong Kong mobile numbers", () => {
  it("keeps an 8-digit mobile and accepts a +852 prefix", () => {
    expect(normalizeHkMobile("91234567")).toBe("+85291234567");
    expect(normalizeHkMobile("+852 9123 4567")).toBe("+85291234567");
    expect(normalizeHkMobile("85291234567")).toBe("+85291234567");
    expect(normalizeHkMobile("85234567")).toBe("+85285234567");
  });

  it("rejects numbers outside the Hong Kong mobile range", () => {
    expect(normalizeHkMobile("31234567")).toBeNull();
    expect(normalizeHkMobile("9123456")).toBeNull();
    expect(normalizeHkMobile("85231234567")).toBeNull();
  });
});

describe("Macau and mainland mobile numbers", () => {
  it("accepts +853 mobiles starting with 6", () => {
    expect(normalizeMobile("+853 6612 3456")).toBe("+85366123456");
    expect(normalizeMobile("85366123456")).toBe("+85366123456");
    expect(normalizeMobile("66123456", "853")).toBe("+85366123456");
  });

  it("accepts +86 mainland mobiles", () => {
    expect(normalizeMobile("+86 138 0013 8000")).toBe("+8613800138000");
    expect(normalizeMobile("13800138000")).toBe("+8613800138000");
    expect(normalizeMobile("13800138000", "86")).toBe("+8613800138000");
  });

  it("rejects landlines and short numbers for those prefixes", () => {
    expect(normalizeMobile("+853 2812 3456")).toBeNull();
    expect(normalizeMobile("66123456", "852")).toBe("+85266123456");
    expect(normalizeMobile("28123456", "853")).toBeNull();
    expect(normalizeMobile("01012345678", "86")).toBeNull();
    expect(normalizeMobile("1380013800", "86")).toBeNull();
  });

  it("formats local digits and E.164 display", () => {
    expect(formatLocalDigits("852", "91234567")).toBe("9123 4567");
    expect(formatLocalDigits("853", "66123456")).toBe("6612 3456");
    expect(formatLocalDigits("86", "13800138000")).toBe("138 0013 8000");
    expect(formatE164("+85291234567")).toBe("+852 9123 4567");
    expect(formatE164("+85366123456")).toBe("+853 6612 3456");
    expect(formatE164("+8613800138000")).toBe("+86 138 0013 8000");
  });
});

import { describe, expect, it } from "vitest";
import { isAllowlisted } from "../src/constants/allowlist";
import { ErrorCode } from "../src/enums/error-code";
import { Locale, isAppLocale, parseAppLocale } from "../src/enums/locale";
import { UserTone, parseUserTone } from "../src/enums/user-tone";
import { blurbFor, labelFor, toSimplified } from "../src/lib/zh-hans";
import { ERROR_MESSAGES, messageFor } from "../src/constants/messages";
import { APP_SETTING_DEFAULTS, LIMITS, limitsFor } from "../src/constants/limits";
import { SUGGESTED_PROMPTS_EN, SUGGESTED_PROMPTS_ZH, suggestionsFor } from "../src/constants/brand";
import { SYSTEM_PROMPT } from "../src/constants/openrouter";
import { PROMPT_DOC_DEFAULTS, mergePromptDocs } from "../src/constants/prompts";
import { FLAG_DEFAULTS, FeatureFlagKey, publicFlagItems } from "../src/enums/feature-flag";
import { PlanTier } from "../src/enums/plan-tier";
import { AdminUpdateUserSchema, CreateCatalogEntrySchema, UpdateCatalogEntrySchema, UpdateCopySchema, UpdateLimitsSchema } from "../src/schema/admin.schema";
import { hkDayKey, hkMonthRange, hkMonthRangeFromKey, hkStartDaysAgo } from "../src/lib/hk-time";
import {
  DEFAULT_ADMIN_PHONE,
  DEV_PHONE_CODE,
  formatE164,
  formatLocalDigits,
  normalizeHkMobile,
  normalizeMobile,
} from "../src/lib/phone";
import { decimalToScaled, microsToUsd, usdPerTokenToMicrosPerMillion, usdToMicros } from "../src/lib/money";
import { CATALOG_KINDS, SPRING_AIDES, SPRING_TOOLS, toolGroup, toolInstruction, toolPlaceholder, toolRequiresDraft, toolsByGroup, usesWebSearch } from "../src/constants/catalog";
import { DISCOVER_TONE_RE, SPRING_DISCOVER_CARDS, isDiscoverArtId, isDiscoverSection } from "../src/constants/discover";
import { IMAGE_STYLES, TRANSLATE_LANGUAGES, WRITE_TEMPLATES, writeTemplate } from "../src/constants/tools";
import { FILE_PROMPT, LOOK_PROMPT, isImageMime, isPdfMime, isUploadMime, mediaPromptFor } from "../src/constants/uploads";
import { RegisterDeviceRequestSchema, UpdateMeRequestSchema } from "../src/schema/auth.schema";
import {
  ADMIN_OTP_NEED_APP,
  INBOX_KINDS,
  INBOX_OTP_TTL_MS,
  isAdminSiteOrigin,
  presentInboxNotice,
} from "../src/constants/inbox";
import { expoProjectIdFromExtra, expoPushTokenRequest, PUSH_KINDS, pushCopy } from "../src/constants/push";
import { SendMessageRequestSchema } from "../src/schema/message.schema";
import { createId } from "../src/lib/id";
import { searchNeedle } from "../src/lib/search";
import { conversationMarkdown, EXPORT_ASSISTANT, EXPORT_UNTITLED, EXPORT_USER } from "../src/lib/conversation-export";
import { sanitizeThinking } from "../src/lib/thinking";
import { poolFamilyLabel, poolLabelsForAuthors } from "../src/lib/pool-label";
import { clampPoolWeight, feedbackWeightDelta, ratingOf } from "../src/constants/feedback";
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

  it("starts a Hong Kong calendar day that many days ago", () => {
    expect(hkStartDaysAgo(new Date("2026-10-05T15:59:00.000Z"), 30).toISOString()).toBe("2026-09-04T16:00:00.000Z");
    expect(hkStartDaysAgo(new Date("2026-10-05T16:00:00.000Z"), 30).toISOString()).toBe("2026-09-05T16:00:00.000Z");
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

describe("prompt docs overlay", () => {
  it("keeps defaults when rows are empty or invalid", () => {
    expect(mergePromptDocs([])).toEqual(PROMPT_DOC_DEFAULTS);
    expect(mergePromptDocs([{ key: "system", body: "  " }]).system).toBe(SYSTEM_PROMPT);
    expect(mergePromptDocs([{ key: "empty_hero", body: "not-json" }]).empty_hero).toEqual([...SUGGESTED_PROMPTS_ZH]);
    expect(mergePromptDocs([{ key: "system", body: "新身份" }]).system).toBe("新身份");
  });

  it("rejects empty and out-of-range copy patches", () => {
    expect(UpdateCopySchema.safeParse({}).success).toBe(false);
    expect(UpdateCopySchema.safeParse({ system: "" }).success).toBe(false);
    expect(UpdateCopySchema.safeParse({ emptyHero: [] }).success).toBe(false);
    expect(UpdateCopySchema.safeParse({ emptyHero: ["x".repeat(81)] }).success).toBe(false);
    expect(UpdateCopySchema.safeParse({ look: "睇下" }).success).toBe(true);
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
    expect(messageFor(ErrorCode.QUOTA_GUEST)).toBe("試用 5 次已用完。完成註冊後可以繼續使用。");
    expect(messageFor(ErrorCode.UPSTREAM_UNAVAILABLE)).toBe("智泉暫時未能回應，請稍後再試。");
    expect(messageFor(ErrorCode.UPSTREAM_UNAVAILABLE, Locale.ZH_CN)).toBe("智泉暂时未能回应，请稍后再试。");
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

  it("maps thumbs onto a one-step pool weight delta", () => {
    expect(feedbackWeightDelta(null, "up")).toBe(1);
    expect(feedbackWeightDelta("up", "down")).toBe(-2);
    expect(feedbackWeightDelta("down", null)).toBe(1);
    expect(feedbackWeightDelta("up", "up")).toBe(0);
    expect(clampPoolWeight(0)).toBe(1);
    expect(clampPoolWeight(10_001)).toBe(10_000);
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
    expect(SPRING_TOOLS.some((item) => item.id === "voice")).toBe(false);
    expect(SPRING_TOOLS.filter((item) => item.live && item.page === 0)).toHaveLength(8);
    expect(SPRING_TOOLS.find((item) => item.id === "more")?.templateId).toBe("more");
    expect(SPRING_TOOLS.find((item) => item.id === "more")?.icon).toBe("copy-outline");
    expect(SPRING_TOOLS.find((item) => item.id === "interpret")?.templateId).toBe("interpret");
    expect(writeTemplate("more")?.instruction).toMatch(/同一風格/);
    expect(SPRING_TOOLS.find((item) => item.id === "search")?.icon).toBe("search-outline");
    expect(SPRING_TOOLS.find((item) => item.id === "formal")?.icon).toBe("newspaper-outline");
    expect(SPRING_TOOLS.find((item) => item.id === "detect")?.icon).toBe("scan-outline");
    expect(SPRING_TOOLS.find((item) => item.id === "mind")?.icon).toBe("list-outline");
    expect(SPRING_TOOLS.every((item) => item.page === 0 || item.page === 1 || item.page === 2)).toBe(true);
    const live = SPRING_TOOLS.filter((item) => item.live);
    expect(new Set(live.map((item) => item.icon)).size).toBe(live.length);
    expect(toolGroup({ id: "rewrite", mode: "write" })).toBe("write");
    expect(toolGroup({ id: "solve", mode: "chat" })).toBe("chat");
    expect(toolGroup({ id: "photo", mode: "chat" })).toBe("file");
    expect(toolGroup({ id: "pdf", mode: "chat" })).toBe("file");
    expect(toolGroup({ id: "translate", mode: "translate" })).toBe("translate");
    expect(toolGroup({ id: "interpret", mode: "translate" })).toBe("translate");
    expect(toolsByGroup(live).map((section) => section.group)).toEqual(["write", "chat", "file", "translate"]);
    expect(toolPlaceholder("rewrite", "zh-HK")).toMatch(/改寫/);
    expect(toolPlaceholder("rewrite", "zh-CN")).toBe(toSimplified(toolPlaceholder("rewrite", "zh-HK") ?? ""));
    expect(toolRequiresDraft("rewrite")).toBe(true);
    expect(toolRequiresDraft("photo")).toBe(false);
    expect(toolRequiresDraft("pdf")).toBe(false);
    expect(SPRING_TOOLS.every((item) => (toolPlaceholder(item.id, "zh-HK")?.length ?? 0) > 0)).toBe(true);
    expect(SPRING_TOOLS.every((item) => (toolPlaceholder(item.id, "en")?.length ?? 0) > 0)).toBe(true);
    expect(SPRING_TOOLS.every((item) => (toolPlaceholder(item.id, "zh-CN")?.length ?? 0) > 0)).toBe(true);
  });

  it("exposes aide instructions without claiming web results", () => {
    expect(SPRING_AIDES).toHaveLength(3);
    expect(toolInstruction("biz")).toMatch(/商務/);
    expect(toolInstruction("solve")).toMatch(/步驟/);
    expect(toolInstruction("detect")).toMatch(/不要聲稱/);
    expect(toolInstruction("search")).toMatch(/即時網頁搜尋/);
    expect(usesWebSearch("search")).toBe(true);
    expect(usesWebSearch("webchat")).toBe(true);
    expect(usesWebSearch("rewrite")).toBe(false);
  });

  it("carries write, image, translate, and discover catalog kinds", () => {
    expect(CATALOG_KINDS).toEqual(["tool", "aide", "write", "image", "translate", "discover"]);
    expect(WRITE_TEMPLATES.every((item) => item.blurbZh.length > 0 && item.instruction.length > 0)).toBe(true);
    expect(IMAGE_STYLES.map((item) => item.id)).toEqual(["ink", "paper", "night"]);
    expect(TRANSLATE_LANGUAGES.map((item) => item.id)).toEqual(["zh-HK", "zh-CN", "en", "ja"]);
    expect(SPRING_DISCOVER_CARDS.filter((item) => item.section === "hero")).toHaveLength(3);
    expect(SPRING_DISCOVER_CARDS.filter((item) => item.section === "reco")).toHaveLength(12);
    expect(SPRING_DISCOVER_CARDS.filter((item) => item.section === "draw")).toHaveLength(2);
    expect(
      SPRING_DISCOVER_CARDS.every(
        (item) => isDiscoverSection(item.section) && isDiscoverArtId(item.art) && DISCOVER_TONE_RE.test(item.tone),
      ),
    ).toBe(true);
    expect(
      CreateCatalogEntrySchema.safeParse({
        kind: "discover",
        id: "x",
        zh: "甲",
        en: "A",
        blurbZh: "甲",
        blurbEn: "A",
      }).success,
    ).toBe(false);
    expect(
      CreateCatalogEntrySchema.safeParse({
        kind: "discover",
        id: "x",
        zh: "甲",
        en: "A",
        blurbZh: "甲",
        blurbEn: "A",
        section: "reco",
        tone: "#1F6B4A",
        art: "recoWrite",
      }).success,
    ).toBe(true);
    expect(UpdateCatalogEntrySchema.safeParse({ art: "not-an-art" }).success).toBe(false);
    expect(UpdateCatalogEntrySchema.safeParse({ section: "banner" }).success).toBe(false);
    expect(UpdateCatalogEntrySchema.safeParse({ tone: "pine" }).success).toBe(false);
    expect(UpdateCatalogEntrySchema.safeParse({ section: "hero" }).success).toBe(true);
  });

  it("accepts a per-user bonus daily quota patch", () => {
    expect(AdminUpdateUserSchema.safeParse({ bonusDailyMessages: 1 }).success).toBe(true);
    expect(AdminUpdateUserSchema.safeParse({ bonusDailyMessages: 0 }).success).toBe(true);
    expect(AdminUpdateUserSchema.safeParse({ bonusDailyMessages: -1 }).success).toBe(false);
    expect(AdminUpdateUserSchema.safeParse({ bonusDailyMessages: 10_001 }).success).toBe(false);
    expect(AdminUpdateUserSchema.safeParse({}).success).toBe(false);
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

  it("keeps the default admin on a Hong Kong mobile", () => {
    expect(DEFAULT_ADMIN_PHONE).toBe("+85292578982");
    expect(normalizeMobile(DEFAULT_ADMIN_PHONE)).toBe(DEFAULT_ADMIN_PHONE);
    expect(DEV_PHONE_CODE).toBe("123456");
  });
});

describe("push copy and device schemas", () => {
  it("uses Hong Kong copy and quota thresholds", () => {
    expect(pushCopy("zh-HK").generationDoneTitle).toBe("智泉已經回覆");
    expect(pushCopy("zh-HK").quotaLowTitle).toBe("今日額度將盡");
    expect(pushCopy("zh-HK").quotaLowBody(3)).toBe("今日尚餘 3 次。");
    expect(pushCopy("zh-HK").otpTitle).toBe("智泉驗證碼");
    expect(pushCopy("zh-HK").otpBody("123456")).toBe("智泉驗證碼 123456，5 分鐘內有效。");
    expect(pushCopy("zh-HK").quotaExhaustedTitle).toBe("今日對話次數已用完");
    expect(pushCopy("zh-HK").monthlyCostTitle).toBe("本月用量將盡");
    expect(pushCopy("zh-CN").generationDoneBody).toBe("打开对话查看回复。");
    expect(pushCopy("zh-CN").quotaLowBody(3)).toBe("今日尚余 3 次。");
    expect(pushCopy("zh-CN").otpTitle).toBe("智泉验证码");
    expect(pushCopy("en").generationDoneTitle).toBe("Wisdom Spring replied");
    expect(PUSH_KINDS).toEqual(INBOX_KINDS);
    expect(INBOX_KINDS).toContain("otp");
    expect(INBOX_OTP_TTL_MS).toBe(5 * 60 * 1000);
    expect(ADMIN_OTP_NEED_APP).toBe("請先在手機開啟智泉並允許通知。");
    expect(expoProjectIdFromExtra({ eas: { projectId: "2a019e7f-aa6c-44ca-b5d9-da5049cbc2e9" } })).toBe(
      "2a019e7f-aa6c-44ca-b5d9-da5049cbc2e9",
    );
    expect(expoPushTokenRequest("2a019e7f-aa6c-44ca-b5d9-da5049cbc2e9")).toEqual({
      projectId: "2a019e7f-aa6c-44ca-b5d9-da5049cbc2e9",
    });
    expect(expoProjectIdFromExtra({})).toBeUndefined();
    expect(expoPushTokenRequest(undefined)).toBeUndefined();
    expect(LIMITS.notifyQuotaRemaining).toBe(3);
    expect(LIMITS.notifyGuestRemaining).toBe(1);
  });

  it("accepts Expo push tokens and notify patches", () => {
    expect(
      RegisterDeviceRequestSchema.parse({
        token: "ExponentPushToken[AbC_12-3]",
        platform: "ios",
      }).platform,
    ).toBe("ios");
    expect(
      RegisterDeviceRequestSchema.parse({
        token: "ExpoPushToken[xyz.token-1]",
        platform: "android",
      }).token,
    ).toBe("ExpoPushToken[xyz.token-1]");
    expect(RegisterDeviceRequestSchema.safeParse({ token: "fcm:abc", platform: "ios" }).success).toBe(false);
    expect(UpdateMeRequestSchema.parse({ notifyQuotaLow: false }).notifyQuotaLow).toBe(false);
    expect(UpdateMeRequestSchema.parse({ notifyGenerationDone: true }).notifyGenerationDone).toBe(true);
    expect(UpdateMeRequestSchema.parse({ locale: Locale.ZH_CN }).locale).toBe("zh-CN");
    expect(UpdateMeRequestSchema.parse({ displayName: "阿泉" }).displayName).toBe("阿泉");
    expect(UpdateMeRequestSchema.parse({ displayName: "" }).displayName).toBe("");
    expect(UpdateMeRequestSchema.parse({ displayName: null }).displayName).toBeNull();
    expect(UpdateMeRequestSchema.parse({ tone: UserTone.DETAILED }).tone).toBe("detailed");
    expect(UpdateMeRequestSchema.safeParse({ tone: "loud" }).success).toBe(false);
    expect(UpdateMeRequestSchema.safeParse({}).success).toBe(false);
  });

  it("treats the admin site origin as the app OTP channel", () => {
    expect(isAdminSiteOrigin("http://localhost:5173", "http://localhost:5173")).toBe(true);
    expect(isAdminSiteOrigin("http://127.0.0.1:5173/", "https://admin.gwgwgroup.com")).toBe(true);
    expect(isAdminSiteOrigin("http://localhost:8081", "http://localhost:5173")).toBe(false);
    expect(isAdminSiteOrigin(undefined, "http://localhost:5173")).toBe(false);
  });

  it("masks OTP digits after expiry or read", () => {
    const now = new Date("2026-10-15T04:00:00.000Z");
    const row = {
      id: "01NOTICEOTP000000000000001",
      kind: "otp",
      title: "智泉驗證碼",
      body: "智泉驗證碼 123456，5 分鐘內有效。",
      data: { kind: "otp", code: "123456" },
      createdAt: now,
      readAt: null,
      expiresAt: new Date(now.getTime() + INBOX_OTP_TTL_MS),
    };
    const live = presentInboxNotice(row, now);
    expect(live.body).toContain("123456");
    expect(live.data).toEqual({ kind: "otp", code: "123456" });
    expect(live.expired).toBe(false);
    const expired = presentInboxNotice(row, new Date(now.getTime() + INBOX_OTP_TTL_MS + 1));
    expect(expired.body).toBe("智泉驗證碼 ••••••，5 分鐘內有效。");
    expect(expired.data).toEqual({ kind: "otp" });
    expect(expired.expired).toBe(true);
    const read = presentInboxNotice({ ...row, readAt: now }, now);
    expect(read.body).toContain("••••••");
    expect(read.body).not.toContain("123456");
  });
});

describe("user tone", () => {
  it("defaults unknown values to concise", () => {
    expect(parseUserTone(undefined)).toBe(UserTone.CONCISE);
    expect(parseUserTone("detailed")).toBe(UserTone.DETAILED);
    expect(parseUserTone("cantonese")).toBe(UserTone.CANTONESE);
    expect(parseUserTone("loud")).toBe(UserTone.CONCISE);
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

describe("pool family labels", () => {
  it("names authors without slugs", () => {
    expect(poolFamilyLabel("deepseek")).toEqual({ zh: "智泉 · DeepSeek", en: "Wisdom Spring · DeepSeek" });
    expect(poolFamilyLabel("google")).toEqual({ zh: "智泉 · Gemma", en: "Wisdom Spring · Gemma" });
    expect(poolLabelsForAuthors(["qwen", "deepseek", "qwen"]).map((item) => item.zh)).toEqual([
      "智泉 · DeepSeek",
      "智泉 · Qwen",
    ]);
  });
});

describe("sanitizeThinking", () => {
  it("drops identity restatement and keeps the rest", () => {
    expect(
      sanitizeThinking("先拆題。我的角色：『智泉』(中盈紫達集團)嘅助手。然後逐步計。"),
    ).toBe("先拆題。然後逐步計。");
    expect(sanitizeThinking("Gather Wealth Gather Wisdom Group identity.")).toBe("");
    expect(sanitizeThinking("比較兩個方案。")).toBe("比較兩個方案。");
    expect(
      sanitizeThinking("1. 分析。\n    *   **你係「智泉」**，跟住系統人設行。\n2. 答一句。"),
    ).toBe("1. 分析。\n\n2. 答一句。");
    expect(sanitizeThinking("你好。我是中盈紫達集團的智泉。有什麼可以幫忙？")).toBe(
      "你好。有什麼可以幫忙？",
    );
  });
});

describe("app locales", () => {
  it("parses Traditional, Simplified, and English", () => {
    expect(parseAppLocale("zh-HK")).toBe(Locale.ZH_HK);
    expect(parseAppLocale("zh-CN")).toBe(Locale.ZH_CN);
    expect(parseAppLocale("en")).toBe(Locale.EN);
    expect(parseAppLocale("fr")).toBe(Locale.ZH_HK);
    expect(isAppLocale("zh-CN")).toBe(true);
    expect(isAppLocale("ja")).toBe(false);
  });

  it("converts glyphs without rewriting Hong Kong vocabulary", () => {
    expect(toSimplified("網絡軟件裏的資訊電郵相簿")).toBe("网络软件里的资讯电邮相簿");
    expect(toSimplified("軟件")).toBe("软件");
    expect(toSimplified("資訊")).toBe("资讯");
    expect(toSimplified("資訊")).not.toContain("信息");
    expect(labelFor({ zh: "軟件", en: "Software" }, "en")).toBe("Software");
    expect(labelFor({ zh: "軟件", en: "Software" }, "zh-HK")).toBe("軟件");
    expect(labelFor({ zh: "軟件", en: "Software" }, "zh-CN")).toBe("软件");
    expect(blurbFor({ blurbZh: "看圖", blurbEn: "Look" }, "zh-CN")).toBe("看图");
    expect(SPRING_TOOLS.find((item) => item.id === "photo")?.zh).toBe("看圖");
    expect(toolPlaceholder("rewrite", "zh-HK")).toBe("貼上你想改寫的句子");
    expect(toolPlaceholder("email", "zh-CN")).toBe("这封电邮想说甚么？");
    expect(SYSTEM_PROMPT).toMatch(/香港書面語/);
    expect(SYSTEM_PROMPT).toMatch(/問候或閒聊不要提及公司名/);
    expect(SYSTEM_PROMPT).not.toMatch(/嘅智能助手/);
    expect(writeTemplate("cantonese")?.instruction).toMatch(/廣東話口語/);
    expect(suggestionsFor([...SUGGESTED_PROMPTS_ZH], "en")).toEqual([...SUGGESTED_PROMPTS_EN]);
    expect(suggestionsFor([...SUGGESTED_PROMPTS_ZH], "zh-CN")[1]).toBe("帮我写一封礼貌的商务跟进电邮。");
    expect(mediaPromptFor("look", "zh-CN", LOOK_PROMPT)).toBe(toSimplified(LOOK_PROMPT));
    expect(mediaPromptFor("file", "en", FILE_PROMPT)).toMatch(/summarise/);
    expect(messageFor(ErrorCode.AUTH_EXPIRED, Locale.ZH_CN)).toBe(toSimplified(messageFor(ErrorCode.AUTH_EXPIRED)));
    expect(Object.values(ERROR_MESSAGES[Locale.ZH_HK]).join("\n")).not.toMatch(/[嘅咗唔冇]/);
    for (const tool of SPRING_TOOLS) {
      expect(tool.blurbZh, tool.id).not.toMatch(/[嘅咗唔冇]/);
    }
    for (const card of SPRING_DISCOVER_CARDS) {
      expect(card.blurbZh, card.id).not.toMatch(/示範/);
      expect(card.blurbEn, card.id).not.toMatch(/sample/i);
    }
  });
});

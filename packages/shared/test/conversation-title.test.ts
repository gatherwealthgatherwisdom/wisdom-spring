import { describe, expect, it } from "vitest";
import { FILE_TITLE, LOOK_TITLE } from "../src/constants/uploads";
import { conversationLabel, conversationTitleFrom } from "../src/lib/conversation-title";

describe("conversationTitleFrom", () => {
  it("collapses whitespace and caps at 20 characters", () => {
    expect(conversationTitleFrom("幫我列一個健康作息清單。")).toBe("幫我列一個健康作息清單。");
    expect(conversationTitleFrom("  松樹   常配  淡墨留白與遠山  ")).toBe("松樹 常配 淡墨留白與遠山");
    expect(conversationTitleFrom("abcdefghijklmnopqrstuvwxyz")).toBe("abcdefghijklmnopqrst");
  });

  it("uses 睇圖 or 文件 when the first turn has no text", () => {
    expect(conversationTitleFrom("", { hasImage: true })).toBe(LOOK_TITLE);
    expect(conversationTitleFrom("   ", { hasPdf: true })).toBe(FILE_TITLE);
    expect(conversationTitleFrom("", { hasImage: true, hasPdf: true })).toBe(FILE_TITLE);
    expect(conversationTitleFrom("")).toBe("");
  });
});

describe("conversationLabel", () => {
  it("prefers title, then preview, then the fallback", () => {
    expect(conversationLabel({ title: "作息", preview: "以下係" }, "新對話")).toBe("作息");
    expect(conversationLabel({ title: "  ", preview: "以下係一個簡單" }, "新對話")).toBe("以下係一個簡單");
    expect(conversationLabel({ title: null, preview: null }, "新對話")).toBe("新對話");
  });
});

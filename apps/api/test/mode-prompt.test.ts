import { describe, expect, it } from "vitest";
import { SYSTEM_PROMPT } from "@spring/shared";
import { systemPromptFor, type ConversationModeFields } from "../src/modules/chat/application/mode-prompt";

const chat: ConversationModeFields = {
  mode: "chat",
  templateId: null,
  sourceLang: null,
  targetLang: null,
  imageStyle: null,
};

describe("systemPromptFor", () => {
  it("puts the translate task before 智泉 identity so small pool models do not chat", () => {
    const prompt = systemPromptFor(
      { ...chat, mode: "translate", sourceLang: "en", targetLang: "zh-HK" },
      "meta-llama/llama-3.2-1b-instruct",
    );
    expect(prompt.startsWith("你現在只負責翻譯。來源語言：en。目標語言：zh-HK。")).toBe(true);
    expect(prompt).toContain("只輸出譯文，不要加解釋、標題、引號或前後對白。");
    expect(prompt.indexOf("你現在只負責翻譯")).toBeLessThan(prompt.indexOf("你是「智泉」"));
    expect(prompt).toContain(SYSTEM_PROMPT);
    expect(prompt).toContain("今輪請求模型：meta-llama/llama-3.2-1b-instruct");
    expect(prompt).not.toContain("預設以香港書面語、繁體中文作答");
  });

  it("keeps interpret as spoken lines and still places identity after the task", () => {
    const prompt = systemPromptFor(
      { ...chat, mode: "translate", templateId: "interpret", sourceLang: "zh-HK", targetLang: "en" },
      "qwen/qwen3-30b-a3b",
    );
    expect(prompt.startsWith("你現在只負責翻譯。來源語言：zh-HK。目標語言：en。用口語短句自然對譯，保留語氣。")).toBe(
      true,
    );
    expect(prompt.indexOf("你現在只負責翻譯")).toBeLessThan(prompt.indexOf("你是「智泉」"));
  });

  it("places extra catalog copy after the translate task", () => {
    const prompt = systemPromptFor(
      { ...chat, mode: "translate", sourceLang: "auto", targetLang: "en" },
      "google/gemma-3-4b-it",
      "保留專有名詞。",
    );
    expect(prompt.startsWith("你現在只負責翻譯。")).toBe(true);
    expect(prompt.indexOf("保留專有名詞。")).toBeGreaterThan(prompt.indexOf("你現在只負責翻譯"));
    expect(prompt.indexOf("保留專有名詞。")).toBeLessThan(prompt.indexOf("你是「智泉」"));
  });

  it("still prepends identity for write extras", () => {
    const prompt = systemPromptFor(
      { ...chat, mode: "write", templateId: "rewrite" },
      "qwen/qwen3-30b-a3b",
      "改寫用戶的文字，保留原意，句子更清楚。",
    );
    expect(prompt.startsWith("你是「智泉」")).toBe(true);
    expect(prompt).toContain("改寫用戶的文字，保留原意，句子更清楚。");
    expect(prompt).toContain("預設以香港書面語、繁體中文作答。");
  });

  it("asks for Simplified written Chinese when the locale is zh-CN", () => {
    const prompt = systemPromptFor(chat, "qwen/qwen3-30b-a3b", undefined, undefined, SYSTEM_PROMPT, "zh-CN");
    expect(prompt).toContain("預設以香港書面語、簡體中文作答。");
    expect(prompt).not.toContain("預設以香港書面語、繁體中文作答。");
  });

  it("asks for English when the locale is en", () => {
    const prompt = systemPromptFor(chat, "qwen/qwen3-30b-a3b", undefined, undefined, SYSTEM_PROMPT, "en");
    expect(prompt).toContain("Reply in English.");
  });

  it("keeps the Cantonese writing tool in spoken Cantonese", () => {
    const prompt = systemPromptFor(
      { ...chat, mode: "write", templateId: "cantonese" },
      "qwen/qwen3-30b-a3b",
      undefined,
      undefined,
      SYSTEM_PROMPT,
      "zh-HK",
    );
    expect(prompt).toContain("用香港廣東話口語作答，不要改用書面語。");
    expect(prompt).toContain("用香港廣東話口語撰寫");
    expect(prompt).not.toContain("預設以香港書面語、繁體中文作答。");
  });
});

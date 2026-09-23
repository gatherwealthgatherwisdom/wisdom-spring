import { describe, expect, it } from "vitest";
import { EstimatedContextWindow } from "../src/context-window";
import type { ChatTurn } from "../src/chat-turn";

const window = new EstimatedContextWindow();

describe("EstimatedContextWindow", () => {
  it("keeps the system prompt and the newest turns that fit", () => {
    const messages: ChatTurn[] = [
      { role: "system", content: "sys" },
      { role: "user", content: "older question that should drop" },
      { role: "assistant", content: "older answer" },
      { role: "user", content: "latest" },
    ];
    const trimmed = window.trim(messages, 12, 6);
    expect(trimmed[0]?.role).toBe("system");
    expect(trimmed.at(-1)?.content).toBe("latest");
    expect(trimmed.some((message) => message.content.startsWith("older question"))).toBe(false);
  });

  it("truncates a newest user message that alone exceeds the budget", () => {
    const messages: ChatTurn[] = [
      { role: "system", content: "s" },
      { role: "user", content: "一二三四五六七八九十" },
    ];
    const trimmed = window.trim(messages, 4, 2);
    const user = trimmed.find((message) => message.role === "user");
    expect(user?.content.length).toBeLessThan(10);
    expect(user?.content.startsWith("一")).toBe(true);
  });
});

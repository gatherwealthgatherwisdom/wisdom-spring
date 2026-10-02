import { describe, expect, it } from "vitest";
import { MessageRole } from "@spring/shared";
import { previewFromMessage } from "../src/modules/chat/application/conversation-view";

describe("previewFromMessage", () => {
  it("collapses whitespace and caps at 80 characters", () => {
    const preview = previewFromMessage({
      content: "  松樹\n常配  淡墨  ",
      imageUrl: null,
      role: MessageRole.ASSISTANT,
    });
    expect(preview).toEqual({ preview: "松樹 常配 淡墨", previewRole: MessageRole.ASSISTANT });
    const long = previewFromMessage({
      content: "墨".repeat(90),
      imageUrl: null,
      role: MessageRole.USER,
    });
    expect(long.preview).toHaveLength(80);
    expect(long.previewRole).toBe(MessageRole.USER);
  });

  it("uses 圖像 when the last turn is a picture without text", () => {
    expect(
      previewFromMessage({
        content: "   ",
        imageUrl: "/v1/generated/01HTESTIMAGE00000000000001",
        role: MessageRole.ASSISTANT,
      }),
    ).toEqual({ preview: "圖像", previewRole: MessageRole.ASSISTANT });
  });

  it("returns empty preview when there is no completed turn", () => {
    expect(previewFromMessage(null)).toEqual({ preview: null, previewRole: null });
  });
});

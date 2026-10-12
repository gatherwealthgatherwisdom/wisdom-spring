import { describe, expect, it } from "vitest";
import { parseAssistantMarkdown, parseInline } from "../src/lib/assistant-markdown";

describe("parseInline", () => {
  it("wraps **bold** and leaves unclosed markers as text", () => {
    expect(parseInline("先 **水分攝取** 再喝")).toEqual([
      { type: "text", text: "先 " },
      { type: "bold", children: [{ type: "text", text: "水分攝取" }] },
      { type: "text", text: " 再喝" },
    ]);
    expect(parseInline("未完 **水分")).toEqual([{ type: "text", text: "未完 **水分" }]);
  });

  it("keeps inline code literal", () => {
    expect(parseInline("用 `**` 包住")).toEqual([
      { type: "text", text: "用 " },
      { type: "code", text: "**" },
      { type: "text", text: " 包住" },
    ]);
  });
});

describe("parseAssistantMarkdown", () => {
  it("renders a GFM table, a heading, and a list", () => {
    const blocks = parseAssistantMarkdown(
      ["|時間|活動|", "|---|---|", "|7:00|起床|", "", "**水分攝取**", "", "- 白開水", "- 茶"].join("\n"),
    );
    expect(blocks[0]).toMatchObject({ type: "table" });
    if (blocks[0]?.type !== "table") throw new Error("expected table");
    expect(blocks[0].header).toHaveLength(2);
    expect(blocks[0].rows).toHaveLength(1);
    expect(blocks[0].rows[0]?.[1]).toEqual([{ type: "text", text: "起床" }]);
    expect(blocks[1]).toEqual({
      type: "paragraph",
      children: [{ type: "bold", children: [{ type: "text", text: "水分攝取" }] }],
    });
    expect(blocks[2]).toMatchObject({ type: "list", ordered: false });
    if (blocks[2]?.type !== "list") throw new Error("expected list");
    expect(blocks[2].items).toHaveLength(2);
  });

  it("keeps fenced code unparsed", () => {
    const blocks = parseAssistantMarkdown("```\n**not bold**\n|a|b|\n```");
    expect(blocks).toEqual([{ type: "code", text: "**not bold**\n|a|b|" }]);
  });
});

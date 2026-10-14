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

  it("treats consecutive pipe rows as a table without a separator", () => {
    const blocks = parseAssistantMarkdown("|Day|Activity|\n| **Day 1** |Wake|\n|Day 2|Run|");
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({ type: "table" });
    if (blocks[0]?.type !== "table") throw new Error("expected table");
    expect(blocks[0].header).toHaveLength(2);
    expect(blocks[0].rows).toHaveLength(2);
    expect(blocks[0].rows[0]?.[0]).toEqual([{ type: "bold", children: [{ type: "text", text: "Day 1" }] }]);
    expect(blocks[0].rows[1]?.[1]).toEqual([{ type: "text", text: "Run" }]);
  });

  it("turns <br> between pipe rows into a table", () => {
    const blocks = parseAssistantMarkdown("|時間|活動|<br>|7:00|起床|<br/>|22:00|睡覺|");
    expect(blocks[0]).toMatchObject({ type: "table" });
    if (blocks[0]?.type !== "table") throw new Error("expected table");
    expect(blocks[0].rows).toHaveLength(2);
    expect(blocks[0].rows[1]?.[0]).toEqual([{ type: "text", text: "22:00" }]);
  });

  it("stitches a cell split across a <br> back into one row", () => {
    const blocks = parseAssistantMarkdown("|Day|Note|\n|1|Wake<br>stretch |");
    expect(blocks[0]).toMatchObject({ type: "table" });
    if (blocks[0]?.type !== "table") throw new Error("expected table");
    expect(blocks[0].rows).toHaveLength(1);
    expect(blocks[0].rows[0]?.[1]).toEqual([{ type: "text", text: "Wake stretch" }]);
  });
});

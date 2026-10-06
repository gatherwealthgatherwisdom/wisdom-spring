import { describe, expect, it } from "vitest";
import { createSseParser } from "../src/sse";

describe("createSseParser", () => {
  it("reads meta, delta, and done across chunk boundaries", () => {
    const events: Array<[string, string]> = [];
    const parser = createSseParser((event, data) => events.push([event, data]));
    parser.push("event: meta\ndata: {\"messageId\":\"01H\"");
    parser.push("}\n\nevent: thinking\ndata: {\"text\":\"想\"}\n\n");
    parser.push("event: delta\ndata: {\"text\":\"你\"}\n\n");
    parser.push("event: done\ndata: {\"servedModel\":\"qwen/x\"}\n\n");
    parser.end();
    expect(events.map(([event]) => event)).toEqual(["meta", "thinking", "delta", "done"]);
    expect(events[1]?.[1]).toContain("想");
    expect(events[2]?.[1]).toContain("你");
  });
});

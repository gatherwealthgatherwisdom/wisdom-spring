import { describe, expect, it } from "vitest";
import { ErrorCode } from "@spring/shared";
import {
  classifyUpstream,
  parseOpenRouterSse,
  shouldRetryWithNewSlug,
} from "../src/modules/catalog/infra/openrouter-stream.parser";

async function* chunks(parts: string[]): AsyncGenerator<string> {
  for (const part of parts) yield part;
}

async function collect(parts: string[]) {
  const events = [];
  for await (const event of parseOpenRouterSse(chunks(parts))) events.push(event);
  return events;
}

describe("parseOpenRouterSse", () => {
  it("maps reasoning into thinking and keeps it out of the answer delta", async () => {
    const events = await collect([
      'data: {"choices":[{"delta":{"reasoning":"先拆題。"}}]}\n\n',
      'data: {"choices":[{"delta":{"reasoning_details":[{"type":"reasoning.text","text":"再答。"}]}}]}\n\n',
      'data: {"choices":[{"delta":{"content":"三點。"}}]}\n\n',
      "data: [DONE]\n\n",
    ]);
    expect(events.filter((event) => event.type === "thinking")).toEqual([
      { type: "thinking", text: "先拆題。" },
      { type: "thinking", text: "再答。" },
    ]);
    expect(events.filter((event) => event.type === "delta")).toEqual([{ type: "delta", text: "三點。" }]);
  });

  it("maps deltas and usage on the final chunk", async () => {
    const events = await collect([
      ": OPENROUTER PROCESSING\n\n",
      'data: {"model":"qwen/qwen-test","choices":[{"delta":{"content":"Hello"},"finish_reason":null}]}\n\n',
      'data: {"model":"qwen/qwen-test","choices":[{"delta":{"content":" world"},"finish_reason":"stop"}],"usage":{"prompt_tokens":3,"completion_tokens":2,"cost":0.00014}}\n\n',
      "data: [DONE]\n\n",
    ]);
    expect(events).toEqual([
      { type: "delta", text: "Hello" },
      { type: "delta", text: " world" },
      {
        type: "done",
        model: "qwen/qwen-test",
        usage: { promptTokens: 3, completionTokens: 2, costUsd: 0.00014 },
      },
    ]);
  });

  it("joins a data line split across chunks", async () => {
    const events = await collect([
      'data: {"choices":[{"delta":{"content":"O',
      'K"}}]}\n\ndata: [DONE]\n\n',
    ]);
    expect(events[0]).toEqual({ type: "delta", text: "OK" });
    expect(events.at(-1)?.type).toBe("done");
  });

  it("surfaces an in-stream error", async () => {
    const events = await collect([
      'data: {"model":"x-ai/grok","error":{"code":403,"message":"Unsupported region"},"choices":[{"delta":{"content":""},"finish_reason":"error"}]}\n\n',
    ]);
    expect(events[0]).toEqual({ type: "error", status: 403, message: "Unsupported region" });
  });
});

describe("classifyUpstream", () => {
  it("treats HTTP 401 as unavailable, not a Hong Kong region block", () => {
    const error = classifyUpstream(401, JSON.stringify({ error: { message: "Invalid API key" } }));
    expect(error.code).toBe(ErrorCode.UPSTREAM_UNAVAILABLE);
    expect(shouldRetryWithNewSlug(error)).toBe(false);
  });

  it("retries region 403 and dead 404 endpoints on a new slug", () => {
    const blocked = classifyUpstream(403, JSON.stringify({ error: { message: "Unsupported Regions" } }));
    expect(blocked.code).toBe(ErrorCode.UPSTREAM_REGION_BLOCKED);
    expect(shouldRetryWithNewSlug(blocked)).toBe(true);

    const banned = classifyUpstream(403, JSON.stringify({ error: { message: "Author OpenAI is banned" } }));
    expect(banned.code).toBe(ErrorCode.UPSTREAM_REGION_BLOCKED);

    const other403 = classifyUpstream(403, JSON.stringify({ error: { message: "your IP address is not in the allowlist" } }));
    expect(other403.code).toBe(ErrorCode.UPSTREAM_UNAVAILABLE);
    expect(shouldRetryWithNewSlug(other403)).toBe(false);

    const missing = classifyUpstream(404, JSON.stringify({ error: { message: "No endpoints found" } }));
    expect(missing.code).toBe(ErrorCode.UPSTREAM_UNAVAILABLE);
    expect(shouldRetryWithNewSlug(missing)).toBe(true);
  });
});

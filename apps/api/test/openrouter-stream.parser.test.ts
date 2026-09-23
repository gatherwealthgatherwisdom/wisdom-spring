import { describe, expect, it } from "vitest";
import { parseOpenRouterSse } from "../src/modules/catalog/infra/openrouter-stream.parser";

async function* chunks(parts: string[]): AsyncGenerator<string> {
  for (const part of parts) yield part;
}

async function collect(parts: string[]) {
  const events = [];
  for await (const event of parseOpenRouterSse(chunks(parts))) events.push(event);
  return events;
}

describe("parseOpenRouterSse", () => {
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

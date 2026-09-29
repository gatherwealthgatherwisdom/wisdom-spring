import { describe, expect, it } from "vitest";
import { extractImageUrls, parseImageGeneration } from "../src/modules/catalog/infra/openrouter.client";

describe("extractImageUrls", () => {
  it("reads image_url parts and a bare url", () => {
    expect(
      extractImageUrls({
        images: [{ image_url: { url: "https://cdn.example/a.png" } }],
        content: [{ type: "image_url", image_url: { url: "https://cdn.example/b.png" } }],
      }),
    ).toEqual(["https://cdn.example/a.png", "https://cdn.example/b.png"]);
    expect(extractImageUrls({ content: "https://cdn.example/c.png" })).toEqual(["https://cdn.example/c.png"]);
  });
});

describe("parseImageGeneration", () => {
  it("reads b64_json, media type, and cost", () => {
    const result = parseImageGeneration(
      JSON.stringify({
        model: "qwen/qwen-image-3",
        data: [{ b64_json: "aaa", media_type: "image/png" }],
        usage: { prompt_tokens: 0, completion_tokens: 12, cost: 0.03 },
      }),
      "fallback",
    );
    expect(result.model).toBe("qwen/qwen-image-3");
    expect(result.images).toEqual([{ b64: "aaa", mediaType: "image/png" }]);
    expect(result.costUsd).toBe(0.03);
  });

  it("keeps an https url from the image API", () => {
    const result = parseImageGeneration(
      JSON.stringify({ data: [{ url: "https://cdn.example/out.png" }] }),
      "qwen/qwen-image-3",
    );
    expect(result.model).toBe("qwen/qwen-image-3");
    expect(result.images[0]?.url).toBe("https://cdn.example/out.png");
  });
});

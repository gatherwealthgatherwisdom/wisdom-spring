import { describe, expect, it } from "vitest";
import { extractImageUrls } from "../src/modules/catalog/infra/openrouter.client";

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

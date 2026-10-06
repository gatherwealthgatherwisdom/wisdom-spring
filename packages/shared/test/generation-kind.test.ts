import { describe, expect, it } from "vitest";
import { generationKind } from "../src/lib/generation-kind";

describe("generationKind", () => {
  it("labels image conversations as text-to-image", () => {
    expect(generationKind({ mode: "image", hasVision: true, hasPdf: true })).toBe("text-to-image");
  });

  it("labels a photo turn as image-to-text", () => {
    expect(generationKind({ mode: "chat", hasVision: true })).toBe("image-to-text");
  });

  it("labels a PDF turn as file-to-text", () => {
    expect(generationKind({ mode: "write", hasPdf: true })).toBe("file-to-text");
  });

  it("labels chat, write, and translate as text-to-text", () => {
    expect(generationKind({ mode: "chat" })).toBe("text-to-text");
    expect(generationKind({ mode: "write" })).toBe("text-to-text");
    expect(generationKind({ mode: "translate" })).toBe("text-to-text");
  });
});

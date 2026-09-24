import type { PickerCandidate } from "@spring/domain";
import {
  AppError,
  ErrorCode,
  ModelCapability,
  ModelHealthStatus,
  ModelRegionStatus,
  PlanTier,
  isAllowlisted,
} from "@spring/shared";
import { describe, expect, it } from "vitest";
import { drawModel } from "../src/modules/catalog/application/draw-model";

function row(partial: Partial<PickerCandidate> & Pick<PickerCandidate, "slug">): PickerCandidate {
  return {
    author: partial.slug.split("/")[0] ?? "unknown",
    enabled: true,
    regionStatus: ModelRegionStatus.HK_SAFE,
    healthStatus: ModelHealthStatus.HEALTHY,
    weight: 100,
    qualityScore: 50,
    minPlanTier: PlanTier.FREE,
    success24h: 0,
    fail24h: 0,
    isFreeRoute: false,
    promptUsdMicrosPerMillion: 100_000n,
    completionUsdMicrosPerMillion: 100_000n,
    contextLength: 8192,
    supportsText: true,
    supportsVision: false,
    supportsImageOutput: false,
    ...partial,
  };
}

const zero = (): number => 0;

describe("drawModel", () => {
  it("never draws a closed model from a mixed seeded catalog", () => {
    const slugs = [
      "openai/gpt-4o",
      "openai/gpt-oss-20b",
      "anthropic/claude-3.5-sonnet",
      "google/gemini-2.5-flash",
      "google/gemma-2-9b-it",
      "deepseek/deepseek-chat",
      "qwen/qwen-2.5-72b-instruct",
    ];
    const seeded = slugs.map((slug) =>
      row({
        slug,
        enabled: isAllowlisted(slug),
        regionStatus: isAllowlisted(slug) ? ModelRegionStatus.HK_SAFE : ModelRegionStatus.UNKNOWN,
      }),
    );
    for (let index = 0; index < 30; index += 1) {
      const pick = drawModel(seeded, { planTier: PlanTier.PLUS, capability: ModelCapability.TEXT, excludeSlugs: [] });
      expect(pick.primary).not.toBe("openai/gpt-4o");
      expect(pick.primary.startsWith("anthropic/")).toBe(false);
      expect(pick.primary.startsWith("google/gemini")).toBe(false);
    }
  });

  it("returns only enabled HK_SAFE rows that are healthy enough", () => {
    const rows = [
      row({ slug: "deepseek/off", enabled: false }),
      row({ slug: "deepseek/blocked", regionStatus: ModelRegionStatus.HK_BLOCKED }),
      row({ slug: "deepseek/down", healthStatus: ModelHealthStatus.DOWN }),
      row({ slug: "qwen/ok" }),
    ];
    const pick = drawModel(rows, { planTier: PlanTier.FREE, capability: ModelCapability.TEXT, excludeSlugs: [] }, zero);
    expect(pick.primary).toBe("qwen/ok");
  });

  it("prefers fallback authors that differ from the primary", () => {
    const rows = [row({ slug: "deepseek/a" }), row({ slug: "deepseek/b" }), row({ slug: "qwen/c" }), row({ slug: "moonshotai/d" })];
    const pick = drawModel(rows, { planTier: PlanTier.PLUS, capability: ModelCapability.TEXT, excludeSlugs: [] }, zero);
    expect(pick.primary).toBe("deepseek/a");
    expect(pick.fallbacks).toEqual(["qwen/c", "moonshotai/d"]);
  });

  it("relaxes the last-two exclusion when it would empty the pool", () => {
    const rows = [row({ slug: "deepseek/only" })];
    const pick = drawModel(
      rows,
      { planTier: PlanTier.FREE, capability: ModelCapability.TEXT, excludeSlugs: ["deepseek/only"] },
      zero,
    );
    expect(pick.primary).toBe("deepseek/only");
  });

  it("throws when nothing is eligible", () => {
    expect(() =>
      drawModel([], { planTier: PlanTier.FREE, capability: ModelCapability.TEXT, excludeSlugs: [] }),
    ).toThrow(AppError);
    try {
      drawModel([], { planTier: PlanTier.FREE, capability: ModelCapability.TEXT, excludeSlugs: [] });
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe(ErrorCode.MODEL_POOL_EMPTY);
    }
  });

  it("draws an image model only when the turn asks for an image", () => {
    const rows = [
      row({ slug: "deepseek/chat" }),
      row({ slug: "qwen/image", supportsImageOutput: true }),
    ];
    const text = drawModel(rows, { planTier: PlanTier.FREE, capability: ModelCapability.TEXT, excludeSlugs: [] }, zero);
    expect(text.primary).toBe("deepseek/chat");
    const image = drawModel(
      rows,
      { planTier: PlanTier.FREE, capability: ModelCapability.TEXT, excludeSlugs: [], requireImageOutput: true },
      zero,
    );
    expect(image.primary).toBe("qwen/image");
  });

  it("keeps FREE on free routes and cheap models", () => {
    const rows = [
      row({
        slug: "qwen/expensive",
        promptUsdMicrosPerMillion: 5_000_000n,
        completionUsdMicrosPerMillion: 5_000_000n,
      }),
      row({ slug: "qwen/plus-only", minPlanTier: PlanTier.PLUS }),
      row({ slug: "meta-llama/free", isFreeRoute: true, promptUsdMicrosPerMillion: 9_000_000n, completionUsdMicrosPerMillion: 9_000_000n }),
      row({ slug: "deepseek/cheap" }),
    ];
    const seen = new Set<string>();
    for (let index = 0; index < 40; index += 1) {
      const pick = drawModel(rows, { planTier: PlanTier.FREE, capability: ModelCapability.TEXT, excludeSlugs: [] }, Math.random);
      seen.add(pick.primary);
    }
    expect(seen.has("qwen/expensive")).toBe(false);
    expect(seen.has("qwen/plus-only")).toBe(false);
    expect(seen.has("deepseek/cheap") || seen.has("meta-llama/free")).toBe(true);
  });
});

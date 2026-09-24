import type { PrismaClient } from "@prisma/client";
import type { ModelPoolReader, PickerCandidate } from "@spring/domain";
import {
  ModelHealthStatus,
  ModelRegionStatus,
  PlanTier,
  modelAuthor,
  usdPerTokenToMicrosPerMillion,
} from "@spring/shared";

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function pricingOf(value: unknown): { prompt?: string; completion?: string } {
  if (!value || typeof value !== "object") return {};
  const record = value as Record<string, unknown>;
  return {
    prompt: typeof record.prompt === "string" ? record.prompt : undefined,
    completion: typeof record.completion === "string" ? record.completion : undefined,
  };
}

function asPlan(value: string): PlanTier {
  if (value === PlanTier.PLUS || value === PlanTier.INTERNAL) return value;
  return PlanTier.FREE;
}

function asRegion(value: string): ModelRegionStatus {
  if (value === ModelRegionStatus.HK_SAFE || value === ModelRegionStatus.HK_BLOCKED) return value;
  return ModelRegionStatus.UNKNOWN;
}

function asHealth(value: string): ModelHealthStatus {
  if (value === ModelHealthStatus.HEALTHY || value === ModelHealthStatus.DEGRADED) return value;
  return ModelHealthStatus.DOWN;
}

export class PrismaModelPoolReader implements ModelPoolReader {
  constructor(private readonly prisma: PrismaClient) {}

  async listPickerCandidates(): Promise<PickerCandidate[]> {
    const [pools, catalogs] = await Promise.all([
      this.prisma.modelPoolEntry.findMany(),
      this.prisma.modelCatalog.findMany(),
    ]);
    const bySlug = new Map(catalogs.map((row) => [row.slug, row]));
    const candidates: PickerCandidate[] = [];
    for (const pool of pools) {
      const catalog = bySlug.get(pool.slug);
      if (!catalog) continue;
      const modalities = stringList(catalog.inputModalities);
      const outputs = stringList(catalog.outputModalities);
      const pricing = pricingOf(catalog.pricing);
      candidates.push({
        slug: pool.slug,
        author: catalog.author || modelAuthor(pool.slug),
        enabled: pool.enabled,
        regionStatus: asRegion(pool.regionStatus),
        healthStatus: asHealth(pool.healthStatus),
        weight: pool.weight,
        qualityScore: pool.qualityScore,
        minPlanTier: asPlan(pool.minPlanTier),
        success24h: pool.success24h,
        fail24h: pool.fail24h,
        isFreeRoute: catalog.isFreeRoute,
        promptUsdMicrosPerMillion: usdPerTokenToMicrosPerMillion(pricing.prompt),
        completionUsdMicrosPerMillion: usdPerTokenToMicrosPerMillion(pricing.completion),
        contextLength: catalog.contextLength > 0 ? catalog.contextLength : 8192,
        supportsText: modalities.length === 0 || modalities.includes("text"),
        supportsVision: modalities.includes("image"),
        supportsImageOutput: outputs.includes("image"),
      });
    }
    return candidates;
  }
}

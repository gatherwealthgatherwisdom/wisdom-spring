import type { PrismaClient } from "@prisma/client";
import { AppError, ErrorCode, OPENROUTER } from "@spring/shared";
import type { OpenRouterClient } from "../infra/openrouter.client";
import { UpstreamError } from "../infra/openrouter-stream.parser";

export class ProbeHkAvailabilityJob {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly client: OpenRouterClient,
    private readonly assumeHkEgress: boolean,
  ) {}

  async run(limit = OPENROUTER.probeBatchSize): Promise<{ probed: number }> {
    const rows = await this.prisma.modelPoolEntry.findMany({
      where: {
        OR: [
          { regionStatus: "UNKNOWN" },
          { healthStatus: "DEGRADED" },
          { healthStatus: "DOWN", regionStatus: { not: "HK_BLOCKED" } },
        ],
      },
      orderBy: [{ enabled: "desc" }, { lastProbeAt: "asc" }],
      take: limit,
    });
    for (const row of rows) {
      await this.probeRow(row.slug, row.consecutiveRegionBlocks);
    }
    return { probed: rows.length };
  }

  async probeSlug(slug: string): Promise<void> {
    const row = await this.prisma.modelPoolEntry.findUnique({ where: { slug } });
    if (!row) throw new AppError(ErrorCode.NOT_FOUND);
    await this.probeRow(slug, row.consecutiveRegionBlocks);
  }

  private async probeRow(slug: string, consecutive: number): Promise<void> {
    try {
      await this.client.completeChat({
        model: slug,
        messages: [{ role: "user", content: OPENROUTER.probePrompt }],
        maxTokens: OPENROUTER.probeMaxTokens,
        signal: AbortSignal.timeout(20_000),
      });
      await this.prisma.modelPoolEntry.update({
        where: { slug },
        data: {
          healthStatus: "HEALTHY",
          consecutiveRegionBlocks: 0,
          lastErrorCode: null,
          lastProbeAt: new Date(),
          ...(this.assumeHkEgress ? { regionStatus: "HK_SAFE" as const } : {}),
        },
      });
    } catch (error) {
      const blocked = error instanceof UpstreamError && error.code === ErrorCode.UPSTREAM_REGION_BLOCKED;
      if (blocked) {
        const next = consecutive + 1;
        await this.prisma.modelPoolEntry.update({
          where: { slug },
          data: {
            consecutiveRegionBlocks: next,
            healthStatus: "DOWN",
            lastErrorCode: ErrorCode.UPSTREAM_REGION_BLOCKED,
            lastProbeAt: new Date(),
            ...(next >= 3 ? { regionStatus: "HK_BLOCKED" as const } : {}),
          },
        });
        return;
      }
      const code = error instanceof UpstreamError ? error.code : ErrorCode.UPSTREAM_UNAVAILABLE;
      await this.prisma.modelPoolEntry.update({
        where: { slug },
        data: {
          healthStatus: "DEGRADED",
          lastErrorCode: code,
          lastProbeAt: new Date(),
        },
      });
    }
  }
}

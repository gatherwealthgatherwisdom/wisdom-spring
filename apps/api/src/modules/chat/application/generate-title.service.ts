import type { PrismaClient } from "@prisma/client";
import { ModelCapability, PlanTier } from "@spring/shared";
import type { OpenRouterClient } from "../../catalog/infra/openrouter.client";
import { PrismaModelPoolReader } from "../../catalog/infra/pool.repository";
import { isEligible } from "../../catalog/application/draw-model";

export class GenerateTitleService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly openrouter: OpenRouterClient,
  ) {}

  async run(conversationId: string, servedModel: string): Promise<void> {
    const conversation = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conversation || conversation.title) return;
    const messages = await this.prisma.message.findMany({
      where: { conversationId, status: "COMPLETED", role: { in: ["USER", "ASSISTANT"] } },
      orderBy: { createdAt: "asc" },
      take: 6,
    });
    if (messages.length === 0) return;
    const slug = await this.cheapestSlug();
    if (!slug) return;
    const transcript = messages
      .map((message) => `${message.role === "USER" ? "用戶" : "智泉"}：${message.content}`)
      .join("\n")
      .slice(0, 2_000);
    try {
      const result = await this.openrouter.completeChat({
        model: slug,
        maxTokens: 32,
        messages: [
          { role: "system", content: "用最多20個字概括對話，只輸出標題本身，不要引號。" },
          { role: "user", content: `${transcript}\n（本輪模型：${servedModel}）` },
        ],
      });
      const title = result.text.replace(/[「」"'“”\n]/g, "").trim().slice(0, 20);
      if (!title) return;
      await this.prisma.conversation.updateMany({
        where: { id: conversationId, title: null },
        data: { title },
      });
    } catch {
      // Title generation is best-effort.
    }
  }

  private async cheapestSlug(): Promise<string | null> {
    const rows = await new PrismaModelPoolReader(this.prisma).listPickerCandidates();
    const eligible = rows
      .filter((row) => isEligible(row, { planTier: PlanTier.INTERNAL, capability: ModelCapability.TEXT, excludeSlugs: [] }))
      .sort((left, right) => {
        if (left.completionUsdMicrosPerMillion < right.completionUsdMicrosPerMillion) return -1;
        if (left.completionUsdMicrosPerMillion > right.completionUsdMicrosPerMillion) return 1;
        return 0;
      });
    return eligible[0]?.slug ?? null;
  }
}

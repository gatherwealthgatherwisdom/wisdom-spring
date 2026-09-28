import type { FastifyInstance } from "fastify";
import { SPRING_AIDES, SPRING_TOOLS } from "@spring/shared";

export async function publicCatalogRoutes(app: FastifyInstance): Promise<void> {
  app.get("/v1/catalog/tools", async () => ({
    items: SPRING_TOOLS.map((item) => ({
      id: item.id,
      zh: item.zh,
      en: item.en,
      blurbZh: item.blurbZh,
      blurbEn: item.blurbEn,
      live: item.live,
      ...(item.mode ? { mode: item.mode } : {}),
      ...(item.templateId ? { templateId: item.templateId } : {}),
      ...(item.imageStyle ? { imageStyle: item.imageStyle } : {}),
    })),
  }));

  app.get("/v1/catalog/aides", async () => ({
    items: SPRING_AIDES.map((item) => ({
      id: item.id,
      zh: item.zh,
      en: item.en,
      blurbZh: item.blurbZh,
      blurbEn: item.blurbEn,
    })),
  }));
}

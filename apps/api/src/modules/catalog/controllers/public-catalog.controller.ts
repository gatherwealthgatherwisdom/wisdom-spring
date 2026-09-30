import type { FastifyInstance } from "fastify";
import { publicAides, publicTools } from "../catalog-store";

export async function publicCatalogRoutes(app: FastifyInstance): Promise<void> {
  app.get("/v1/catalog/tools", async () => ({
    items: await publicTools(app.ctx.prisma),
  }));

  app.get("/v1/catalog/aides", async () => ({
    items: await publicAides(app.ctx.prisma),
  }));
}

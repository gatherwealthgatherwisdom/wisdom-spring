import type { FastifyInstance } from "fastify";
import { publicAides, publicLanguages, publicStyles, publicTools, publicWrite } from "../catalog-store";

export async function publicCatalogRoutes(app: FastifyInstance): Promise<void> {
  app.get("/v1/catalog/tools", async () => ({
    items: await publicTools(app.ctx.prisma),
  }));

  app.get("/v1/catalog/aides", async () => ({
    items: await publicAides(app.ctx.prisma),
  }));

  app.get("/v1/catalog/write", async () => ({
    items: await publicWrite(app.ctx.prisma),
  }));

  app.get("/v1/catalog/styles", async () => ({
    items: await publicStyles(app.ctx.prisma),
  }));

  app.get("/v1/catalog/languages", async () => ({
    items: await publicLanguages(app.ctx.prisma),
  }));
}

import type { FastifyInstance } from "fastify";
import { AppError, ErrorCode } from "@spring/shared";
import { readGeneratedImage } from "../infra/generated-image.store";

export async function generatedRoutes(app: FastifyInstance): Promise<void> {
  app.get("/v1/generated/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const file = await readGeneratedImage(id);
    if (!file) throw new AppError(ErrorCode.NOT_FOUND);
    return reply.type(file.mime).header("Cache-Control", "public, max-age=31536000, immutable").send(file.bytes);
  });
}

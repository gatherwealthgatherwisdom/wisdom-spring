import type { FastifyInstance, FastifyRequest } from "fastify";
import {
  AppError,
  ErrorCode,
  FEATURE_OFF_COPY,
  FILE_LATER_COPY,
  FeatureFlagKey,
  IMAGE_FORMAT_COPY,
  IMAGE_TOO_LARGE_COPY,
  LIMITS,
  UploadRequestSchema,
  createId,
  isImageMime,
  isPdfMime,
  isUploadMime,
} from "@spring/shared";
import { requireUser } from "../../../http/auth-guard";
import { env } from "../../../env";
import { isFlagEnabled } from "../../admin/feature-flags";
import { mimeFromMagic, persistUpload, readUpload, removeUpload } from "../infra/upload.store";

function uploadLimit(): {
  bodyLimit: number;
  config: { rateLimit: { max: number; timeWindow: string; keyGenerator: (request: FastifyRequest) => string } };
} {
  return {
    bodyLimit: 6_291_456,
    config: {
      rateLimit: {
        max: env.nodeEnv === "test" ? 10_000 : 30,
        timeWindow: "1 minute",
        keyGenerator: (request) => `${request.ip}:${request.headers.authorization ?? ""}`,
      },
    },
  };
}

export async function uploadRoutes(app: FastifyInstance): Promise<void> {
  app.post("/v1/uploads", uploadLimit(), async (request, reply) => {
    const user = await requireUser(request, app.ctx.auth);
    const body = UploadRequestSchema.parse(request.body);
    if (!isUploadMime(body.mime)) throw new AppError(ErrorCode.VALIDATION, FILE_LATER_COPY);
    const bytes = Buffer.from(body.data.replace(/\s/g, ""), "base64");
    if (bytes.length === 0) throw new AppError(ErrorCode.VALIDATION, IMAGE_FORMAT_COPY);
    if (bytes.length > LIMITS.uploadMaxBytes) throw new AppError(ErrorCode.VALIDATION, IMAGE_TOO_LARGE_COPY);
    const mime = mimeFromMagic(bytes, body.mime);
    if (!mime) throw new AppError(ErrorCode.VALIDATION, IMAGE_FORMAT_COPY);
    if (isPdfMime(mime) && !(await isFlagEnabled(app.ctx.prisma, FeatureFlagKey.PDF_UPLOAD))) {
      throw new AppError(ErrorCode.VALIDATION, FEATURE_OFF_COPY);
    }
    if (isImageMime(mime) && !(await isFlagEnabled(app.ctx.prisma, FeatureFlagKey.VISION))) {
      throw new AppError(ErrorCode.VALIDATION, FEATURE_OFF_COPY);
    }
    const id = createId();
    await persistUpload(id, mime, bytes);
    try {
      await app.ctx.prisma.asset.create({
        data: { id, userId: user.id, mime, byteSize: bytes.length },
      });
    } catch (error) {
      await removeUpload(id);
      throw error;
    }
    return reply.status(201).send({ id, url: `/v1/uploads/${id}`, mime, byteSize: bytes.length });
  });

  app.get("/v1/uploads/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const file = await readUpload(id);
    if (!file) throw new AppError(ErrorCode.NOT_FOUND);
    return reply.type(file.mime).header("Cache-Control", "public, max-age=31536000, immutable").send(file.bytes);
  });
}

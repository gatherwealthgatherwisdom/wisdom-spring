import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import { AppError, ErrorCode, Locale, errorBody, messageFor } from "@spring/shared";

export function errorMapper(error: FastifyError, request: FastifyRequest, reply: FastifyReply): void {
  if (reply.sent) return;
  if (error instanceof AppError) {
    reply.status(error.statusCode).send(errorBody(error));
    return;
  }
  if (error instanceof ZodError) {
    request.log.info({ paths: error.issues.map((issue) => issue.path.join(".")) }, "validation");
    reply.status(400).send({
      error: { code: ErrorCode.VALIDATION, message: messageFor(ErrorCode.VALIDATION, Locale.ZH_HK) },
    });
    return;
  }
  if (error.statusCode === 429) {
    reply.status(429).send({
      error: {
        code: ErrorCode.UPSTREAM_RATE_LIMITED,
        message: messageFor(ErrorCode.UPSTREAM_RATE_LIMITED, Locale.ZH_HK),
      },
    });
    return;
  }
  request.log.error({ err: error }, "unhandled");
  reply.status(500).send({
    error: { code: ErrorCode.INTERNAL, message: messageFor(ErrorCode.INTERNAL, Locale.ZH_HK) },
  });
}

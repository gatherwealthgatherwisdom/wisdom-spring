import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { AppError, ErrorCode, SendMessageRequestSchema, messageFor } from "@spring/shared";
import { requireUser } from "../../../http/auth-guard";
import { openSse } from "../../../http/sse";
import { env } from "../../../env";

function sendLimit(): { config: { rateLimit: { max: number; timeWindow: string; keyGenerator: (request: FastifyRequest) => string } } } {
  return {
    config: {
      rateLimit: {
        max: env.nodeEnv === "test" ? 10_000 : 30,
        timeWindow: "1 minute",
        keyGenerator: (request) => `${request.ip}:${request.headers.authorization ?? ""}`,
      },
    },
  };
}

async function stream(request: FastifyRequest, reply: FastifyReply, run: (sink: ReturnType<typeof openSse>) => Promise<void>): Promise<void> {
  const sink = openSse(reply);
  try {
    await run(sink);
  } catch (error) {
    const appError = error instanceof AppError ? error : new AppError(ErrorCode.INTERNAL);
    request.log.error({ code: appError.code }, "generation failed before stream events");
    sink.send("error", { code: appError.code, message: appError.message || messageFor(appError.code) });
  } finally {
    sink.close();
  }
}

export async function messageRoutes(app: FastifyInstance): Promise<void> {
  app.post("/v1/messages", sendLimit(), async (request, reply) => {
    const user = await requireUser(request, app.ctx.auth);
    const body = SendMessageRequestSchema.parse(request.body);
    const prepared = await app.ctx.sendMessage.prepare(user, body);
    await stream(request, reply, (sink) => app.ctx.sendMessage.continue(user, prepared, sink));
  });

  app.post("/v1/messages/:id/abort", async (request) => {
    const user = await requireUser(request, app.ctx.auth);
    const { id } = request.params as { id: string };
    return app.ctx.abort.execute(user, id);
  });

  app.post("/v1/messages/:id/regenerate", sendLimit(), async (request, reply) => {
    const user = await requireUser(request, app.ctx.auth);
    const { id } = request.params as { id: string };
    await stream(request, reply, (sink) => app.ctx.regenerate.execute(user, id, sink));
  });
}

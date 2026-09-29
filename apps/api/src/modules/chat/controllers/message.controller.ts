import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  AppError,
  ErrorCode,
  FEEDBACK_ONLY_ASSISTANT_COPY,
  FeedbackRequestSchema,
  MessageRole,
  MessageStatus,
  SendMessageRequestSchema,
  messageFor,
  ratingOf,
} from "@spring/shared";
import { requireUser } from "../../../http/auth-guard";
import { openSse } from "../../../http/sse";
import { env } from "../../../env";
import { messageViews } from "../application/message-view";

function perMinute(max: number): {
  config: { rateLimit: { max: number; timeWindow: string; keyGenerator: (request: FastifyRequest) => string } };
} {
  return {
    config: {
      rateLimit: {
        max: env.nodeEnv === "test" ? 10_000 : max,
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
  app.post("/v1/messages", perMinute(30), async (request, reply) => {
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

  app.post("/v1/messages/:id/regenerate", perMinute(30), async (request, reply) => {
    const user = await requireUser(request, app.ctx.auth);
    const { id } = request.params as { id: string };
    const prepared = await app.ctx.regenerate.prepare(user, id);
    await stream(request, reply, (sink) => app.ctx.regenerate.continue(user, prepared, sink));
  });

  app.post("/v1/messages/:id/feedback", perMinute(60), async (request) => {
    const user = await requireUser(request, app.ctx.auth);
    const { id } = request.params as { id: string };
    const body = FeedbackRequestSchema.parse(request.body ?? {});
    const row = await app.ctx.prisma.message.findFirst({
      where: { id, conversation: { userId: user.id, status: { not: "DELETED" } } },
    });
    if (!row) throw new AppError(ErrorCode.NOT_FOUND);
    if (row.role !== MessageRole.ASSISTANT || row.status !== MessageStatus.COMPLETED) {
      throw new AppError(ErrorCode.VALIDATION, FEEDBACK_ONLY_ASSISTANT_COPY);
    }
    const current = ratingOf(row.feedback);
    const next = body.rating !== null && body.rating === current ? null : body.rating;
    const updated = await app.ctx.prisma.message.update({
      where: { id },
      data: { feedback: next },
    });
    const [view] = await messageViews(app.ctx.prisma, [updated]);
    if (!view) throw new AppError(ErrorCode.INTERNAL);
    return view;
  });
}

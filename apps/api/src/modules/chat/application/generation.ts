import type { PrismaClient } from "@prisma/client";
import type { ContextWindow, ModelPicker } from "@spring/domain";
import {
  AppError,
  ErrorCode,
  LIMITS,
  ModelCapability,
  SYSTEM_PROMPT,
  createId,
  estimateCostMicros,
  messageFor,
  usdPerTokenToMicrosPerMillion,
  usdToMicros,
  type PlanTier,
} from "@spring/shared";
import type { SseSink } from "../../../http/sse";
import type { OpenRouterClient } from "../../catalog/infra/openrouter.client";
import { UpstreamError, type StreamUsage } from "../../catalog/infra/openrouter-stream.parser";
import type { AbortRegistry } from "./abort-registry";

export interface TitleEnqueuer {
  enqueue(conversationId: string, servedModel: string): Promise<void>;
}

export interface GenerationDeps {
  prisma: PrismaClient;
  picker: ModelPicker;
  context: ContextWindow;
  openrouter: OpenRouterClient;
  aborts: AbortRegistry;
  titles: TitleEnqueuer;
  ignoreProviders: string[];
  now(): Date;
}

function isAbort(error: unknown): boolean {
  if (error instanceof AppError && error.code === ErrorCode.STREAM_ABORTED) return true;
  return error instanceof Error && error.name === "AbortError";
}

function pricingOf(value: unknown): { prompt: bigint; completion: bigint } {
  if (!value || typeof value !== "object") return { prompt: 0n, completion: 0n };
  const record = value as Record<string, unknown>;
  return {
    prompt: usdPerTokenToMicrosPerMillion(typeof record.prompt === "string" ? record.prompt : undefined),
    completion: usdPerTokenToMicrosPerMillion(
      typeof record.completion === "string" ? record.completion : undefined,
    ),
  };
}

export async function runGeneration(
  deps: GenerationDeps,
  input: {
    userId: string;
    planTier: PlanTier;
    conversationId: string;
    assistantMessageId: string;
  },
  sink: SseSink,
): Promise<void> {
  const history = await deps.prisma.message.findMany({
    where: {
      conversationId: input.conversationId,
      status: "COMPLETED",
      role: { in: ["USER", "ASSISTANT"] },
    },
    orderBy: { createdAt: "asc" },
  });
  const previous = await deps.prisma.message.findMany({
    where: {
      conversationId: input.conversationId,
      role: "ASSISTANT",
      id: { not: input.assistantMessageId },
      requestedModel: { not: null },
      status: { in: ["COMPLETED", "SUPERSEDED", "CANCELLED", "FAILED"] },
    },
    orderBy: { createdAt: "desc" },
    take: 2,
    select: { requestedModel: true },
  });
  let excludeSlugs = previous.flatMap((row) => (row.requestedModel ? [row.requestedModel] : []));
  const turns = history.slice(-LIMITS.historyMaxMessages).map((row) => ({
    role: row.role === "USER" ? ("user" as const) : ("assistant" as const),
    content: row.content,
  }));

  const controller = new AbortController();
  const onClientAbort = (): void => controller.abort();
  sink.signal.addEventListener("abort", onClientAbort);
  deps.aborts.register(input.assistantMessageId, controller);

  let deny: "deny" | "allow" = "deny";
  let regionRetries = 0;
  let sawDelta = false;
  let text = "";
  const started = Date.now();

  try {
    while (true) {
      let requestedSlug = "";
      let pickPrimary = "";
      try {
      const pick = await deps.picker.pick({
        planTier: input.planTier,
        capability: ModelCapability.TEXT,
        excludeSlugs,
      });
      requestedSlug = pick.primary;
      pickPrimary = pick.primary;
      const catalog = await deps.prisma.modelCatalog.findUnique({ where: { slug: pick.primary } });
      const prices = pricingOf(catalog?.pricing);
      const contextLength = catalog?.contextLength && catalog.contextLength > 0 ? catalog.contextLength : 8192;
      const trimmed = deps.context.trim(
        [
          {
            role: "system",
            content: `${SYSTEM_PROMPT}\n今輪請求模型：${pick.primary}。只有使用者問及模型身份時先可以提及。`,
          },
          ...turns,
        ],
        contextLength,
        LIMITS.reserveOutputTokens,
      );
      await deps.prisma.message.update({
        where: { id: input.assistantMessageId },
        data: { requestedModel: pick.primary },
      });
      if (!sawDelta) {
        sink.send("meta", {
          messageId: input.assistantMessageId,
          conversationId: input.conversationId,
          requestedModel: pick.primary,
        });
      }

      {
        let served = pick.primary;
        let usage: StreamUsage = { promptTokens: 0, completionTokens: 0 };
        let sawDone = false;
        let ticks = 0;
        for await (const event of deps.openrouter.streamChat({
          model: pick.primary,
          models: pick.fallbacks,
          messages: trimmed,
          signal: controller.signal,
          userRef: input.userId,
          dataCollection: deny,
          ignoreProviders: deps.ignoreProviders,
        })) {
          ticks += 1;
          if (controller.signal.aborted || (ticks % 16 === 0 && (await deps.aborts.isRequested(input.assistantMessageId)))) {
            controller.abort();
            throw new AppError(ErrorCode.STREAM_ABORTED);
          }
          if (event.type === "delta") {
            sawDelta = true;
            text += event.text;
            sink.send("delta", { text: event.text });
          } else if (event.type === "done") {
            sawDone = true;
            if (event.model) served = event.model;
            usage = event.usage;
          } else if (event.type === "error") {
            const region =
              event.status === 401 ||
              event.status === 403 ||
              /region|author banned|unsupported region/i.test(event.message);
            const dataPolicy = /data policy|data collection|data_collection/i.test(event.message);
            throw new UpstreamError(
              region ? ErrorCode.UPSTREAM_REGION_BLOCKED : ErrorCode.UPSTREAM_UNAVAILABLE,
              event.message,
              event.status,
              dataPolicy,
            );
          }
        }
        if (!sawDone && text.length === 0) {
          throw new UpstreamError(ErrorCode.UPSTREAM_UNAVAILABLE, "empty completion", 502);
        }
        if (controller.signal.aborted) throw new AppError(ErrorCode.STREAM_ABORTED);

        const servedPrices = served === pick.primary ? prices : pricingOf((await deps.prisma.modelCatalog.findUnique({ where: { slug: served } }))?.pricing);
        const costRaw =
          usage.costUsd !== undefined
            ? usdToMicros(usage.costUsd)
            : estimateCostMicros(usage.promptTokens, usage.completionTokens, servedPrices.prompt, servedPrices.completion);
        const cost = costRaw < 0n ? 0n : costRaw;
        const fallbackUsed = served !== pick.primary;
        await deps.prisma.$transaction([
          deps.prisma.message.update({
            where: { id: input.assistantMessageId },
            data: {
              status: "COMPLETED",
              content: text,
              requestedModel: pick.primary,
              servedModel: served,
              fallbackUsed,
              promptTokens: usage.promptTokens,
              completionTokens: usage.completionTokens,
              costUsdMicros: cost,
              latencyMs: Date.now() - started,
              errorCode: null,
            },
          }),
          deps.prisma.usageLedger.create({
            data: {
              id: createId(),
              userId: input.userId,
              messageId: input.assistantMessageId,
              model: served,
              promptTokens: usage.promptTokens,
              completionTokens: usage.completionTokens,
              costUsdMicros: cost,
            },
          }),
          deps.prisma.conversation.update({
            where: { id: input.conversationId },
            data: { lastMessageAt: deps.now() },
          }),
        ]);
        await deps.prisma.modelPoolEntry
          .update({ where: { slug: served }, data: { success24h: { increment: 1 } } })
          .catch(() => undefined);
        sink.send("done", {
          servedModel: served,
          fallbackUsed,
          usage: { promptTokens: usage.promptTokens, completionTokens: usage.completionTokens },
          costUsdMicros: cost.toString(),
        });
        const userTurns = history.filter((row) => row.role === "USER").length;
        const conversation = await deps.prisma.conversation.findUnique({
          where: { id: input.conversationId },
          select: { title: true },
        });
        if (conversation && !conversation.title && userTurns <= 1) {
          try {
            await deps.titles.enqueue(input.conversationId, served);
          } catch {
            // A missing title leaves the client on the default label.
          }
        }
        return;
      }
      } catch (error) {
        if (isAbort(error)) {
          await deps.prisma.message.update({
            where: { id: input.assistantMessageId },
            data: {
              status: "CANCELLED",
              content: text,
              errorCode: ErrorCode.STREAM_ABORTED,
              latencyMs: Date.now() - started,
            },
          });
          sink.send("error", { code: ErrorCode.STREAM_ABORTED, message: messageFor(ErrorCode.STREAM_ABORTED) });
          return;
        }
        if (
          error instanceof UpstreamError &&
          error.retryWithoutDataCollection &&
          deny === "deny" &&
          !sawDelta
        ) {
          deny = "allow";
          continue;
        }
        if (
          error instanceof UpstreamError &&
          error.code === ErrorCode.UPSTREAM_REGION_BLOCKED &&
          regionRetries < LIMITS.sendRetryOnRegionBlock &&
          !sawDelta
        ) {
          regionRetries += 1;
          excludeSlugs = [...excludeSlugs, pickPrimary];
          await deps.prisma.modelPoolEntry
            .update({
              where: { slug: pickPrimary },
              data: {
                regionStatus: "HK_BLOCKED",
                healthStatus: "DOWN",
                lastErrorCode: ErrorCode.UPSTREAM_REGION_BLOCKED,
                lastProbeAt: deps.now(),
                fail24h: { increment: 1 },
              },
            })
            .catch(() => undefined);
          continue;
        }
        const code = error instanceof UpstreamError ? error.code : error instanceof AppError ? error.code : ErrorCode.UPSTREAM_UNAVAILABLE;
        await deps.prisma.message.update({
          where: { id: input.assistantMessageId },
          data: {
            status: "FAILED",
            content: text,
            errorCode: code,
            latencyMs: Date.now() - started,
          },
        });
        if (requestedSlug) {
          await deps.prisma.modelPoolEntry
            .update({
              where: { slug: requestedSlug },
              data: { fail24h: { increment: 1 }, lastErrorCode: code },
            })
            .catch(() => undefined);
        }
        sink.send("error", { code, message: messageFor(code) });
        return;
      }
    }
  } finally {
    sink.signal.removeEventListener("abort", onClientAbort);
    deps.aborts.clear(input.assistantMessageId);
  }
}

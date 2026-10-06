import type { PrismaClient } from "@prisma/client";
import type { ContextWindow, ModelPicker } from "@spring/domain";
import {
  AppError,
  ErrorCode,
  LIMITS,
  ModelCapability,
  OPENROUTER,
  assetIdsOf,
  generationKind,
  isImageMime,
  isPdfMime,
  createId,
  estimateCostMicros,
  messageFor,
  usdPerTokenToMicrosPerMillion,
  usdToMicros,
  type PlanTier,
} from "@spring/shared";
import { loadAppLimits } from "../../admin/app-limits";
import { loadPromptDocs } from "../../admin/prompt-docs";
import { assertCapabilityFlags } from "../../admin/feature-flags";
import { catalogImageHint, catalogInstruction, isWebToolLive } from "../../catalog/catalog-store";
import { systemPromptFor, withImageStyle } from "./mode-prompt";
import type { SseSink } from "../../../http/sse";
import type { ChatContentPart, ChatMessage, OpenRouterClient } from "../../catalog/infra/openrouter.client";
import { persistGeneratedImage } from "../infra/generated-image.store";
import { readUpload } from "../infra/upload.store";
import {
  classifyUpstream,
  shouldRetryWithNewSlug,
  UpstreamError,
  type SpringStreamEvent,
  type StreamUsage,
} from "../../catalog/infra/openrouter-stream.parser";
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
    turnMode?: string;
    imageStyle?: string | null;
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
  const conversation = await deps.prisma.conversation.findUnique({ where: { id: input.conversationId } });
  const listedMode = conversation?.mode ?? "chat";
  const turnMode = input.turnMode ?? listedMode;
  const modeFields = {
    mode: turnMode,
    templateId: turnMode === "write" ? (conversation?.templateId ?? null) : turnMode === listedMode ? (conversation?.templateId ?? null) : null,
    sourceLang: turnMode === "translate" ? (conversation?.sourceLang ?? null) : null,
    targetLang: turnMode === "translate" ? (conversation?.targetLang ?? null) : null,
    imageStyle: turnMode === "image" ? (input.imageStyle ?? conversation?.imageStyle ?? "ink") : (conversation?.imageStyle ?? null),
  };
  const lastUser = [...history].reverse().find((row) => row.role === "USER");
  const mediaIds = modeFields.mode === "image" ? [] : assetIdsOf(lastUser?.attachments);
  const media = mediaIds.length > 0 ? await deps.prisma.asset.findMany({ where: { id: { in: mediaIds } } }) : [];
  const visionIds = media.filter((row) => isImageMime(row.mime)).map((row) => row.id);
  const pdfIds = media.filter((row) => isPdfMime(row.mime)).map((row) => row.id);
  const hasVision = visionIds.length > 0;
  const hasPdf = pdfIds.length > 0;
  const kind = generationKind({ mode: modeFields.mode, hasVision, hasPdf });
  const [{ webOn }, extraInstruction, webLive, extraHint] = await Promise.all([
    assertCapabilityFlags(deps.prisma, {
      mode: modeFields.mode,
      mimes: media.map((row) => row.mime),
    }),
    catalogInstruction(deps.prisma, modeFields.templateId),
    isWebToolLive(deps.prisma, modeFields.templateId),
    catalogImageHint(deps.prisma, modeFields.imageStyle),
  ]);
  const [prompts, { historyMaxMessages }] = await Promise.all([
    loadPromptDocs(deps.prisma),
    loadAppLimits(deps.prisma),
  ]);
  const emptyPrompt = hasPdf && !hasVision ? prompts.file : prompts.look;
  const turns = history.slice(-historyMaxMessages).map((row) => {
    const attached = assetIdsOf(row.attachments).length > 0;
    const text =
      row.role === "USER" && row.content.trim().length === 0 && attached ? emptyPrompt : row.content;
    return {
      role: row.role === "USER" ? ("user" as const) : ("assistant" as const),
      content:
        modeFields.mode === "image" && row.role === "USER"
          ? withImageStyle(text, modeFields.imageStyle, extraHint)
          : text,
    };
  });

  const controller = new AbortController();
  const onClientAbort = (): void => controller.abort();
  sink.signal.addEventListener("abort", onClientAbort);
  deps.aborts.register(input.assistantMessageId, controller);

  let deny: "deny" | "allow" = "deny";
  let slugRetries = 0;
  let sawDelta = false;
  let text = "";
  let thinking = "";
  let imageUrl: string | null = null;
  const started = Date.now();

  try {
    while (true) {
      let requestedSlug = "";
      let pickPrimary = "";
      try {
      const pick = await deps.picker.pick({
        planTier: input.planTier,
        capability: hasVision ? ModelCapability.VISION : ModelCapability.TEXT,
        excludeSlugs,
        requireImageOutput: modeFields.mode === "image",
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
            content: systemPromptFor(modeFields, pick.primary, extraInstruction, extraHint, prompts.system),
          },
          ...turns,
        ],
        contextLength,
        LIMITS.reserveOutputTokens,
      );
      await deps.prisma.message.update({
        where: { id: input.assistantMessageId },
        data: { requestedModel: pick.primary, generationKind: kind },
      });
      if (!sawDelta) {
        sink.send("meta", {
          messageId: input.assistantMessageId,
          conversationId: input.conversationId,
          requestedModel: pick.primary,
          generationKind: kind,
        });
      }

      {
        let served = pick.primary;
        let usage: StreamUsage = { promptTokens: 0, completionTokens: 0 };
        let sawDone = false;
        let ticks = 0;
        if (modeFields.mode === "image") {
          const prompt = withImageStyle(lastUser?.content ?? "", modeFields.imageStyle, extraHint);
          const image = await deps.openrouter.generateImage({
            model: pick.primary,
            prompt,
            signal: controller.signal,
            ignoreProviders: deps.ignoreProviders,
            userRef: input.userId,
          });
          const part = image.images[0];
          if (!part) throw new UpstreamError(ErrorCode.UPSTREAM_UNAVAILABLE, "image missing", 502);
          try {
            imageUrl = await persistGeneratedImage(input.assistantMessageId, part);
          } catch {
            throw new UpstreamError(ErrorCode.UPSTREAM_UNAVAILABLE, "image missing", 502);
          }
          text = "";
          sawDelta = true;
          served = image.model || served;
          usage = {
            promptTokens: image.promptTokens,
            completionTokens: image.completionTokens,
            costUsd: image.costUsd,
          };
          sawDone = true;
        }
        const messages: ChatMessage[] =
          hasVision || hasPdf ? await withMediaParts(trimmed, mediaIds, emptyPrompt) : trimmed;
        const plugins = [
          ...(webOn && webLive ? [OPENROUTER.webPlugin] : []),
          ...(hasPdf ? [OPENROUTER.pdfPlugin] : []),
        ];
        for await (const event of modeFields.mode === "image" ? emptyStream() : deps.openrouter.streamChat({
          model: pick.primary,
          models: pick.fallbacks,
          messages,
          signal: controller.signal,
          userRef: input.userId,
          dataCollection: deny,
          ignoreProviders: deps.ignoreProviders,
          ...(plugins.length > 0 ? { plugins } : {}),
        })) {
          ticks += 1;
          if (controller.signal.aborted || (ticks % 16 === 0 && (await deps.aborts.isRequested(input.assistantMessageId)))) {
            controller.abort();
            throw new AppError(ErrorCode.STREAM_ABORTED);
          }
          if (event.type === "thinking") {
            thinking += event.text;
            sink.send("thinking", { text: event.text });
          } else if (event.type === "delta") {
            sawDelta = true;
            text += event.text;
            sink.send("delta", { text: event.text });
          } else if (event.type === "done") {
            sawDone = true;
            if (event.model) served = event.model;
            usage = event.usage;
          } else if (event.type === "error") {
            throw classifyUpstream(event.status, JSON.stringify({ error: { message: event.message } }));
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
              thinking: thinking.length > 0 ? thinking : null,
              imageUrl,
              requestedModel: pick.primary,
              servedModel: served,
              generationKind: kind,
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
            data: {
              lastMessageAt: deps.now(),
              ...(imageUrl ? { lastImageUrl: imageUrl } : {}),
            },
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
          ...(imageUrl ? { imageUrl } : {}),
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
          shouldRetryWithNewSlug(error) &&
          slugRetries < LIMITS.sendRetryOnRegionBlock &&
          !sawDelta
        ) {
          slugRetries += 1;
          excludeSlugs = [...excludeSlugs, pickPrimary];
          const region = error.code === ErrorCode.UPSTREAM_REGION_BLOCKED;
          await deps.prisma.modelPoolEntry
            .update({
              where: { slug: pickPrimary },
              data: {
                healthStatus: "DOWN",
                lastErrorCode: error.code,
                lastProbeAt: deps.now(),
                fail24h: { increment: 1 },
                ...(region ? { regionStatus: "HK_BLOCKED" as const } : {}),
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

async function withMediaParts(trimmed: ChatMessage[], assetIds: string[], emptyPrompt: string): Promise<ChatMessage[]> {
  const lastUserIndex = trimmed.reduce((found, turn, index) => (turn.role === "user" ? index : found), -1);
  if (lastUserIndex < 0) return trimmed;
  const last = trimmed[lastUserIndex];
  if (!last || typeof last.content !== "string") return trimmed;
  const parts: ChatContentPart[] = [{ type: "text", text: last.content || emptyPrompt }];
  for (const id of assetIds) {
    const file = await readUpload(id);
    if (!file) throw new AppError(ErrorCode.NOT_FOUND);
    if (isPdfMime(file.mime)) {
      parts.push({
        type: "file",
        file: { filename: `${id}.pdf`, file_data: `data:application/pdf;base64,${file.bytes.toString("base64")}` },
      });
      continue;
    }
    parts.push({
      type: "image_url",
      image_url: { url: `data:${file.mime};base64,${file.bytes.toString("base64")}` },
    });
  }
  return trimmed.map((turn, index) => (index === lastUserIndex ? { role: "user", content: parts } : turn));
}

async function* emptyStream(): AsyncGenerator<SpringStreamEvent> {
  // Image turns use a single completion instead of the text stream.
}

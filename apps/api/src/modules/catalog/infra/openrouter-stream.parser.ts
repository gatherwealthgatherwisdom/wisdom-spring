import { ErrorCode } from "@spring/shared";

export interface StreamUsage {
  promptTokens: number;
  completionTokens: number;
  costUsd?: number;
}

export type SpringStreamEvent =
  | { type: "delta"; text: string }
  | { type: "done"; model: string; usage: StreamUsage }
  | { type: "error"; status: number; message: string };

export class UpstreamError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly retryWithoutDataCollection: boolean;

  constructor(code: ErrorCode, message: string, status: number, retryWithoutDataCollection = false) {
    super(message);
    this.name = "UpstreamError";
    this.code = code;
    this.status = status;
    this.retryWithoutDataCollection = retryWithoutDataCollection;
  }
}

export function classifyUpstream(status: number, body: string): UpstreamError {
  let message = body.slice(0, 400);
  try {
    const parsed: unknown = JSON.parse(body);
    if (parsed && typeof parsed === "object" && "error" in parsed) {
      const error = (parsed as { error?: { message?: unknown } }).error;
      if (error && typeof error.message === "string") message = error.message;
    }
  } catch {
    // Body is not JSON.
  }
  const lower = message.toLowerCase();
  const dataPolicy =
    lower.includes("data policy") || lower.includes("data collection") || lower.includes("data_collection");
  if (dataPolicy) return new UpstreamError(ErrorCode.UPSTREAM_UNAVAILABLE, message, status, true);
  if (status === 402) return new UpstreamError(ErrorCode.QUOTA_MONTHLY_COST, message, status);
  if (status === 429) return new UpstreamError(ErrorCode.UPSTREAM_RATE_LIMITED, message, status);
  if (status === 401 || status === 403) return new UpstreamError(ErrorCode.UPSTREAM_REGION_BLOCKED, message, status);
  return new UpstreamError(ErrorCode.UPSTREAM_UNAVAILABLE, message, status);
}

function pushLines(buffer: string, chunk: string): { lines: string[]; buffer: string } {
  const combined = buffer + chunk;
  const parts = combined.split(/\r?\n/);
  const rest = parts.pop() ?? "";
  return { lines: parts, buffer: rest };
}

function readRecord(raw: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function* parseOpenRouterSse(chunks: AsyncIterable<string>): AsyncGenerator<SpringStreamEvent> {
  let buffer = "";
  let dataLines: string[] = [];
  let model = "";
  let usage: StreamUsage | null = null;
  let failed = false;

  const emitData = function* (raw: string): Generator<SpringStreamEvent> {
    const payload = raw.trim();
    if (payload.length === 0) return;
    if (payload === "[DONE]") {
      if (!failed) {
        yield {
          type: "done",
          model,
          usage: usage ?? { promptTokens: 0, completionTokens: 0 },
        };
      }
      return;
    }
    const record = readRecord(payload);
    if (!record) return;
    if (typeof record.model === "string") model = record.model;

    const errorValue = record.error;
    if (errorValue && typeof errorValue === "object") {
      const error = errorValue as { message?: unknown; code?: unknown };
      failed = true;
      yield {
        type: "error",
        status: typeof error.code === "number" ? error.code : 502,
        message: typeof error.message === "string" ? error.message : "upstream error",
      };
      return;
    }

    const choices = Array.isArray(record.choices) ? record.choices : [];
    const choice = choices[0];
    if (choice && typeof choice === "object") {
      const row = choice as {
        delta?: { content?: unknown };
        finish_reason?: unknown;
        error?: { message?: unknown };
      };
      if (row.error && typeof row.error.message === "string") {
        failed = true;
        yield { type: "error", status: 502, message: row.error.message };
        return;
      }
      if (row.finish_reason === "error") {
        failed = true;
        yield { type: "error", status: 502, message: "upstream stream error" };
        return;
      }
      if (typeof row.delta?.content === "string" && row.delta.content.length > 0) {
        yield { type: "delta", text: row.delta.content };
      }
    }

    if (record.usage && typeof record.usage === "object") {
      const row = record.usage as {
        prompt_tokens?: unknown;
        completion_tokens?: unknown;
        cost?: unknown;
      };
      usage = {
        promptTokens: typeof row.prompt_tokens === "number" ? row.prompt_tokens : 0,
        completionTokens: typeof row.completion_tokens === "number" ? row.completion_tokens : 0,
        ...(typeof row.cost === "number" ? { costUsd: row.cost } : {}),
      };
    }
  };

  const consume = function* (line: string): Generator<SpringStreamEvent> {
    if (line.startsWith(":")) return;
    if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).replace(/^ /, ""));
      return;
    }
    if (line === "" && dataLines.length > 0) {
      yield* emitData(dataLines.join("\n"));
      dataLines = [];
    }
  };

  for await (const chunk of chunks) {
    const pushed = pushLines(buffer, chunk);
    buffer = pushed.buffer;
    for (const line of pushed.lines) yield* consume(line);
  }
  if (buffer.length > 0) yield* consume(buffer);
  if (dataLines.length > 0) yield* emitData(dataLines.join("\n"));
}

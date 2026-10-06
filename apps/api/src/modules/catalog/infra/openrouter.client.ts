import { BRAND, OPENROUTER } from "@spring/shared";
import {
  classifyUpstream,
  parseOpenRouterSse,
  type SpringStreamEvent,
} from "./openrouter-stream.parser";

export interface OpenRouterModel {
  id: string;
  name?: string;
  context_length?: number;
  architecture?: {
    input_modalities?: string[];
    output_modalities?: string[];
    modality?: string;
  };
  pricing?: {
    prompt?: string;
    completion?: string;
  };
}

export type ChatContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } }
  | { type: "file"; file: { filename: string; file_data: string } };

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string | ChatContentPart[];
}

export type OpenRouterPlugin =
  | { id: "web"; max_results?: number }
  | { id: "file-parser"; pdf?: { engine: "pdf-text" } };

export interface StreamChatInput {
  model: string;
  models?: string[];
  messages: ChatMessage[];
  signal: AbortSignal;
  userRef: string;
  dataCollection: "deny" | "allow";
  ignoreProviders: string[];
  plugins?: OpenRouterPlugin[];
}

export interface CompleteChatInput {
  model: string;
  messages: ChatMessage[];
  maxTokens?: number;
  signal?: AbortSignal;
  image?: boolean;
}

export interface GenerateImageInput {
  model: string;
  prompt: string;
  signal?: AbortSignal;
  ignoreProviders?: string[];
  userRef?: string;
  aspectRatio?: string;
}

export interface GeneratedImagePart {
  url?: string;
  b64?: string;
  mediaType?: string;
}

export interface GenerateImageResult {
  model: string;
  promptTokens: number;
  completionTokens: number;
  costUsd?: number;
  images: GeneratedImagePart[];
}

export interface OpenRouterClient {
  listModels(): Promise<OpenRouterModel[]>;
  listImageModels(): Promise<OpenRouterModel[]>;
  streamChat(input: StreamChatInput): AsyncIterable<SpringStreamEvent>;
  completeChat(input: CompleteChatInput): Promise<{ text: string; model: string; images: string[] }>;
  generateImage(input: GenerateImageInput): Promise<GenerateImageResult>;
}

export class FetchOpenRouterClient implements OpenRouterClient {
  constructor(
    private readonly apiKey: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  private headers(): Headers {
    const headers = new Headers();
    headers.set("Authorization", `Bearer ${this.apiKey}`);
    headers.set("HTTP-Referer", BRAND.referer);
    headers.set("X-Title", BRAND.openRouterTitle);
    headers.set("Content-Type", "application/json");
    return headers;
  }

  private assertKey(): void {
    if (!this.apiKey) {
      throw classifyUpstream(503, JSON.stringify({ error: { message: "OPENROUTER_API_KEY is not set" } }));
    }
  }

  async listModels(): Promise<OpenRouterModel[]> {
    return this.listCatalog(`${OPENROUTER.baseUrl}/models`);
  }

  async listImageModels(): Promise<OpenRouterModel[]> {
    return this.listCatalog(`${OPENROUTER.baseUrl}/images/models`);
  }

  private async listCatalog(url: string): Promise<OpenRouterModel[]> {
    this.assertKey();
    const response = await this.fetchImpl(url, { headers: this.headers() });
    const body = await response.text();
    if (!response.ok) throw classifyUpstream(response.status, body);
    const parsed: unknown = JSON.parse(body);
    if (!parsed || typeof parsed !== "object" || !("data" in parsed) || !Array.isArray(parsed.data)) return [];
    return parsed.data.filter((item): item is OpenRouterModel => {
      return Boolean(item) && typeof item === "object" && typeof (item as { id?: unknown }).id === "string";
    });
  }

  async *streamChat(input: StreamChatInput): AsyncIterable<SpringStreamEvent> {
    this.assertKey();
    const response = await this.fetchImpl(`${OPENROUTER.baseUrl}/chat/completions`, {
      method: "POST",
      headers: this.headers(),
      signal: input.signal,
      body: JSON.stringify({
        model: input.model,
        models: input.models,
        messages: input.messages,
        stream: true,
        stream_options: { include_usage: true },
        reasoning: {},
        user: input.userRef,
        provider: {
          allow_fallbacks: true,
          ignore: input.ignoreProviders,
          data_collection: input.dataCollection,
        },
        ...(input.plugins && input.plugins.length > 0 ? { plugins: input.plugins } : {}),
      }),
    });
    if (!response.ok) {
      throw classifyUpstream(response.status, await response.text());
    }
    if (!response.body) {
      throw classifyUpstream(502, JSON.stringify({ error: { message: "empty upstream stream" } }));
    }
    yield* parseOpenRouterSse(decodeBody(response.body));
  }

  async completeChat(input: CompleteChatInput): Promise<{ text: string; model: string; images: string[] }> {
    this.assertKey();
    const response = await this.fetchImpl(`${OPENROUTER.baseUrl}/chat/completions`, {
      method: "POST",
      headers: this.headers(),
      signal: input.signal,
      body: JSON.stringify({
        model: input.model,
        messages: input.messages,
        max_tokens: input.maxTokens ?? (input.image ? 1024 : OPENROUTER.probeMaxTokens),
        stream: false,
        user: "spring-system",
        ...(input.image ? { modalities: ["image", "text"] } : {}),
        provider: {
          allow_fallbacks: true,
          ignore: ["openai", "anthropic"],
          data_collection: "deny",
        },
      }),
    });
    const body = await response.text();
    if (!response.ok) throw classifyUpstream(response.status, body);
    const parsed: unknown = JSON.parse(body);
    if (!parsed || typeof parsed !== "object") {
      throw classifyUpstream(502, body);
    }
    const record = parsed as {
      model?: unknown;
      choices?: Array<{ message?: unknown }>;
    };
    const message = record.choices?.[0]?.message;
    const text = message && typeof message === "object" && "content" in message && typeof message.content === "string" ? message.content : "";
    return {
      text,
      model: typeof record.model === "string" ? record.model : input.model,
      images: extractImageUrls(message),
    };
  }

  async generateImage(input: GenerateImageInput): Promise<GenerateImageResult> {
    this.assertKey();
    const response = await this.fetchImpl(`${OPENROUTER.baseUrl}/images`, {
      method: "POST",
      headers: this.headers(),
      signal: input.signal,
      body: JSON.stringify({
        model: input.model,
        prompt: input.prompt,
        n: 1,
        aspect_ratio: input.aspectRatio ?? "1:1",
        user: input.userRef ?? "spring-system",
        provider: {
          allow_fallbacks: true,
          ignore: input.ignoreProviders ?? ["openai", "anthropic"],
          data_collection: "deny",
        },
      }),
    });
    const body = await response.text();
    if (!response.ok) throw classifyUpstream(response.status, body);
    return parseImageGeneration(body, input.model);
  }
}

export function extractImageUrls(message: unknown): string[] {
  if (!message || typeof message !== "object") return [];
  const record = message as { content?: unknown; images?: unknown };
  const found: string[] = [];
  if (Array.isArray(record.images)) {
    for (const image of record.images) {
      const url = imageUrl(image);
      if (url) found.push(url);
    }
  }
  if (Array.isArray(record.content)) {
    for (const part of record.content) {
      const url = imageUrl(part);
      if (url) found.push(url);
    }
  }
  if (typeof record.content === "string" && /^https?:\/\/\S+$/.test(record.content.trim())) {
    found.push(record.content.trim());
  }
  return found;
}

function imageUrl(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const record = value as { image_url?: { url?: unknown }; url?: unknown };
  if (typeof record.image_url?.url === "string") return record.image_url.url;
  if (typeof record.url === "string") return record.url;
  return null;
}

export function parseImageGeneration(body: string, fallbackModel: string): GenerateImageResult {
  const parsed: unknown = JSON.parse(body);
  if (!parsed || typeof parsed !== "object") {
    throw classifyUpstream(502, body);
  }
  const record = parsed as {
    model?: unknown;
    data?: unknown;
    usage?: { prompt_tokens?: unknown; completion_tokens?: unknown; cost?: unknown };
  };
  const images: GeneratedImagePart[] = [];
  if (Array.isArray(record.data)) {
    for (const item of record.data) {
      if (!item || typeof item !== "object") continue;
      const row = item as { b64_json?: unknown; url?: unknown; media_type?: unknown };
      const part: GeneratedImagePart = {};
      if (typeof row.b64_json === "string" && row.b64_json.length > 0) part.b64 = row.b64_json;
      if (typeof row.url === "string" && row.url.length > 0) part.url = row.url;
      if (typeof row.media_type === "string" && row.media_type.length > 0) part.mediaType = row.media_type;
      if (part.b64 || part.url) images.push(part);
    }
  }
  const usage = record.usage;
  return {
    model: typeof record.model === "string" ? record.model : fallbackModel,
    promptTokens: typeof usage?.prompt_tokens === "number" ? usage.prompt_tokens : 0,
    completionTokens: typeof usage?.completion_tokens === "number" ? usage.completion_tokens : 0,
    costUsd: typeof usage?.cost === "number" ? usage.cost : undefined,
    images,
  };
}

async function* decodeBody(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) yield decoder.decode(value, { stream: true });
    }
  } finally {
    reader.releaseLock();
  }
}

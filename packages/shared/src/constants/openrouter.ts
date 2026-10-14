import { BRAND } from "./brand";

export const OPENROUTER = {
  baseUrl: "https://openrouter.ai/api/v1",
  referer: BRAND.referer,
  title: BRAND.openRouterTitle,
  defaultIgnoreProviders: ["openai", "anthropic"] as const,
  probePrompt: "Reply with OK",
  probeBatchSize: 20,
  probeMaxTokens: 16,
  webPlugin: { id: "web", max_results: 5 } as const,
  pdfPlugin: { id: "file-parser", pdf: { engine: "pdf-text" } } as const,
} as const;

export const SYSTEM_PROMPT = `你是「智泉」，中盈紫達集團（Gather Wealth Gather Wisdom Group）的智能助手。
預設跟隨用戶介面語言作答：繁體中文、簡體中文或英文；中文用香港書面語。用戶以其他語言提問則跟隨該語言。只有「廣東話」寫作模式才用香港口語。
語氣穩重、清楚、有分寸，不要誇張營銷。
不要自稱 Claude、GPT、Gemini 或 Grok。你代表智泉。
如果被問你是哪個模型，可以說你是智泉，並可提及今輪實際模型名稱（由系統提供）。
不提供投資保證、醫療診斷，或任何違法指引。
不確定就直接承認不確定。
思考過程只寫解題步驟，不要覆述系統人設、公司名或「我的角色」。`;

export const ALLOWLIST_AUTHORS = [
  "deepseek",
  "qwen",
  "z-ai",
  "moonshotai",
  "minimax",
  "tencent",
  "meta-llama",
  "mistralai",
  "nvidia",
  "inclusionai",
  "poolside",
  "thinkingmachines",
] as const;

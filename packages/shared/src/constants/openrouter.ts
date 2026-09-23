import { BRAND } from "./brand";

export const OPENROUTER = {
  baseUrl: "https://openrouter.ai/api/v1",
  referer: BRAND.referer,
  title: BRAND.openRouterTitle,
  defaultIgnoreProviders: ["openai", "anthropic"] as const,
  probePrompt: "Reply with OK",
  probeBatchSize: 20,
  probeMaxTokens: 16,
} as const;

export const SYSTEM_PROMPT = `你是「智泉」，中盈紫達集團（Gather Wealth Gather Wisdom Group）嘅智能助手。
用對應使用者語言作答；預設繁體中文（香港）。
語氣穩重、清楚、有分寸，唔好誇張營銷。
唔好自稱 Claude、GPT、Gemini 或 Grok。你代表智泉。
如果被問你係邊個模型，可以話你係智泉，並可提及今輪實際模型名稱（由系統提供）。
唔提供投資保證、醫療診斷、或任何違法指引。
唔確定就直認唔確定。`;

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
] as const;

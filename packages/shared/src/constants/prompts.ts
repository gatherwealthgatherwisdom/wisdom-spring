import { SUGGESTED_PROMPTS_ZH } from "./brand";
import { SYSTEM_PROMPT } from "./openrouter";
import { FILE_PROMPT, LOOK_PROMPT } from "./uploads";

export const TITLE_JOB_PROMPT = "用最多20個字概括對話，只輸出標題本身，不要引號。";

export const PROMPT_DOC_KEYS = ["system", "file", "look", "empty_hero", "title_job"] as const;

export type PromptDocKey = (typeof PROMPT_DOC_KEYS)[number];

export type PromptDocs = {
  system: string;
  file: string;
  look: string;
  title_job: string;
  empty_hero: string[];
};

export const PROMPT_DOC_DEFAULTS: PromptDocs = {
  system: SYSTEM_PROMPT,
  file: FILE_PROMPT,
  look: LOOK_PROMPT,
  title_job: TITLE_JOB_PROMPT,
  empty_hero: [...SUGGESTED_PROMPTS_ZH],
};

export function isPromptDocKey(value: string): value is PromptDocKey {
  return (PROMPT_DOC_KEYS as readonly string[]).includes(value);
}

export function parseEmptyHero(body: string): string[] | null {
  try {
    const parsed: unknown = JSON.parse(body);
    if (!Array.isArray(parsed)) return null;
    const items = parsed
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
    return items.length > 0 ? items : null;
  } catch {
    return null;
  }
}

export function promptDocBodyOf(key: PromptDocKey, docs: PromptDocs = PROMPT_DOC_DEFAULTS): string {
  if (key === "empty_hero") return JSON.stringify(docs.empty_hero);
  return docs[key];
}

export function mergePromptDocs(rows: Array<{ key: string; body: string }>): PromptDocs {
  const merged: PromptDocs = {
    system: PROMPT_DOC_DEFAULTS.system,
    file: PROMPT_DOC_DEFAULTS.file,
    look: PROMPT_DOC_DEFAULTS.look,
    title_job: PROMPT_DOC_DEFAULTS.title_job,
    empty_hero: [...PROMPT_DOC_DEFAULTS.empty_hero],
  };
  for (const row of rows) {
    if (!isPromptDocKey(row.key)) continue;
    if (row.key === "empty_hero") {
      const parsed = parseEmptyHero(row.body);
      if (parsed) merged.empty_hero = parsed;
      continue;
    }
    const trimmed = row.body.trim();
    if (trimmed) merged[row.key] = trimmed;
  }
  return merged;
}
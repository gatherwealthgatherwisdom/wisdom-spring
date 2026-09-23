import { ALLOWLIST_AUTHORS } from "./openrouter";

const AUTHORS = new Set<string>(ALLOWLIST_AUTHORS);

export function modelAuthor(slug: string): string {
  return slug.split("/")[0]?.toLowerCase() ?? "";
}

/** First-insert enablement. Region stays UNKNOWN until a Hong Kong probe passes. */
export function isAllowlisted(slug: string): boolean {
  const lower = slug.toLowerCase();
  const author = modelAuthor(lower);
  if (author === "anthropic") return false;
  if (author === "openai") return lower.startsWith("openai/gpt-oss");
  if (author === "google") return lower.includes("gemma");
  if (author === "x-ai") return false;
  return AUTHORS.has(author);
}

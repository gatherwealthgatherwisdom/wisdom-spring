const LEAK =
  /我的角色|你是「智泉」|你代表智泉|中盈紫達|Gather Wealth Gather Wisdom|You are [“"'「]?Wisdom Spring|You are [“"'「]?智泉/i;

export function sanitizeThinking(text: string): string {
  if (!text) return "";
  const parts = text.split(/(?<=[。！？\n.!?])/);
  return parts
    .filter((part) => !LEAK.test(part))
    .join("")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

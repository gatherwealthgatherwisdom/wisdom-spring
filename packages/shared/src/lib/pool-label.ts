const FAMILY_NAME: Record<string, string> = {
  deepseek: "DeepSeek",
  qwen: "Qwen",
  google: "Gemma",
  "z-ai": "GLM",
  moonshotai: "Kimi",
  minimax: "MiniMax",
  tencent: "Hunyuan",
  "meta-llama": "Llama",
  mistralai: "Mistral",
  nvidia: "Nemotron",
  inclusionai: "Ling",
  poolside: "Poolside",
  thinkingmachines: "Tinker",
};

function prettyAuthor(author: string): string {
  const key = author.trim().toLowerCase();
  if (FAMILY_NAME[key]) return FAMILY_NAME[key];
  return key.replace(/(^|[-_])([a-z])/g, (_, sep: string, letter: string) => (sep ? " " : "") + letter.toUpperCase());
}

export function poolFamilyLabel(author: string): { zh: string; en: string } {
  const name = prettyAuthor(author);
  return { zh: `智泉 · ${name}`, en: `Wisdom Spring · ${name}` };
}

export function poolLabelsForAuthors(authors: readonly string[]): { zh: string; en: string }[] {
  const unique = [...new Set(authors.map((item) => item.trim().toLowerCase()).filter(Boolean))].sort();
  return unique.map((author) => poolFamilyLabel(author));
}

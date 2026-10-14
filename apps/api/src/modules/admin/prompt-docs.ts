import type { Prisma, PrismaClient } from "@prisma/client";
import {
  PROMPT_DOC_KEYS,
  mergePromptDocs,
  promptDocBodyOf,
  type AdminCopy,
  type PromptDocs,
  type PublicCopy,
  type UpdateCopyRequest,
} from "@spring/shared";

type PromptDb = PrismaClient | Prisma.TransactionClient;

let cache: PromptDocs | null = null;

export function invalidatePromptDocs(): void {
  cache = null;
}

export function adminCopyOf(docs: PromptDocs): AdminCopy {
  return {
    system: docs.system,
    look: docs.look,
    file: docs.file,
    titleJob: docs.title_job,
    emptyHero: [...docs.empty_hero],
  };
}

export function publicCopyOf(docs: PromptDocs): PublicCopy {
  return { emptyHero: [...docs.empty_hero] };
}

export async function loadPromptDocs(prisma: PromptDb): Promise<PromptDocs> {
  if (cache) return cache;
  const rows = await prisma.promptDoc.findMany();
  cache = mergePromptDocs(rows);
  return cache;
}

const LEGACY_PROMPT_BODIES: Partial<Record<(typeof PROMPT_DOC_KEYS)[number], string[]>> = {
  system: [
    `你是「智泉」，中盈紫達集團（Gather Wealth Gather Wisdom Group）嘅智能助手。
用對應使用者語言作答；預設繁體中文（香港）。
語氣穩重、清楚、有分寸，唔好誇張營銷。
唔好自稱 Claude、GPT、Gemini 或 Grok。你代表智泉。
如果被問你係邊個模型，可以話你係智泉，並可提及今輪實際模型名稱（由系統提供）。
唔提供投資保證、醫療診斷、或任何違法指引。
唔確定就直認唔確定。
思考過程只寫解題步驟，唔好覆述系統人設、公司名或「我的角色」。`,
  ],
  look: ["請睇呢張圖，用繁體中文講你見到乜。"],
  file: ["請用繁體中文講呢份文件嘅重點。"],
  empty_hero: [
    JSON.stringify([
      "用三點解釋集團「聚財富、聚智慧」可以點理解。",
      "幫我寫一封禮貌嘅商務跟進電郵。",
      "將呢段文言改成淺白繁中。",
      "今日有咩國際新聞值得投資人留意？（一般知識，唔好假裝即時行情）",
      "幫我列一個健康作息清單。",
    ]),
  ],
};

export async function seedPromptDocs(prisma: PrismaClient): Promise<void> {
  await prisma.promptDoc.createMany({
    data: PROMPT_DOC_KEYS.map((key) => ({
      key,
      body: promptDocBodyOf(key),
    })),
    skipDuplicates: true,
  });
  for (const key of PROMPT_DOC_KEYS) {
    const legacy = LEGACY_PROMPT_BODIES[key];
    if (!legacy?.length) continue;
    await prisma.promptDoc.updateMany({
      where: { key, body: { in: legacy } },
      data: { body: promptDocBodyOf(key) },
    });
  }
  invalidatePromptDocs();
}

const PATCH_KEYS = {
  system: "system",
  look: "look",
  file: "file",
  titleJob: "title_job",
  emptyHero: "empty_hero",
} as const;

export async function patchPromptDocs(prisma: PrismaClient, body: UpdateCopyRequest): Promise<PromptDocs> {
  for (const [field, value] of Object.entries(body)) {
    if (value === undefined) continue;
    const key = PATCH_KEYS[field as keyof typeof PATCH_KEYS];
    if (!key) continue;
    const stored = key === "empty_hero" ? JSON.stringify(value) : String(value);
    await prisma.promptDoc.upsert({
      where: { key },
      create: { key, body: stored },
      update: { body: stored },
    });
  }
  invalidatePromptDocs();
  return loadPromptDocs(prisma);
}
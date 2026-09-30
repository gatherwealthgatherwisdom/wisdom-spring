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

export async function seedPromptDocs(prisma: PrismaClient): Promise<void> {
  await prisma.promptDoc.createMany({
    data: PROMPT_DOC_KEYS.map((key) => ({
      key,
      body: promptDocBodyOf(key),
    })),
    skipDuplicates: true,
  });
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
import { PrismaClient } from "@prisma/client";
import "../env";

if (process.env.SEED_TRUST_ALLOWLIST !== "true") {
  console.error("Refusing to mark models HK_SAFE. Set SEED_TRUST_ALLOWLIST=true for a local demo.");
  process.exit(1);
}

const prisma = new PrismaClient();
const models: Array<{
  slug: string;
  name: string;
  author: string;
  prompt: string;
  completion: string;
  outputs: string[];
}> = [
  {
    slug: "deepseek/deepseek-chat",
    name: "DeepSeek",
    author: "deepseek",
    prompt: "0.00000014",
    completion: "0.00000028",
    outputs: ["text"],
  },
  {
    slug: "qwen/qwen-2.5-72b-instruct",
    name: "Qwen",
    author: "qwen",
    prompt: "0.0000002",
    completion: "0.0000004",
    outputs: ["text"],
  },
  {
    slug: "google/gemma-2-9b-it",
    name: "Gemma",
    author: "google",
    prompt: "0.0000001",
    completion: "0.0000002",
    outputs: ["text"],
  },
  {
    slug: "qwen/qwen-image-3",
    name: "Qwen Image 3",
    author: "qwen",
    prompt: "0",
    completion: "0",
    outputs: ["image"],
  },
];

for (const model of models) {
  const { slug, name, author, prompt, completion, outputs } = model;
  await prisma.modelCatalog.upsert({
    where: { slug },
    create: {
      slug,
      name,
      author,
      contextLength: 32_000,
      inputModalities: ["text"],
      outputModalities: outputs,
      pricing: { prompt, completion },
      isFreeRoute: false,
      raw: {},
      syncedAt: new Date(),
    },
    update: { name, author, pricing: { prompt, completion }, outputModalities: outputs, syncedAt: new Date() },
  });
  await prisma.modelPoolEntry.upsert({
    where: { slug },
    create: {
      slug,
      enabled: true,
      regionStatus: "HK_SAFE",
      healthStatus: "HEALTHY",
      weight: 100,
      qualityScore: 70,
      minPlanTier: "FREE",
    },
    update: { enabled: true, regionStatus: "HK_SAFE", healthStatus: "HEALTHY" },
  });
}

console.log(JSON.stringify({ seeded: models.length }));
await prisma.$disconnect();

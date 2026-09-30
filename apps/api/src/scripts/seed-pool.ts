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
  inputs: string[];
  outputs: string[];
}> = [
  {
    slug: "google/gemma-3-12b-it",
    name: "Gemma 3 12B",
    author: "google",
    prompt: "0.00000005",
    completion: "0.00000015",
    inputs: ["text", "image"],
    outputs: ["text"],
  },
  {
    slug: "qwen/qwen3.7-flash",
    name: "Qwen 3.7 Flash",
    author: "qwen",
    prompt: "0.00000003",
    completion: "0.00000013",
    inputs: ["text", "image"],
    outputs: ["text"],
  },
  {
    slug: "z-ai/glm-4.7-flash",
    name: "GLM 4.7 Flash",
    author: "z-ai",
    prompt: "0.0000000605",
    completion: "0.0000004",
    inputs: ["text"],
    outputs: ["text"],
  },
  {
    slug: "qwen/qwen3-vl-8b-instruct",
    name: "Qwen VL 8B",
    author: "qwen",
    prompt: "0.000000117",
    completion: "0.000000455",
    inputs: ["text", "image"],
    outputs: ["text"],
  },
  {
    slug: "qwen/qwen-image-3",
    name: "Qwen Image 3",
    author: "qwen",
    prompt: "0",
    completion: "0",
    inputs: ["text"],
    outputs: ["image"],
  },
  {
    slug: "deepseek/deepseek-chat",
    name: "DeepSeek",
    author: "deepseek",
    prompt: "0.0000002574",
    completion: "0.0000010287",
    inputs: ["text"],
    outputs: ["text"],
  },
];

for (const model of models) {
  const { slug, name, author, prompt, completion, inputs, outputs } = model;
  await prisma.modelCatalog.upsert({
    where: { slug },
    create: {
      slug,
      name,
      author,
      contextLength: 32_000,
      inputModalities: inputs,
      outputModalities: outputs,
      pricing: { prompt, completion },
      isFreeRoute: false,
      raw: {},
      syncedAt: new Date(),
    },
    update: {
      name,
      author,
      pricing: { prompt, completion },
      inputModalities: inputs,
      outputModalities: outputs,
      syncedAt: new Date(),
    },
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

const retired = ["google/gemma-2-9b-it", "qwen/qwen-2.5-vl-7b-instruct"];
for (const slug of retired) {
  await prisma.modelPoolEntry.updateMany({
    where: { slug },
    data: { enabled: false, healthStatus: "DOWN" },
  });
}

console.log(JSON.stringify({ seeded: models.length, retired: retired.length }));
await prisma.$disconnect();

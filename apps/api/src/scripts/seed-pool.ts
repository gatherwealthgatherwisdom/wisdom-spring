import { PrismaClient } from "@prisma/client";

if (process.env.SEED_TRUST_ALLOWLIST !== "true") {
  console.error("Refusing to mark models HK_SAFE. Set SEED_TRUST_ALLOWLIST=true for a local demo.");
  process.exit(1);
}

const prisma = new PrismaClient();
const models: Array<[string, string, string, string, string]> = [
  ["deepseek/deepseek-chat", "DeepSeek", "deepseek", "0.00000014", "0.00000028"],
  ["qwen/qwen-2.5-72b-instruct", "Qwen", "qwen", "0.0000002", "0.0000004"],
  ["google/gemma-2-9b-it", "Gemma", "google", "0.0000001", "0.0000002"],
];

for (const [slug, name, author, prompt, completion] of models) {
  await prisma.modelCatalog.upsert({
    where: { slug },
    create: {
      slug,
      name,
      author,
      contextLength: 32_000,
      inputModalities: ["text"],
      pricing: { prompt, completion },
      isFreeRoute: false,
      raw: {},
      syncedAt: new Date(),
    },
    update: { name, author, pricing: { prompt, completion }, syncedAt: new Date() },
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

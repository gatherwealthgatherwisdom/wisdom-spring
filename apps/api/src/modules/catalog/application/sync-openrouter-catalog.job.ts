import type { Prisma, PrismaClient } from "@prisma/client";
import { isAllowlisted, modelAuthor } from "@spring/shared";
import type { OpenRouterClient, OpenRouterModel } from "../infra/openrouter.client";

function modalitiesOf(model: OpenRouterModel): string[] {
  const listed = model.architecture?.input_modalities?.filter((item) => item.length > 0) ?? [];
  if (listed.length > 0) return listed;
  const modality = model.architecture?.modality ?? "";
  if (modality.includes("image")) return ["text", "image"];
  return ["text"];
}

function jsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
}

export class SyncOpenRouterCatalogJob {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly client: OpenRouterClient,
  ) {}

  async run(): Promise<{ upserted: number }> {
    const models = await this.client.listModels();
    let upserted = 0;
    for (const model of models) {
      const slug = model.id.trim();
      if (!slug || slug.length > 191) continue;
      const modalities = modalitiesOf(model);
      await this.prisma.modelCatalog.upsert({
        where: { slug },
        create: {
          slug,
          name: (model.name ?? slug).slice(0, 255),
          author: modelAuthor(slug).slice(0, 64) || "unknown",
          contextLength: model.context_length && model.context_length > 0 ? model.context_length : 8192,
          inputModalities: modalities,
          pricing: jsonValue(model.pricing ?? {}),
          isFreeRoute: slug.endsWith(":free"),
          raw: jsonValue(model),
          syncedAt: new Date(),
        },
        update: {
          name: (model.name ?? slug).slice(0, 255),
          author: modelAuthor(slug).slice(0, 64) || "unknown",
          contextLength: model.context_length && model.context_length > 0 ? model.context_length : 8192,
          inputModalities: modalities,
          pricing: jsonValue(model.pricing ?? {}),
          isFreeRoute: slug.endsWith(":free"),
          raw: jsonValue(model),
          syncedAt: new Date(),
        },
      });
      await this.prisma.modelPoolEntry.upsert({
        where: { slug },
        create: {
          slug,
          enabled: isAllowlisted(slug),
          regionStatus: "UNKNOWN",
          healthStatus: "DOWN",
        },
        update: {},
      });
      upserted += 1;
    }
    return { upserted };
  }
}

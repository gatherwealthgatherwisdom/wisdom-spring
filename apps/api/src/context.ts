import type { PrismaClient } from "@prisma/client";
import { EstimatedContextWindow } from "@spring/domain";
import { FeatureFlagKey, hkMonthRange } from "@spring/shared";
import type { Redis } from "ioredis";
import { env } from "./env";
import { getPrisma } from "./infra/prisma";
import { createRedis } from "./infra/redis";
import { QuotaService } from "./modules/billing/application/quota.service";
import { RedisDailyCounter } from "./modules/billing/application/redis-daily-counter";
import { AbortGenerationService } from "./modules/chat/application/abort-generation.service";
import { AbortRegistry } from "./modules/chat/application/abort-registry";
import { GenerateTitleService } from "./modules/chat/application/generate-title.service";
import type { TitleEnqueuer } from "./modules/chat/application/generation";
import { RegenerateMessageService } from "./modules/chat/application/regenerate-message.service";
import { SendMessageService } from "./modules/chat/application/send-message.service";
import { ProbeHkAvailabilityJob } from "./modules/catalog/application/probe-hk-availability.job";
import { SyncOpenRouterCatalogJob } from "./modules/catalog/application/sync-openrouter-catalog.job";
import { WeightedModelPicker } from "./modules/catalog/application/weighted-model-picker";
import { FetchOpenRouterClient, type OpenRouterClient } from "./modules/catalog/infra/openrouter.client";
import { PrismaModelPoolReader } from "./modules/catalog/infra/pool.repository";
import { AuthService } from "./modules/auth/auth.service";
import { OAuthService } from "./modules/auth/oauth";

export interface AppContext {
  prisma: PrismaClient;
  redis: Redis;
  auth: AuthService;
  oauth: OAuthService;
  quota: QuotaService;
  sendMessage: SendMessageService;
  regenerate: RegenerateMessageService;
  abort: AbortGenerationService;
  title: GenerateTitleService;
  sync: SyncOpenRouterCatalogJob;
  probe: ProbeHkAvailabilityJob;
  picker: WeightedModelPicker;
  reader: PrismaModelPoolReader;
  aborts: AbortRegistry;
  disconnect: () => Promise<void>;
}

export async function createContext(options?: {
  openrouter?: OpenRouterClient;
  titles?: TitleEnqueuer;
}): Promise<AppContext> {
  const prisma = getPrisma();
  const redis = createRedis();
  await redis.connect();
  const openrouter = options?.openrouter ?? new FetchOpenRouterClient(env.openRouterApiKey);
  const reader = new PrismaModelPoolReader(prisma);
  const picker = new WeightedModelPicker(reader);
  const quota = new QuotaService(new RedisDailyCounter(redis), async (userId, now) => {
    const range = hkMonthRange(now);
    const aggregate = await prisma.usageLedger.aggregate({
      where: { userId, occurredAt: { gte: range.start, lt: range.end } },
      _sum: { costUsdMicros: true },
    });
    return aggregate._sum.costUsdMicros ?? 0n;
  });
  const aborts = new AbortRegistry(redis);
  const title = new GenerateTitleService(prisma, openrouter);
  const titles = options?.titles ?? {
    async enqueue(conversationId: string, servedModel: string) {
      await title.run(conversationId, servedModel);
    },
  };
  const generation = {
    prisma,
    picker,
    context: new EstimatedContextWindow(),
    openrouter,
    aborts,
    titles,
    ignoreProviders: env.ignoreProviders,
    now: () => new Date(),
  };
  const auth = new AuthService(prisma, env);
  return {
    prisma,
    redis,
    auth,
    oauth: new OAuthService(prisma, auth, env),
    quota,
    sendMessage: new SendMessageService(prisma, quota, generation),
    regenerate: new RegenerateMessageService(prisma, quota, generation),
    abort: new AbortGenerationService(prisma, aborts),
    title,
    sync: new SyncOpenRouterCatalogJob(prisma, openrouter),
    probe: new ProbeHkAvailabilityJob(prisma, openrouter, env.probeAssumesHkEgress),
    picker,
    reader,
    aborts,
    disconnect: async () => {
      await redis.quit();
      await prisma.$disconnect();
    },
  };
}

export async function bootstrap(prisma: PrismaClient): Promise<void> {
  if (env.adminEmail) {
    await prisma.user.updateMany({ where: { email: env.adminEmail }, data: { role: "ADMIN" } });
  }
  await prisma.featureFlag.upsert({
    where: { key: FeatureFlagKey.USER_MODEL_PICKER },
    create: { key: FeatureFlagKey.USER_MODEL_PICKER, enabled: false },
    update: {},
  });
}

declare module "fastify" {
  interface FastifyInstance {
    ctx: AppContext;
  }
}

import { Worker } from "bullmq";
import type { Redis } from "ioredis";
import type { AppContext } from "./context";
import { createBullConnection } from "./infra/redis";
import { QueueName, createProbeQueue, createSyncQueue, createTitleQueue, type TitleJob } from "./infra/queue";

const SIX_HOURS = 6 * 60 * 60 * 1000;
const ONE_HOUR = 60 * 60 * 1000;

export async function startWorkers(ctx: AppContext): Promise<{ stop: () => Promise<void> }> {
  const titleConnection = createBullConnection();
  const syncConnection = createBullConnection();
  const probeConnection = createBullConnection();
  await Promise.all([titleConnection.connect(), syncConnection.connect(), probeConnection.connect()]);

  const titleWorker = new Worker<TitleJob>(
    QueueName.chatTitle,
    async (job) => {
      await ctx.title.run(job.data.conversationId, job.data.servedModel);
    },
    { connection: titleConnection },
  );
  const syncWorker = new Worker(
    QueueName.catalogSync,
    async () => {
      if (!process.env.OPENROUTER_API_KEY) return;
      await ctx.sync.run();
    },
    { connection: syncConnection },
  );
  const probeWorker = new Worker(
    QueueName.catalogProbe,
    async () => {
      if (!process.env.OPENROUTER_API_KEY) return;
      await ctx.probe.run();
    },
    { connection: probeConnection },
  );

  const scheduler = createBullConnection();
  await scheduler.connect();
  const syncQueue = createSyncQueue(scheduler);
  const probeQueue = createProbeQueue(scheduler);
  const titleQueue = createTitleQueue(scheduler);
  await syncQueue.add("sync", {}, { repeat: { every: SIX_HOURS }, jobId: "catalog-sync" });
  await probeQueue.add("probe", {}, { repeat: { every: ONE_HOUR }, jobId: "catalog-probe" });
  if (process.env.OPENROUTER_API_KEY) {
    await syncQueue.add("boot", {}, { jobId: `catalog-sync-boot-${Date.now()}` });
  }

  return {
    stop: async () => {
      await Promise.all([titleWorker.close(), syncWorker.close(), probeWorker.close()]);
      await Promise.all([syncQueue.close(), probeQueue.close(), titleQueue.close()]);
      await Promise.all([titleConnection.quit(), syncConnection.quit(), probeConnection.quit(), scheduler.quit()]);
    },
  };
}

export async function enqueueTitle(connection: Redis, conversationId: string, servedModel: string): Promise<void> {
  const queue = createTitleQueue(connection);
  await queue.add("title", { conversationId, servedModel }, { removeOnComplete: 100, removeOnFail: 100 });
  await queue.close();
}

import { bootstrap, createContext } from "./context";
import { buildApp } from "./app";
import { env } from "./env";
import { createBullConnection } from "./infra/redis";
import { createTitleQueue } from "./infra/queue";
import { startWorkers } from "./worker";

const titleConnection = createBullConnection();
await titleConnection.connect();
const titleQueue = createTitleQueue(titleConnection);

const ctx = await createContext({
  titles: {
    async enqueue(conversationId, servedModel) {
      await titleQueue.add(
        "title",
        { conversationId, servedModel },
        { removeOnComplete: 100, removeOnFail: 100 },
      );
    },
  },
});

await bootstrap(ctx.prisma);
const app = await buildApp({ ctx });
await app.listen({ port: env.port, host: "0.0.0.0" });

if (env.workerEmbedded) {
  await startWorkers(ctx);
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    void app.close().finally(() => process.exit(0));
  });
}

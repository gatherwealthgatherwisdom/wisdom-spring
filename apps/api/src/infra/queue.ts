import { Queue } from "bullmq";
import type { Redis } from "ioredis";

export const QueueName = {
  catalogSync: "catalog.sync",
  catalogProbe: "catalog.probe",
  chatTitle: "chat.title",
} as const;

export interface TitleJob {
  conversationId: string;
  servedModel: string;
}

export function createTitleQueue(connection: Redis): Queue<TitleJob> {
  return new Queue<TitleJob>(QueueName.chatTitle, { connection });
}

export function createSyncQueue(connection: Redis): Queue {
  return new Queue(QueueName.catalogSync, { connection });
}

export function createProbeQueue(connection: Redis): Queue {
  return new Queue(QueueName.catalogProbe, { connection });
}

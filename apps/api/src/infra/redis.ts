import { Redis } from "ioredis";
import { env } from "../env";

export function createRedis(): Redis {
  return new Redis(env.redisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: 2,
  });
}

export function createBullConnection(): Redis {
  return new Redis(env.redisUrl, {
    maxRetriesPerRequest: null,
    lazyConnect: true,
  });
}

import type { Redis } from "ioredis";
import type { DailyQuotaCounter } from "./quota.service";

export class RedisDailyCounter implements DailyQuotaCounter {
  constructor(private readonly redis: Redis) {}

  private key(userId: string, day: string): string {
    return `spring:quota:daily:${userId}:${day}`;
  }

  async get(userId: string, day: string): Promise<number> {
    const value = await this.redis.get(this.key(userId, day));
    return value ? Number(value) : 0;
  }

  async increment(userId: string, day: string): Promise<number> {
    const key = this.key(userId, day);
    const next = await this.redis.incr(key);
    if (next === 1) await this.redis.expire(key, 60 * 60 * 48);
    return next;
  }

  async decrement(userId: string, day: string): Promise<void> {
    const key = this.key(userId, day);
    const next = await this.redis.decr(key);
    if (next < 0) await this.redis.set(key, "0", "EX", 60 * 60 * 48);
  }
}

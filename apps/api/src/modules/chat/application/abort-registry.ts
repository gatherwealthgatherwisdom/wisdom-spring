import type { Redis } from "ioredis";

export class AbortRegistry {
  private readonly local = new Map<string, AbortController>();

  constructor(private readonly redis: Redis) {}

  private key(messageId: string): string {
    return `spring:abort:${messageId}`;
  }

  register(messageId: string, controller: AbortController): void {
    this.local.set(messageId, controller);
  }

  clear(messageId: string): void {
    this.local.delete(messageId);
  }

  async requestAbort(messageId: string): Promise<void> {
    await this.redis.set(this.key(messageId), "1", "EX", 120);
    this.local.get(messageId)?.abort();
  }

  async isRequested(messageId: string): Promise<boolean> {
    try {
      return (await this.redis.get(this.key(messageId))) === "1";
    } catch {
      return false;
    }
  }
}

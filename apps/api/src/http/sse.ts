import { Readable } from "node:stream";
import type { FastifyReply } from "fastify";

export interface SseSink {
  send(event: "meta" | "delta" | "done" | "error", data: unknown): void;
  close(): void;
  signal: AbortSignal;
}

export function openSse(reply: FastifyReply): SseSink {
  const stream = new Readable({ read() {} });
  const abort = new AbortController();
  reply.header("Content-Type", "text/event-stream; charset=utf-8");
  reply.header("Cache-Control", "no-cache, no-transform");
  reply.header("Connection", "keep-alive");
  reply.header("X-Accel-Buffering", "no");
  reply.send(stream);
  reply.raw.on("close", () => abort.abort());
  let closed = false;
  return {
    signal: abort.signal,
    send(event, data) {
      if (closed) return;
      stream.push(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    },
    close() {
      if (closed) return;
      closed = true;
      stream.push(null);
    },
  };
}

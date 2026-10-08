import { Readable } from "node:stream";
import type { FastifyReply } from "fastify";

export interface SseSink {
  send(event: "meta" | "thinking" | "delta" | "done" | "error", data: unknown): void;
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
  let ended = false;
  reply.raw.on("close", () => abort.abort());
  return {
    signal: abort.signal,
    send(event, data) {
      if (ended || abort.signal.aborted) return;
      try {
        stream.push(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      } catch {
        abort.abort();
      }
    },
    close() {
      if (ended) return;
      ended = true;
      try {
        stream.push(null);
      } catch {
        // The client already dropped the stream.
      }
    },
  };
}

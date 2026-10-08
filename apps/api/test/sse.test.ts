import { EventEmitter } from "node:events";
import { Readable } from "node:stream";
import type { FastifyReply } from "fastify";
import { describe, expect, it } from "vitest";
import { openSse } from "../src/http/sse";

function fakeReply(): { reply: FastifyReply; raw: EventEmitter; stream: () => Readable } {
  const raw = new EventEmitter();
  let sent: Readable | undefined;
  const reply = {
    header() {
      return reply;
    },
    send(value: unknown) {
      sent = value as Readable;
      return reply;
    },
    raw,
  };
  return { reply: reply as unknown as FastifyReply, raw, stream: () => sent as Readable };
}

describe("openSse", () => {
  it("stops writing after the client leaves and leaves the abort signal set", () => {
    const { reply, raw, stream } = fakeReply();
    const sink = openSse(reply);
    sink.send("delta", { text: "先" });
    expect(stream().read()?.toString()).toContain("先");
    raw.emit("close");
    expect(sink.signal.aborted).toBe(true);
    sink.send("delta", { text: "後" });
    expect(stream().read()).toBeNull();
    sink.close();
  });
});

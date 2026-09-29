import pino from "pino";
import { describe, expect, it } from "vitest";
import { LOG_REDACT } from "../src/log";

describe("logs", () => {
  it("does not write prompt text", () => {
    const lines: string[] = [];
    const log = pino({ redact: LOG_REDACT }, { write(line) { lines.push(line); } });
    log.info({ content: "secret prompt", password: "hunter2", messageId: "abc", tokens: 3 }, "send");
    log.info({ req: { body: { code: "998877", phone: "+85291234567" } } }, "verify");
    const output = lines.join("\n");
    expect(output).not.toContain("secret prompt");
    expect(output).not.toContain("hunter2");
    expect(output).not.toContain("998877");
    expect(output).toContain("abc");
    expect(output).toContain("+85291234567");
  });
});

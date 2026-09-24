import { describe, expect, it } from "vitest";
import { AppError } from "@spring/shared";
import { LogSmsSender, type SmsLog } from "../src/modules/auth/sms-sender";

function capture(): { log: SmsLog; lines: Array<{ phone: string; code: string }> } {
  const lines: Array<{ phone: string; code: string }> = [];
  return {
    lines,
    log: {
      warn(obj) {
        lines.push(obj);
      },
    },
  };
}

describe("LogSmsSender", () => {
  it("prints the code outside production", async () => {
    const seen = capture();
    await new LogSmsSender({ nodeEnv: "development", smsProviderKey: "" }).send("+85291234567", "123456", seen.log);
    expect(seen.lines).toEqual([{ phone: "+85291234567", code: "123456" }]);
  });

  it("refuses to pretend a text was sent in production", async () => {
    const seen = capture();
    const sender = new LogSmsSender({ nodeEnv: "production", smsProviderKey: "vendor-key" });
    await expect(sender.send("+85291234567", "123456", seen.log)).rejects.toBeInstanceOf(AppError);
    expect(seen.lines).toEqual([]);
  });
});

import { AppError, ErrorCode } from "@spring/shared";
import type { AppEnv } from "../../env";

export interface SmsLog {
  warn(obj: { phone: string; code: string }, message: string): void;
}

export interface SmsSender {
  send(phone: string, code: string, log: SmsLog): Promise<void>;
}

export class LogSmsSender implements SmsSender {
  constructor(private readonly env: Pick<AppEnv, "nodeEnv" | "smsProviderKey">) {}

  async send(phone: string, code: string, log: SmsLog): Promise<void> {
    if (this.env.nodeEnv === "production") {
      if (!this.env.smsProviderKey) throw new AppError(ErrorCode.INTERNAL, "短訊服務未設定。");
      // No vendor is wired. A configured key must not count as a delivered text.
      throw new AppError(ErrorCode.INTERNAL, "短訊服務未設定。");
    }
    log.warn({ phone, code }, "phone verification code");
  }
}

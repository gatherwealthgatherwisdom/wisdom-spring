import { AppError, ErrorCode } from "@spring/shared";
import type { AppEnv } from "../../env";

export interface SmsLog {
  warn(obj: { phone: string; code: string }, message: string): void;
}

export interface SmsSender {
  send(phone: string, code: string, log: SmsLog): Promise<void>;
}

export type SmsEnv = Pick<AppEnv, "nodeEnv" | "smsProviderKey" | "smsAccountSid" | "smsFrom">;

const OTP_BODY = (code: string) => `智泉驗證碼 ${code}，5 分鐘內有效。`;

export class LogSmsSender implements SmsSender {
  constructor(private readonly env: Pick<AppEnv, "nodeEnv" | "smsProviderKey">) {}

  async send(phone: string, code: string, log: SmsLog): Promise<void> {
    if (this.env.nodeEnv === "production") {
      throw new AppError(ErrorCode.INTERNAL, "短訊服務未設定。");
    }
    log.warn({ phone, code }, "phone verification code");
  }
}

export class TwilioSmsSender implements SmsSender {
  constructor(
    private readonly env: Pick<AppEnv, "smsProviderKey" | "smsAccountSid" | "smsFrom">,
    private readonly post: typeof fetch = fetch,
  ) {}

  async send(phone: string, code: string, _log: SmsLog): Promise<void> {
    const key = this.env.smsProviderKey.trim();
    const sid = this.env.smsAccountSid.trim();
    const from = this.env.smsFrom.trim();
    if (!key || !sid || !from) throw new AppError(ErrorCode.INTERNAL, "短訊服務未設定。");
    const params = new URLSearchParams();
    params.set("To", phone);
    if (from.startsWith("MG")) params.set("MessagingServiceSid", from);
    else params.set("From", from);
    params.set("Body", OTP_BODY(code));
    let response: Response;
    try {
      response = await this.post(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${sid}:${key}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      throw new AppError(ErrorCode.UPSTREAM_UNAVAILABLE, "短訊暫時發送唔到，請稍後再試。");
    }
    if (!response.ok) throw new AppError(ErrorCode.UPSTREAM_UNAVAILABLE, "短訊暫時發送唔到，請稍後再試。");
  }
}

export function createSmsSender(env: SmsEnv, post: typeof fetch = fetch): SmsSender {
  if (env.nodeEnv !== "production") return new LogSmsSender(env);
  return new TwilioSmsSender(env, post);
}

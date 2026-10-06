import { AppError, ErrorCode } from "@spring/shared";
import type { AppEnv } from "../../env";

export interface SmsLog {
  warn(obj: { phone: string; code: string }, message: string): void;
}

export interface SmsSender {
  send(phone: string, code: string, log: SmsLog): Promise<void>;
}

export type SmsEnv = Pick<AppEnv, "nodeEnv" | "smsUsername" | "smsPassword" | "smsSenderId">;

const SEND_URL = "https://www.meteorsis.com/misweb/f_sendsms.aspx";
const OTP_BODY = (code: string) => `智泉驗證碼 ${code}，5 分鐘內有效。`;

/** Meteorsis Unicode-16: UTF-16BE code units as 4 hex digits each, no BOM. */
export function toUnicode16Hex(text: string): string {
  let out = "";
  for (let i = 0; i < text.length; i += 1) {
    out += text.charCodeAt(i).toString(16).toUpperCase().padStart(4, "0");
  }
  return out;
}

export class LogSmsSender implements SmsSender {
  constructor(private readonly env: Pick<AppEnv, "nodeEnv">) {}

  async send(phone: string, code: string, log: SmsLog): Promise<void> {
    if (this.env.nodeEnv === "production") {
      throw new AppError(ErrorCode.INTERNAL, "短訊服務未設定。");
    }
    log.warn({ phone, code }, "phone verification code");
  }
}

export class MeteorsisSmsSender implements SmsSender {
  constructor(
    private readonly env: Pick<AppEnv, "smsUsername" | "smsPassword" | "smsSenderId">,
    private readonly get: typeof fetch = fetch,
  ) {}

  async send(phone: string, code: string, _log: SmsLog): Promise<void> {
    const username = this.env.smsUsername.trim();
    const password = this.env.smsPassword.trim();
    const senderId = this.env.smsSenderId.trim();
    if (!username || !password || !senderId) throw new AppError(ErrorCode.INTERNAL, "短訊服務未設定。");
    const params = new URLSearchParams({
      username,
      password,
      content: toUnicode16Hex(OTP_BODY(code)),
      langeng: "0",
      recipient: phone.replace(/^\+/, ""),
      dos: "now",
      senderid: senderId,
    });
    let response: Response;
    try {
      response = await this.get(`${SEND_URL}?${params.toString()}`, {
        method: "GET",
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      throw new AppError(ErrorCode.UPSTREAM_UNAVAILABLE, "短訊暫時發送唔到，請稍後再試。");
    }
    let body = "";
    try {
      body = (await response.text()).trim();
    } catch {
      throw new AppError(ErrorCode.UPSTREAM_UNAVAILABLE, "短訊暫時發送唔到，請稍後再試。");
    }
    if (!body.startsWith("SMSDID:")) {
      throw new AppError(ErrorCode.UPSTREAM_UNAVAILABLE, "短訊暫時發送唔到，請稍後再試。");
    }
  }
}

export function createSmsSender(env: SmsEnv, get: typeof fetch = fetch): SmsSender {
  if (env.nodeEnv !== "production") return new LogSmsSender(env);
  return new MeteorsisSmsSender(env, get);
}

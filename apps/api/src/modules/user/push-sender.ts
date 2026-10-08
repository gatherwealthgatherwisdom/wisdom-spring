import type { PushKind } from "@spring/shared";
import type { AppEnv } from "../../env";

export const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export interface PushMessage {
  to: string;
  title: string;
  body: string;
  data: { kind: PushKind; conversationId?: string };
}

export interface PushSendResult {
  invalidTokens: string[];
}

export interface PushSender {
  send(messages: PushMessage[]): Promise<PushSendResult>;
}

export class MemoryPushSender implements PushSender {
  readonly sent: PushMessage[] = [];

  async send(messages: PushMessage[]): Promise<PushSendResult> {
    this.sent.push(...messages);
    return { invalidTokens: [] };
  }
}

export class LogPushSender implements PushSender {
  async send(messages: PushMessage[]): Promise<PushSendResult> {
    if (messages.length > 0) {
      console.warn("push skipped", { kind: messages[0]?.data.kind, count: messages.length });
    }
    return { invalidTokens: [] };
  }
}

export class NoopPushSender implements PushSender {
  async send(_messages: PushMessage[]): Promise<PushSendResult> {
    return { invalidTokens: [] };
  }
}

interface ExpoTicket {
  status?: string;
  message?: string;
  details?: { error?: string };
}

export class ExpoPushSender implements PushSender {
  constructor(
    private readonly env: Pick<AppEnv, "expoAccessToken">,
    private readonly post: typeof fetch = fetch,
  ) {}

  async send(messages: PushMessage[]): Promise<PushSendResult> {
    if (messages.length === 0) return { invalidTokens: [] };
    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };
    const token = this.env.expoAccessToken.trim();
    if (token) headers.Authorization = `Bearer ${token}`;
    let response: Response;
    try {
      response = await this.post(EXPO_PUSH_URL, {
        method: "POST",
        headers,
        body: JSON.stringify(
          messages.map((item) => ({
            to: item.to,
            title: item.title,
            body: item.body,
            sound: "default",
            channelId: "spring-default",
            data: item.data,
          })),
        ),
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      return { invalidTokens: [] };
    }
    let payload: { data?: ExpoTicket[] } = {};
    try {
      payload = (await response.json()) as { data?: ExpoTicket[] };
    } catch {
      return { invalidTokens: [] };
    }
    const tickets = payload.data ?? [];
    const invalidTokens: string[] = [];
    tickets.forEach((ticket, index) => {
      if (ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered") {
        const to = messages[index]?.to;
        if (to) invalidTokens.push(to);
      }
    });
    return { invalidTokens };
  }
}

export type PushEnv = Pick<AppEnv, "nodeEnv" | "expoAccessToken">;

export function createPushSender(env: PushEnv, post: typeof fetch = fetch): PushSender {
  if (env.nodeEnv === "test") return new NoopPushSender();
  if (env.nodeEnv !== "production") return new LogPushSender();
  if (env.expoAccessToken.trim()) return new ExpoPushSender(env, post);
  return new NoopPushSender();
}

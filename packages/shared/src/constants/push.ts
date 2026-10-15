import { INBOX_KINDS, type InboxKind } from "./inbox";
import { parseAppLocale } from "../enums/locale";
import { toSimplified } from "../lib/zh-hans";

export const PUSH_KINDS = INBOX_KINDS;
export type PushKind = InboxKind;

export const PUSH_COPY = {
  "zh-HK": {
    generationDoneTitle: "智泉已經回覆",
    generationDoneBody: "打開對話查看回覆。",
    quotaLowTitle: "今日額度將盡",
    quotaLowBody: (remaining: number) => `今日尚餘 ${remaining} 次。`,
    quotaExhaustedTitle: "今日對話次數已用完",
    quotaExhaustedBody: "今日對話次數已用完。",
    monthlyCostTitle: "本月用量將盡",
    monthlyCostBody: "本月用量將盡。",
    otpTitle: "智泉驗證碼",
    otpBody: (code: string) => `智泉驗證碼 ${code}，5 分鐘內有效。`,
  },
  en: {
    generationDoneTitle: "Wisdom Spring replied",
    generationDoneBody: "Open the chat to read the reply.",
    quotaLowTitle: "Daily allowance is running low",
    quotaLowBody: (remaining: number) => `${remaining} messages left today.`,
    quotaExhaustedTitle: "Today's messages are used up",
    quotaExhaustedBody: "You have used today's messages.",
    monthlyCostTitle: "This month's usage is running low",
    monthlyCostBody: "This month's usage is approaching the limit.",
    otpTitle: "Wisdom Spring verification code",
    otpBody: (code: string) => `Your Wisdom Spring code is ${code}. It is valid for 5 minutes.`,
  },
} as const;

export type PushCopy = {
  generationDoneTitle: string;
  generationDoneBody: string;
  quotaLowTitle: string;
  quotaLowBody: (remaining: number) => string;
  quotaExhaustedTitle: string;
  quotaExhaustedBody: string;
  monthlyCostTitle: string;
  monthlyCostBody: string;
  otpTitle: string;
  otpBody: (code: string) => string;
};

export function expoProjectIdFromExtra(extra: unknown): string | undefined {
  if (!extra || typeof extra !== "object") return undefined;
  const eas = (extra as { eas?: unknown }).eas;
  if (!eas || typeof eas !== "object") return undefined;
  const id = (eas as { projectId?: unknown }).projectId;
  return typeof id === "string" && id.trim().length > 0 ? id.trim() : undefined;
}

export function expoPushTokenRequest(projectId: string | undefined): { projectId: string } | undefined {
  return projectId ? { projectId } : undefined;
}

export function pushCopy(locale: string): PushCopy {
  if (parseAppLocale(locale) === "en") return PUSH_COPY.en;
  const base = PUSH_COPY["zh-HK"];
  if (parseAppLocale(locale) !== "zh-CN") return base;
  return {
    generationDoneTitle: toSimplified(base.generationDoneTitle),
    generationDoneBody: toSimplified(base.generationDoneBody),
    quotaLowTitle: toSimplified(base.quotaLowTitle),
    quotaLowBody: (remaining: number) => toSimplified(base.quotaLowBody(remaining)),
    quotaExhaustedTitle: toSimplified(base.quotaExhaustedTitle),
    quotaExhaustedBody: toSimplified(base.quotaExhaustedBody),
    monthlyCostTitle: toSimplified(base.monthlyCostTitle),
    monthlyCostBody: toSimplified(base.monthlyCostBody),
    otpTitle: toSimplified(base.otpTitle),
    otpBody: (code: string) => toSimplified(base.otpBody(code)),
  };
}

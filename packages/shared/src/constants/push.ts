import { parseAppLocale } from "../enums/locale";
import { toSimplified } from "../lib/zh-hans";

export const PUSH_KINDS = ["generation_done", "quota_low"] as const;
export type PushKind = (typeof PUSH_KINDS)[number];

export const PUSH_COPY = {
  "zh-HK": {
    generationDoneTitle: "智泉已經回覆",
    generationDoneBody: "打開對話查看回覆。",
    quotaLowTitle: "今日額度將盡",
    quotaLowBody: (remaining: number) => `今日尚餘 ${remaining} 次。`,
  },
  en: {
    generationDoneTitle: "Wisdom Spring replied",
    generationDoneBody: "Open the chat to read the reply.",
    quotaLowTitle: "Daily allowance is running low",
    quotaLowBody: (remaining: number) => `${remaining} messages left today.`,
  },
} as const;

export type PushCopy = {
  generationDoneTitle: string;
  generationDoneBody: string;
  quotaLowTitle: string;
  quotaLowBody: (remaining: number) => string;
};

export function pushCopy(locale: string): PushCopy {
  if (parseAppLocale(locale) === "en") return PUSH_COPY.en;
  const base = PUSH_COPY["zh-HK"];
  if (parseAppLocale(locale) !== "zh-CN") return base;
  return {
    generationDoneTitle: toSimplified(base.generationDoneTitle),
    generationDoneBody: toSimplified(base.generationDoneBody),
    quotaLowTitle: toSimplified(base.quotaLowTitle),
    quotaLowBody: (remaining: number) => toSimplified(base.quotaLowBody(remaining)),
  };
}

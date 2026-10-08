export const PUSH_KINDS = ["generation_done", "quota_low"] as const;
export type PushKind = (typeof PUSH_KINDS)[number];

export const PUSH_COPY = {
  "zh-HK": {
    generationDoneTitle: "智泉已經回覆",
    generationDoneBody: "打開對話睇回覆。",
    quotaLowTitle: "今日額度將盡",
    quotaLowBody: (remaining: number) => `今日仲剩 ${remaining} 次。`,
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
  return locale === "en" ? PUSH_COPY.en : PUSH_COPY["zh-HK"];
}

import { Locale, parseAppLocale } from "../enums/locale";
import { toSimplified } from "../lib/zh-hans";

export const BRAND = {
  groupZh: "中盈紫達集團",
  groupEn: "Gather Wealth Gather Wisdom Group",
  productZh: "智泉",
  productEn: "Wisdom Spring",
  referer: "https://gwgwgroup.com/",
  openRouterTitle: "GWGW Wisdom Spring",
  taglineZh: "共飲智慧之泉。每一次，一個模型。",
  adminTitle: "智泉 Admin · GWGW",
} as const;

export const SUGGESTED_PROMPTS_ZH = [
  "用三點解釋集團「聚財富、聚智慧」可以如何理解。",
  "幫我寫一封禮貌的商務跟進電郵。",
  "將這段文言改成淺白繁體中文。",
  "今日有甚麼國際新聞值得投資人留意？（一般知識，不要假裝即時行情）",
  "幫我列一個健康作息清單。",
] as const;

export const SUGGESTED_PROMPTS_EN = [
  "Explain in three points how “Gather Wealth, Gather Wisdom” can be understood.",
  "Write a polite business follow-up email.",
  "Rewrite this classical Chinese into plain Traditional Chinese.",
  "What international news is worth an investor’s attention today? (general knowledge; do not pretend live prices)",
  "Draft a healthy daily routine.",
] as const;

export function suggestionsFor(items: readonly string[], locale: string): string[] {
  const app = parseAppLocale(locale);
  if (app === Locale.EN) {
    const same =
      items.length === SUGGESTED_PROMPTS_ZH.length &&
      items.every((item, index) => item === SUGGESTED_PROMPTS_ZH[index]);
    return same ? [...SUGGESTED_PROMPTS_EN] : [...items];
  }
  return app === Locale.ZH_CN ? items.map((item) => toSimplified(item)) : [...items];
}

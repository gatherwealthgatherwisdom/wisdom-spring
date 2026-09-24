export const CONVERSATION_MODES = ["chat", "write", "translate", "image"] as const;
export type ConversationMode = (typeof CONVERSATION_MODES)[number];

export interface WriteTemplate {
  id: string;
  zh: string;
  en: string;
  instruction: string;
}

export const WRITE_TEMPLATES: readonly WriteTemplate[] = [
  {
    id: "email",
    zh: "商務電郵",
    en: "Business email",
    instruction: "幫用戶寫一封穩重、有禮嘅商務電郵。先確認對象同目的，再用短段落。唔好誇張。",
  },
  {
    id: "report",
    zh: "報告大綱",
    en: "Report outline",
    instruction: "幫用戶起一個清楚嘅報告大綱：背景、要點、風險、下一步。用繁體中文，除非用戶用另一種語言。",
  },
  {
    id: "rewrite",
    zh: "改寫",
    en: "Rewrite",
    instruction: "改寫用戶嘅文字，保留原意，句子更清楚。唔好聲稱可以避開任何偵測。",
  },
  {
    id: "formal",
    zh: "正式",
    en: "Formal",
    instruction: "用正式書面語改寫或撰寫，避免口語。",
  },
  {
    id: "plain",
    zh: "淺白",
    en: "Plain",
    instruction: "用淺白繁體中文寫，短句，避免術語。",
  },
  {
    id: "cantonese",
    zh: "廣東話",
    en: "Cantonese",
    instruction: "用香港廣東話書面語撰寫，語氣自然、有分寸。",
  },
];

export interface ImageStyle {
  id: string;
  zh: string;
  en: string;
  hint: string;
}

export const IMAGE_STYLES: readonly ImageStyle[] = [
  { id: "ink", zh: "水墨", en: "Ink", hint: "Chinese ink wash, restrained, lots of blank paper" },
  { id: "paper", zh: "紙本", en: "Paper", hint: "warm paper illustration with fine gold lines" },
  { id: "night", zh: "夜色", en: "Night", hint: "night scene in ink, a single warm gold light" },
];

export interface TranslateLanguage {
  id: string;
  zh: string;
  en: string;
}

export const TRANSLATE_LANGUAGES: readonly TranslateLanguage[] = [
  { id: "zh-HK", zh: "繁體中文（香港）", en: "Traditional Chinese (Hong Kong)" },
  { id: "zh-CN", zh: "簡體中文", en: "Simplified Chinese" },
  { id: "en", zh: "英文", en: "English" },
  { id: "ja", zh: "日文", en: "Japanese" },
];

export function writeTemplate(id: string | null | undefined): WriteTemplate | undefined {
  return WRITE_TEMPLATES.find((item) => item.id === id);
}

export function imageStyle(id: string | null | undefined): ImageStyle | undefined {
  return IMAGE_STYLES.find((item) => item.id === id);
}

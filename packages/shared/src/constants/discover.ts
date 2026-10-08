import type { ConversationMode } from "./tools";

export const DISCOVER_SECTIONS = ["hero", "reco", "draw"] as const;
export type DiscoverSection = (typeof DISCOVER_SECTIONS)[number];

export const DISCOVER_ART_IDS = [
  "devices",
  "anywhere",
  "write",
  "drawInk",
  "drawPortrait",
  "drawHero",
  "drawCreate",
  "botBiz",
  "botFamily",
  "botTutor",
  "recoVoice",
  "recoDay",
  "recoLook",
  "recoSolve",
  "recoWrite",
  "recoRead",
  "styleInk",
  "stylePaper",
  "styleNight",
] as const;

export type DiscoverArtId = (typeof DISCOVER_ART_IDS)[number];

export const DISCOVER_TONE_RE = /^#[0-9A-Fa-f]{6}$/;

export function isDiscoverSection(value: string): value is DiscoverSection {
  return (DISCOVER_SECTIONS as readonly string[]).includes(value);
}

export function isDiscoverArtId(value: string): value is DiscoverArtId {
  return (DISCOVER_ART_IDS as readonly string[]).includes(value);
}

export interface SpringDiscoverCard {
  id: string;
  zh: string;
  en: string;
  blurbZh: string;
  blurbEn: string;
  section: DiscoverSection;
  tone: string;
  art: DiscoverArtId;
  toolId?: string;
  mode?: ConversationMode;
  imageStyle?: string;
}

export const SPRING_DISCOVER_CARDS: readonly SpringDiscoverCard[] = [
  {
    id: "devices",
    zh: "在所有設備上使用智泉",
    en: "Use Wisdom Spring on every device",
    blurbZh: "手機、電腦同一口井。",
    blurbEn: "Phone and computer, one spring.",
    section: "hero",
    tone: "#1C1B19",
    art: "devices",
  },
  {
    id: "anywhere",
    zh: "隨時隨地聊天",
    en: "Chat anywhere",
    blurbZh: "打開就問。",
    blurbEn: "Open and ask.",
    section: "hero",
    tone: "#24352C",
    art: "anywhere",
  },
  {
    id: "write",
    zh: "寫得清楚",
    en: "Write clearly",
    blurbZh: "電郵、報告、改寫。",
    blurbEn: "Mail, reports, rewrites.",
    section: "hero",
    tone: "#2A3F34",
    art: "write",
  },
  {
    id: "voice-in",
    zh: "備忘",
    en: "Memo",
    blurbZh: "寫一則短備忘。",
    blurbEn: "Write a short memo.",
    section: "reco",
    tone: "#2E4A40",
    art: "recoVoice",
    toolId: "memo",
  },
  {
    id: "voice-chat",
    zh: "翻譯",
    en: "Translate",
    blurbZh: "由一種語言譯去另一種。",
    blurbEn: "Translate from one language to another.",
    section: "reco",
    tone: "#5C4638",
    art: "recoWrite",
    toolId: "translate",
  },
  {
    id: "calendar",
    zh: "行程草稿",
    en: "Day draft",
    blurbZh: "用對話排一日。",
    blurbEn: "Plan a day in chat.",
    section: "reco",
    tone: "#3A3F5C",
    art: "recoDay",
    toolId: "bot",
  },
  {
    id: "look",
    zh: "睇圖",
    en: "Look",
    blurbZh: "上傳相片，智泉講你見到乜。",
    blurbEn: "Upload a photo and hear what is in it.",
    section: "reco",
    tone: "#4A3A52",
    art: "recoLook",
    toolId: "photo",
  },
  {
    id: "solver",
    zh: "解答",
    en: "Solve",
    blurbZh: "逐步拆題。",
    blurbEn: "Solve it in steps.",
    section: "reco",
    tone: "#3A2E58",
    art: "recoSolve",
    toolId: "solve",
  },
  {
    id: "natural",
    zh: "自然寫作",
    en: "Natural writing",
    blurbZh: "寫得似日常說話。",
    blurbEn: "Write the way people speak.",
    section: "reco",
    tone: "#2E4A38",
    art: "recoWrite",
    toolId: "plain",
  },
  {
    id: "check",
    zh: "文風檢查",
    en: "Style check",
    blurbZh: "示範畫面。",
    blurbEn: "A sample screen.",
    section: "reco",
    tone: "#4A4A4A",
    art: "recoRead",
    toolId: "detect",
  },
  {
    id: "read",
    zh: "快速閱讀",
    en: "Fast read",
    blurbZh: "收短長文。",
    blurbEn: "Shorten a long text.",
    section: "reco",
    tone: "#4A3A4A",
    art: "recoRead",
    toolId: "summary",
  },
  {
    id: "biz-card",
    zh: "商務助手",
    en: "Business aide",
    blurbZh: "外展同覆信。",
    blurbEn: "Outreach and replies.",
    section: "reco",
    tone: "#2C4A5C",
    art: "recoDay",
    toolId: "email",
  },
  {
    id: "grammar",
    zh: "語法檢查",
    en: "Grammar",
    blurbZh: "改病句。",
    blurbEn: "Fix broken sentences.",
    section: "reco",
    tone: "#3A4A5C",
    art: "recoWrite",
    toolId: "rewrite",
  },
  {
    id: "cite",
    zh: "引用草稿",
    en: "Citation draft",
    blurbZh: "示範畫面。",
    blurbEn: "A sample screen.",
    section: "reco",
    tone: "#4A4A3A",
    art: "recoRead",
    toolId: "summary",
  },
  {
    id: "post",
    zh: "內容創作",
    en: "Posts",
    blurbZh: "短帖草稿。",
    blurbEn: "A short post draft.",
    section: "reco",
    tone: "#3A5C4A",
    art: "recoWrite",
    toolId: "more",
  },
  {
    id: "watermark",
    zh: "水墨去印",
    en: "Ink, no stamp",
    blurbZh: "留白淡墨，示範封面。",
    blurbEn: "A sample ink cover.",
    section: "draw",
    tone: "#3E5346",
    art: "drawInk",
    mode: "image",
    imageStyle: "ink",
  },
  {
    id: "portrait",
    zh: "人像紙本",
    en: "Portrait on paper",
    blurbZh: "暖色紙本，示範封面。",
    blurbEn: "A sample paper cover.",
    section: "draw",
    tone: "#5A4A3A",
    art: "drawPortrait",
    mode: "image",
    imageStyle: "paper",
  },
];
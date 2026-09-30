import { SPRING_TOOLS, type CatalogAideView, type CatalogToolView } from "@spring/shared";
import type { ImageSourcePropType } from "react-native";
import type { IconName } from "../../shared/ui/Icon";

export type ToolItem = {
  id: string;
  zh: string;
  en: string;
  icon: IconName;
  blurbZh: string;
  blurbEn: string;
  page: number;
  mode?: "chat" | "write" | "translate" | "image";
  templateId?: string;
};

export type CardItem = {
  id: string;
  zh: string;
  en: string;
  blurbZh: string;
  blurbEn: string;
  tone: string;
  toolId?: string;
  art: ImageSourcePropType;
};

function asIcon(name: string | undefined): IconName {
  return (name ?? "apps-outline") as IconName;
}

export function toolsFromCatalog(items: CatalogToolView[] | undefined): ToolItem[] {
  const source = items ?? SPRING_TOOLS.filter((item) => item.live);
  return source.map((item) => ({
    id: item.id,
    zh: item.zh,
    en: item.en,
    icon: asIcon(item.icon),
    blurbZh: item.blurbZh,
    blurbEn: item.blurbEn,
    page: item.page ?? 0,
    mode: item.mode,
    templateId: item.templateId,
  }));
}

export const TOOLS: ToolItem[] = toolsFromCatalog(undefined);

const art = {
  devices: require("../../../assets/art/hero-devices.jpg"),
  anywhere: require("../../../assets/art/hero-anywhere.jpg"),
  write: require("../../../assets/art/hero-write.jpg"),
  drawInk: require("../../../assets/art/draw-ink.jpg"),
  drawPortrait: require("../../../assets/art/draw-portrait.jpg"),
  drawHero: require("../../../assets/art/draw-hero.jpg"),
  drawCreate: require("../../../assets/art/draw-create.jpg"),
  botBiz: require("../../../assets/art/bot-biz.jpg"),
  botFamily: require("../../../assets/art/bot-family.jpg"),
  botTutor: require("../../../assets/art/bot-tutor.jpg"),
  recoVoice: require("../../../assets/art/reco-voice.jpg"),
  recoDay: require("../../../assets/art/reco-day.jpg"),
  recoLook: require("../../../assets/art/reco-look.jpg"),
  recoSolve: require("../../../assets/art/reco-solve.jpg"),
  recoWrite: require("../../../assets/art/reco-write.jpg"),
  recoRead: require("../../../assets/art/reco-read.jpg"),
  styleInk: require("../../../assets/art/style-ink.jpg"),
  stylePaper: require("../../../assets/art/style-paper.jpg"),
  styleNight: require("../../../assets/art/style-night.jpg"),
};

export const DRAW_CARDS: CardItem[] = [
  { id: "watermark", zh: "水墨去印", en: "Ink, no stamp", blurbZh: "留白淡墨，示範封面。", blurbEn: "A sample ink cover.", tone: "#3E5346", art: art.drawInk },
  { id: "portrait", zh: "人像紙本", en: "Portrait on paper", blurbZh: "暖色紙本，示範封面。", blurbEn: "A sample paper cover.", tone: "#5A4A3A", art: art.drawPortrait },
];

export const BOTS: CardItem[] = [
  { id: "biz", zh: "商務助手", en: "Business aide", blurbZh: "穩重短句，適合電郵同會議。", blurbEn: "Calm, short lines for mail and meetings.", tone: "#1F6B4A", art: art.botBiz },
  { id: "family", zh: "家庭行程", en: "Family planner", blurbZh: "幫你排一日嘅家務同外出。", blurbEn: "Plan a day of errands and outings.", tone: "#3D9B6E", art: art.botFamily },
  { id: "tutor", zh: "寫作導師", en: "Writing tutor", blurbZh: "改結構、改語氣，唔改原意。", blurbEn: "Fix structure and tone, keep the meaning.", tone: "#2F6F4E", art: art.botTutor },
];

export function aidesFromCatalog(items: CatalogAideView[] | undefined): CardItem[] {
  if (items === undefined) return BOTS;
  return items.map((item) => {
    const local = BOTS.find((bot) => bot.id === item.id);
    return {
      id: item.id,
      zh: item.zh,
      en: item.en,
      blurbZh: item.blurbZh,
      blurbEn: item.blurbEn,
      tone: local?.tone ?? "#1F6B4A",
      toolId: item.id,
      art: local?.art ?? art.botBiz,
    };
  });
}

export const HEROES: CardItem[] = [
  { id: "devices", zh: "在所有設備上使用智泉", en: "Use Wisdom Spring on every device", blurbZh: "手機、電腦同一口井。", blurbEn: "Phone and computer, one spring.", tone: "#1C1B19", art: art.devices },
  { id: "anywhere", zh: "隨時隨地聊天", en: "Chat anywhere", blurbZh: "打開就問。", blurbEn: "Open and ask.", tone: "#24352C", art: art.anywhere },
  { id: "write", zh: "寫得清楚", en: "Write clearly", blurbZh: "電郵、報告、改寫。", blurbEn: "Mail, reports, rewrites.", tone: "#2A3F34", art: art.write },
];

export const RECOS: CardItem[] = [
  { id: "voice-in", zh: "語音輸入", en: "Voice in", blurbZh: "用咪講，智泉寫低。", blurbEn: "Speak, Wisdom Spring writes.", tone: "#2E4A40", toolId: "voice", art: art.recoVoice },
  { id: "voice-chat", zh: "語音聊天", en: "Voice chat", blurbZh: "用朗讀聽返。", blurbEn: "Hear the reply read aloud.", tone: "#5C4638", toolId: "voice", art: art.recoVoice },
  { id: "calendar", zh: "行程草稿", en: "Day draft", blurbZh: "用對話排一日。", blurbEn: "Plan a day in chat.", tone: "#3A3F5C", toolId: "bot", art: art.recoDay },
  { id: "look", zh: "睇圖", en: "Look", blurbZh: "上傳相片，智泉講你見到乜。", blurbEn: "Upload a photo and hear what is in it.", tone: "#4A3A52", toolId: "photo", art: art.recoLook },
  { id: "solver", zh: "解答", en: "Solve", blurbZh: "逐步拆題。", blurbEn: "Solve it in steps.", tone: "#3A2E58", toolId: "solve", art: art.recoSolve },
  { id: "natural", zh: "自然寫作", en: "Natural writing", blurbZh: "寫得似日常說話。", blurbEn: "Write the way people speak.", tone: "#2E4A38", toolId: "plain", art: art.recoWrite },
  { id: "check", zh: "文風檢查", en: "Style check", blurbZh: "示範畫面。", blurbEn: "A sample screen.", tone: "#4A4A4A", toolId: "detect", art: art.recoRead },
  { id: "read", zh: "快速閱讀", en: "Fast read", blurbZh: "收短長文。", blurbEn: "Shorten a long text.", tone: "#4A3A4A", toolId: "summary", art: art.recoRead },
  { id: "biz-card", zh: "商務助手", en: "Business aide", blurbZh: "外展同覆信。", blurbEn: "Outreach and replies.", tone: "#2C4A5C", toolId: "email", art: art.recoDay },
  { id: "grammar", zh: "語法檢查", en: "Grammar", blurbZh: "改病句。", blurbEn: "Fix broken sentences.", tone: "#3A4A5C", toolId: "rewrite", art: art.recoWrite },
  { id: "cite", zh: "引用草稿", en: "Citation draft", blurbZh: "示範畫面。", blurbEn: "A sample screen.", tone: "#4A4A3A", toolId: "summary", art: art.recoRead },
  { id: "post", zh: "內容創作", en: "Posts", blurbZh: "短帖草稿。", blurbEn: "A short post draft.", tone: "#3A5C4A", toolId: "more", art: art.recoWrite },
];

export const STYLE_ART: Record<string, ImageSourcePropType> = {
  ink: art.styleInk,
  paper: art.stylePaper,
  night: art.styleNight,
};

export const HERO_ART = {
  drawHero: art.drawHero,
  drawCreate: art.drawCreate,
};

export const POOL_LABELS = ["智泉 · DeepSeek", "智泉 · Qwen", "智泉 · Gemma"];

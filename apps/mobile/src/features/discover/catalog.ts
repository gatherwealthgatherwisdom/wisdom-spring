import {
  SPRING_DISCOVER_CARDS,
  SPRING_TOOLS,
  isDiscoverArtId,
  type CatalogAideView,
  type CatalogDiscoverView,
  type CatalogToolView,
  type DiscoverArtId,
  type DiscoverSection,
  type SpringDiscoverCard,
} from "@spring/shared";
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
  mode?: "chat" | "write" | "translate" | "image";
  imageStyle?: string;
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

const art: Record<DiscoverArtId, ImageSourcePropType> = {
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

function cardFromSpring(item: SpringDiscoverCard): CardItem {
  return {
    id: item.id,
    zh: item.zh,
    en: item.en,
    blurbZh: item.blurbZh,
    blurbEn: item.blurbEn,
    tone: item.tone,
    art: art[item.art],
    ...(item.toolId ? { toolId: item.toolId } : {}),
    ...(item.mode ? { mode: item.mode } : {}),
    ...(item.imageStyle ? { imageStyle: item.imageStyle } : {}),
  };
}

function cardFromView(item: CatalogDiscoverView): CardItem {
  return {
    id: item.id,
    zh: item.zh,
    en: item.en,
    blurbZh: item.blurbZh,
    blurbEn: item.blurbEn,
    tone: item.tone,
    art: isDiscoverArtId(item.art) ? art[item.art] : art.devices,
    ...(item.toolId ? { toolId: item.toolId } : {}),
    ...(item.mode ? { mode: item.mode } : {}),
    ...(item.imageStyle ? { imageStyle: item.imageStyle } : {}),
  };
}

export function cardsFromDiscover(
  items: CatalogDiscoverView[] | undefined,
  section: DiscoverSection,
): CardItem[] {
  if (items === undefined) {
    return SPRING_DISCOVER_CARDS.filter((item) => item.section === section).map(cardFromSpring);
  }
  return items.filter((item) => item.section === section).map(cardFromView);
}

export const DRAW_CARDS: CardItem[] = cardsFromDiscover(undefined, "draw");

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

export const HEROES: CardItem[] = cardsFromDiscover(undefined, "hero");

export const RECOS: CardItem[] = cardsFromDiscover(undefined, "reco");

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

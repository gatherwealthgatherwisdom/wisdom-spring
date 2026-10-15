import { labelFor } from "../lib/zh-hans";
import type { ConversationMode } from "./tools";

export const CATALOG_KINDS = ["tool", "aide", "write", "image", "translate", "discover"] as const;
export type CatalogKind = (typeof CATALOG_KINDS)[number];

export interface SpringTool {
  id: string;
  zh: string;
  en: string;
  blurbZh: string;
  blurbEn: string;
  live: boolean;
  mode?: ConversationMode;
  templateId?: string;
  imageStyle?: string;
  instruction?: string;
  icon?: string;
  page?: number;
}

export const TOOL_GROUPS = ["write", "chat", "file", "translate"] as const;
export type ToolGroup = (typeof TOOL_GROUPS)[number];

export function toolGroup(tool: Pick<SpringTool, "id" | "mode">): ToolGroup {
  if (tool.id === "photo" || tool.id === "pdf") return "file";
  if (tool.mode === "translate") return "translate";
  if (tool.mode === "write") return "write";
  return "chat";
}

export function toolsByGroup<T extends Pick<SpringTool, "id" | "mode">>(
  tools: readonly T[],
): { group: ToolGroup; tools: T[] }[] {
  return TOOL_GROUPS.map((group) => ({
    group,
    tools: tools.filter((item) => toolGroup(item) === group),
  })).filter((section) => section.tools.length > 0);
}

export const SPRING_TOOLS: readonly SpringTool[] = [
  { id: "rewrite", zh: "改寫", en: "Rewrite", blurbZh: "保留原意，句子更清楚。", blurbEn: "Clearer sentences, same meaning.", live: true, mode: "write", templateId: "rewrite", icon: "refresh-outline", page: 0 },
  { id: "solve", zh: "解答", en: "Solve", blurbZh: "把問題拆開，逐步講清楚。", blurbEn: "Break a problem into clear steps.", live: true, mode: "chat", templateId: "solve", instruction: "把用戶的問題拆成步驟，逐點說明。跟隨用戶語言。不要假裝搜過網。", icon: "bulb-outline", page: 0 },
  { id: "search", zh: "搜尋", en: "Search", blurbZh: "用即時網頁搜尋，有來源則列真實連結。", blurbEn: "Search the live web and list real links.", live: true, mode: "chat", templateId: "search", instruction: "你會收到即時網頁搜尋結果。根據結果回答。有來源則列真實連結。如果搜尋沒有結果，就說明找不到，不要杜撰網頁，也不要標「來自網頁」。", icon: "search-outline", page: 0 },
  { id: "memo", zh: "備忘", en: "Memo", blurbZh: "寫一則短備忘。", blurbEn: "Write a short memo.", live: true, mode: "write", templateId: "memo", icon: "bookmark-outline", page: 0 },
  { id: "pdf", zh: "聊天 PDF", en: "Chat PDF", blurbZh: "上傳 PDF，用繁體中文說明重點。", blurbEn: "Upload a PDF and summarise it.", live: true, mode: "chat", icon: "document-text-outline", page: 0 },
  { id: "artifacts", zh: "創作", en: "Compose", blurbZh: "開一張寫作卡。", blurbEn: "Open a writing card.", live: true, mode: "write", templateId: "email", icon: "color-wand-outline", page: 0 },
  { id: "plain", zh: "淺白", en: "Plain", blurbZh: "改成淺白短句。", blurbEn: "Turn it into plain speech.", live: true, mode: "write", templateId: "plain", icon: "chatbox-outline", page: 0 },
  { id: "mind", zh: "大綱", en: "Outline", blurbZh: "整理成要點大綱。", blurbEn: "Turn notes into an outline.", live: true, mode: "write", templateId: "report", icon: "list-outline", page: 0 },
  { id: "bot", zh: "助手", en: "Aide", blurbZh: "用固定語氣回覆。", blurbEn: "Reply in a set tone.", live: true, mode: "chat", templateId: "biz", icon: "happy-outline", page: 1 },
  { id: "photo", zh: "看圖", en: "Look", blurbZh: "上傳相片，用繁體中文說明所見。", blurbEn: "Upload a photo and say what you see.", live: true, mode: "chat", icon: "camera-outline", page: 1 },
  { id: "interpret", zh: "口譯", en: "Interpret", blurbZh: "口語對譯，自然短句。", blurbEn: "Spoken translation in short lines.", live: true, mode: "translate", templateId: "interpret", icon: "swap-horizontal", page: 1 },
  { id: "detect", zh: "文風檢查", en: "Style check", blurbZh: "指出語氣和病句。不會聲稱可以避開偵測。", blurbEn: "Point out tone and broken sentences. It does not claim to hide detection.", live: true, mode: "chat", templateId: "detect", instruction: "檢查用戶文字的語氣和病句，用短點列出。不要聲稱可以避開任何偵測或審查。", icon: "scan-outline", page: 1 },
  { id: "summary", zh: "摘要", en: "Summary", blurbZh: "把長文收短。", blurbEn: "Shorten a long text.", live: true, mode: "chat", templateId: "summary", instruction: "把用戶文字收成短摘要，保留要點，不要加不存在的資料。", icon: "book-outline", page: 1 },
  { id: "webchat", zh: "網頁聊天", en: "Page chat", blurbZh: "貼上網址，用網頁內容說明重點。", blurbEn: "Paste a URL and talk through the page.", live: true, mode: "chat", templateId: "webchat", instruction: "用戶可能貼上網址。用網頁搜尋核對該頁內容，再說明重點。讀不到就直說，不要杜撰，也不要在沒有結果時標「來自網頁」。", icon: "globe-outline", page: 1 },
  { id: "email", zh: "電郵", en: "Email", blurbZh: "穩重有禮的短電郵。", blurbEn: "A short, polite email.", live: true, mode: "write", templateId: "email", icon: "mail-outline", page: 1 },
  { id: "more", zh: "使其更多", en: "Make more", blurbZh: "用同一風格再寫一版。", blurbEn: "Write another version in the same style.", live: true, mode: "write", templateId: "more", icon: "copy-outline", page: 2 },
  { id: "cantonese", zh: "廣東話", en: "Cantonese", blurbZh: "改成香港廣東話。", blurbEn: "Turn it into Hong Kong Cantonese.", live: true, mode: "write", templateId: "cantonese", icon: "chatbubbles-outline", page: 2 },
  { id: "translate", zh: "翻譯", en: "Translate", blurbZh: "由一種語言譯成另一種。", blurbEn: "Translate from one language to another.", live: true, mode: "translate", icon: "language-outline", page: 2 },
  { id: "formal", zh: "正式", en: "Formal", blurbZh: "改成書面語。", blurbEn: "Turn it into formal writing.", live: true, mode: "write", templateId: "formal", icon: "newspaper-outline", page: 2 },
];

export interface SpringAide {
  id: string;
  zh: string;
  en: string;
  blurbZh: string;
  blurbEn: string;
  instruction: string;
}

export const SPRING_AIDES: readonly SpringAide[] = [
  {
    id: "biz",
    zh: "商務助手",
    en: "Business aide",
    blurbZh: "穩重短句，適合電郵和會議。",
    blurbEn: "Calm, short lines for mail and meetings.",
    instruction: "你是穩重的商務助手。短句、有禮，適合電郵和會議。不要誇張，不要假裝搜過網。",
  },
  {
    id: "family",
    zh: "家庭行程",
    en: "Family planner",
    blurbZh: "協助安排一天的家務和外出。",
    blurbEn: "Plan a day of errands and outings.",
    instruction: "你協助用戶安排家庭一天行程。清楚、務實，用香港日常用語。不要假裝連過日曆。",
  },
  {
    id: "tutor",
    zh: "寫作導師",
    en: "Writing tutor",
    blurbZh: "改結構、改語氣，不改原意。",
    blurbEn: "Fix structure and tone, keep the meaning.",
    instruction: "你是寫作導師。改結構和語氣，保留原意。指出問題時要具體。",
  },
];

export const TOOL_PLACEHOLDERS: Record<string, { zh: string; en: string }> = {
  rewrite: { zh: "貼上你想改寫的句子", en: "Paste the sentences to rewrite" },
  solve: { zh: "寫下你想解答的問題", en: "Write the problem to solve" },
  search: { zh: "你想搜尋甚麼？", en: "What should I search for?" },
  memo: { zh: "備忘要記下甚麼？", en: "What should this memo say?" },
  voice: { zh: "你想說甚麼？", en: "What do you want to say?" },
  pdf: { zh: "可加一句問題（可留空）", en: "Optional question about the PDF" },
  artifacts: { zh: "你想寫甚麼？", en: "What should I write?" },
  plain: { zh: "貼上你想改成淺白的文字", en: "Paste the text to simplify" },
  mind: { zh: "貼上你想整理成大綱的內容", en: "Paste the notes to outline" },
  bot: { zh: "你想問助手甚麼？", en: "What should the aide help with?" },
  photo: { zh: "可加一句問題（可留空）", en: "Optional question about the photo" },
  interpret: { zh: "貼上你想口譯的句子", en: "Paste the lines to interpret" },
  detect: { zh: "貼上你想檢查的文字", en: "Paste the text to check" },
  summary: { zh: "貼上你想收短的長文", en: "Paste the long text to shorten" },
  webchat: { zh: "貼上網址，或寫下你想問的頁面", en: "Paste a URL or name the page" },
  email: { zh: "這封電郵想說甚麼？", en: "What should this email say?" },
  more: { zh: "貼上原文，再寫長一些", en: "Paste the original to expand" },
  cantonese: { zh: "貼上你想改成廣東話的文字", en: "Paste the text to put into Cantonese" },
  translate: { zh: "貼上你想翻譯的文字", en: "Paste the text to translate" },
  formal: { zh: "貼上你想改成書面語的文字", en: "Paste the text to make formal" },
};

export function toolPlaceholder(id: string, locale: string): string | undefined {
  const item = TOOL_PLACEHOLDERS[id];
  if (!item) return undefined;
  return labelFor(item, locale);
}

export function toolRequiresDraft(id: string): boolean {
  return id !== "photo" && id !== "pdf";
}

export function springTool(id: string | null | undefined): SpringTool | undefined {
  return SPRING_TOOLS.find((item) => item.id === id);
}

export function springAide(id: string | null | undefined): SpringAide | undefined {
  return SPRING_AIDES.find((item) => item.id === id);
}

export function toolInstruction(templateId: string | null | undefined): string | undefined {
  const aide = springAide(templateId);
  if (aide) return aide.instruction;
  const tool = SPRING_TOOLS.find((item) => item.templateId === templateId && item.instruction);
  return tool?.instruction;
}

export function usesWebSearch(templateId: string | null | undefined): boolean {
  return templateId === "search" || templateId === "webchat";
}

import type { ConversationMode } from "./tools";

export const CATALOG_KINDS = ["tool", "aide", "write", "image", "translate"] as const;
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

export const SPRING_TOOLS: readonly SpringTool[] = [
  { id: "rewrite", zh: "改寫", en: "Rewrite", blurbZh: "保留原意，句子更清楚。", blurbEn: "Clearer sentences, same meaning.", live: true, mode: "write", templateId: "rewrite", icon: "refresh-outline", page: 0 },
  { id: "solve", zh: "解答", en: "Solve", blurbZh: "把問題拆開，逐步講清楚。", blurbEn: "Break a problem into clear steps.", live: true, mode: "chat", templateId: "solve", instruction: "把用戶嘅問題拆成步驟，逐點講清楚。用繁體中文，除非用戶用另一種語言。唔好假裝搜過網。", icon: "bulb-outline", page: 0 },
  { id: "search", zh: "搜尋", en: "Search", blurbZh: "用即時網頁搜尋，有就列真實連結。", blurbEn: "Search the live web and list real links.", live: true, mode: "chat", templateId: "search", instruction: "你會收到即時網頁搜尋結果。根據結果用繁體中文回答。有來源就列真實連結。如果搜尋冇結果，就講搵唔到，唔好杜撰網頁，亦唔好標「來自網頁」。", icon: "search-outline", page: 0 },
  { id: "memo", zh: "備忘", en: "Memo", blurbZh: "寫一則短備忘。", blurbEn: "Write a short memo.", live: true, mode: "write", templateId: "memo", icon: "bookmark-outline", page: 0 },
  { id: "voice", zh: "即時語音", en: "Voice", blurbZh: "用裝置咪同智泉傾。", blurbEn: "Talk with the device microphone.", live: true, mode: "chat", icon: "call-outline", page: 0 },
  { id: "pdf", zh: "聊天 PDF", en: "Chat PDF", blurbZh: "上傳 PDF，用繁體中文講重點。", blurbEn: "Upload a PDF and summarise it.", live: true, mode: "chat", icon: "document-text-outline", page: 0 },
  { id: "artifacts", zh: "創作", en: "Compose", blurbZh: "開一張寫作卡。", blurbEn: "Open a writing card.", live: true, mode: "write", templateId: "email", icon: "color-wand-outline", page: 0 },
  { id: "plain", zh: "淺白", en: "Plain", blurbZh: "改成淺白短句。", blurbEn: "Turn it into plain speech.", live: true, mode: "write", templateId: "plain", icon: "chatbox-outline", page: 0 },
  { id: "mind", zh: "大綱", en: "Outline", blurbZh: "整理成要點大綱。", blurbEn: "Turn notes into an outline.", live: true, mode: "write", templateId: "report", icon: "git-network-outline", page: 1 },
  { id: "bot", zh: "助手", en: "Aide", blurbZh: "用固定語氣回覆。", blurbEn: "Reply in a set tone.", live: true, mode: "chat", templateId: "biz", icon: "happy-outline", page: 1 },
  { id: "photo", zh: "睇圖", en: "Look", blurbZh: "上傳相片，用繁體中文講你見到乜。", blurbEn: "Upload a photo and say what you see.", live: true, mode: "chat", icon: "camera-outline", page: 1 },
  { id: "interpret", zh: "口譯", en: "Interpret", blurbZh: "即時對譯。", blurbEn: "Spoken translation.", live: true, mode: "translate", icon: "language-outline", page: 1 },
  { id: "detect", zh: "文風檢查", en: "Style check", blurbZh: "指出語氣同病句。唔會聲稱可以避開偵測。", blurbEn: "Point out tone and broken sentences. It does not claim to hide detection.", live: true, mode: "chat", templateId: "detect", instruction: "檢查用戶文字嘅語氣同病句，用短點列出。唔好聲稱可以避開任何偵測或審查。", icon: "search-circle-outline", page: 1 },
  { id: "summary", zh: "摘要", en: "Summary", blurbZh: "把長文收短。", blurbEn: "Shorten a long text.", live: true, mode: "chat", templateId: "summary", instruction: "把用戶文字收成短摘要，保留要點，唔好加唔存在嘅資料。", icon: "book-outline", page: 1 },
  { id: "webchat", zh: "網頁聊天", en: "Page chat", blurbZh: "貼網址，用網頁內容講重點。", blurbEn: "Paste a URL and talk through the page.", live: true, mode: "chat", templateId: "webchat", instruction: "用戶可能貼網址。用網頁搜尋核對該頁內容，再用繁體中文講重點。讀唔到就直講，唔好杜撰，亦唔好無結果仲標「來自網頁」。", icon: "globe-outline", page: 1 },
  { id: "email", zh: "電郵", en: "Email", blurbZh: "穩重有禮的短電郵。", blurbEn: "A short, polite email.", live: true, mode: "write", templateId: "email", icon: "mail-outline", page: 1 },
  { id: "more", zh: "使其更多", en: "Make more", blurbZh: "用同一風格再寫一版。", blurbEn: "Write another version in the same style.", live: true, mode: "write", templateId: "rewrite", icon: "images-outline", page: 2 },
  { id: "cantonese", zh: "廣東話", en: "Cantonese", blurbZh: "改成香港廣東話。", blurbEn: "Turn it into Hong Kong Cantonese.", live: true, mode: "write", templateId: "cantonese", icon: "chatbubbles-outline", page: 2 },
  { id: "translate", zh: "翻譯", en: "Translate", blurbZh: "由一種語言譯去另一種。", blurbEn: "Translate from one language to another.", live: true, mode: "translate", icon: "language-outline", page: 2 },
  { id: "formal", zh: "正式", en: "Formal", blurbZh: "改成書面語。", blurbEn: "Turn it into formal writing.", live: true, mode: "write", templateId: "formal", icon: "document-text-outline", page: 2 },
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
    blurbZh: "穩重短句，適合電郵同會議。",
    blurbEn: "Calm, short lines for mail and meetings.",
    instruction: "你係穩重嘅商務助手。短句、有禮、適合電郵同會議。唔好誇張，唔好假裝搜過網。",
  },
  {
    id: "family",
    zh: "家庭行程",
    en: "Family planner",
    blurbZh: "幫你排一日嘅家務同外出。",
    blurbEn: "Plan a day of errands and outings.",
    instruction: "你幫用戶排家庭一日行程。清楚、務實、用香港日常用語。唔好假裝連過日曆。",
  },
  {
    id: "tutor",
    zh: "寫作導師",
    en: "Writing tutor",
    blurbZh: "改結構、改語氣，唔改原意。",
    blurbEn: "Fix structure and tone, keep the meaning.",
    instruction: "你係寫作導師。改結構同語氣，保留原意。指出問題時要具體。",
  },
];

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

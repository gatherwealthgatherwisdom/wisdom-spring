import type { ConversationMode } from "./tools";

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
}

export const SPRING_TOOLS: readonly SpringTool[] = [
  { id: "rewrite", zh: "改寫", en: "Rewrite", blurbZh: "保留原意，句子更清楚。", blurbEn: "Clearer sentences, same meaning.", live: true, mode: "write", templateId: "rewrite" },
  { id: "solve", zh: "解答", en: "Solve", blurbZh: "把問題拆開，逐步講清楚。", blurbEn: "Break a problem into clear steps.", live: true, mode: "chat", templateId: "solve", instruction: "把用戶嘅問題拆成步驟，逐點講清楚。用繁體中文，除非用戶用另一種語言。唔好假裝搜過網。" },
  { id: "search", zh: "搜尋", en: "Search", blurbZh: "示範畫面。真正搜尋下一輪先接。", blurbEn: "A sample screen. Live search comes later.", live: false },
  { id: "memo", zh: "備忘", en: "Memo", blurbZh: "示範備忘。內容只留在呢個畫面。", blurbEn: "A sample memo. Nothing is stored yet.", live: false },
  { id: "voice", zh: "即時語音", en: "Voice", blurbZh: "用裝置咪同智泉傾。", blurbEn: "Talk with the device microphone.", live: true, mode: "chat" },
  { id: "pdf", zh: "聊天 PDF", en: "Chat PDF", blurbZh: "示範畫面。檔案上傳下一輪先接。", blurbEn: "A sample screen. File upload comes later.", live: false },
  { id: "artifacts", zh: "創作", en: "Compose", blurbZh: "開一張寫作卡。", blurbEn: "Open a writing card.", live: true, mode: "write", templateId: "email" },
  { id: "plain", zh: "淺白", en: "Plain", blurbZh: "改成淺白短句。", blurbEn: "Turn it into plain speech.", live: true, mode: "write", templateId: "plain" },
  { id: "mind", zh: "大綱", en: "Outline", blurbZh: "整理成要點大綱。", blurbEn: "Turn notes into an outline.", live: true, mode: "write", templateId: "report" },
  { id: "bot", zh: "助手", en: "Aide", blurbZh: "用固定語氣回覆。", blurbEn: "Reply in a set tone.", live: true, mode: "chat", templateId: "biz" },
  { id: "photo", zh: "睇圖", en: "Look", blurbZh: "示範畫面。相片下一輪先接。", blurbEn: "A sample screen. Photos come later.", live: false },
  { id: "interpret", zh: "口譯", en: "Interpret", blurbZh: "即時對譯。", blurbEn: "Spoken translation.", live: true, mode: "translate" },
  { id: "detect", zh: "文風檢查", en: "Style check", blurbZh: "指出語氣同病句。唔會聲稱可以避開偵測。", blurbEn: "Point out tone and broken sentences. It does not claim to hide detection.", live: true, mode: "chat", templateId: "detect", instruction: "檢查用戶文字嘅語氣同病句，用短點列出。唔好聲稱可以避開任何偵測或審查。" },
  { id: "summary", zh: "摘要", en: "Summary", blurbZh: "把長文收短。", blurbEn: "Shorten a long text.", live: true, mode: "chat", templateId: "summary", instruction: "把用戶文字收成短摘要，保留要點，唔好加唔存在嘅資料。" },
  { id: "webchat", zh: "網頁聊天", en: "Page chat", blurbZh: "示範畫面。唔會標「來自網頁」。", blurbEn: "A sample screen. It will not claim web results.", live: false },
  { id: "email", zh: "電郵", en: "Email", blurbZh: "穩重有禮的短電郵。", blurbEn: "A short, polite email.", live: true, mode: "write", templateId: "email" },
  { id: "more", zh: "使其更多", en: "Make more", blurbZh: "用同一風格再寫一版。", blurbEn: "Write another version in the same style.", live: true, mode: "write", templateId: "rewrite" },
  { id: "cantonese", zh: "廣東話", en: "Cantonese", blurbZh: "改成香港廣東話。", blurbEn: "Turn it into Hong Kong Cantonese.", live: true, mode: "write", templateId: "cantonese" },
  { id: "translate", zh: "翻譯", en: "Translate", blurbZh: "由一種語言譯去另一種。", blurbEn: "Translate from one language to another.", live: true, mode: "translate" },
  { id: "formal", zh: "正式", en: "Formal", blurbZh: "改成書面語。", blurbEn: "Turn it into formal writing.", live: true, mode: "write", templateId: "formal" },
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

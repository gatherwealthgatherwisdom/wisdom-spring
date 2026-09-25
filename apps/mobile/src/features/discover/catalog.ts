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
};

export const TOOLS: ToolItem[] = [
  { id: "rewrite", zh: "改寫", en: "Rewrite", icon: "refresh-outline", blurbZh: "保留原意，句子更清楚。", blurbEn: "Clearer sentences, same meaning.", page: 0, mode: "write", templateId: "rewrite" },
  { id: "solve", zh: "解答", en: "Solve", icon: "bulb-outline", blurbZh: "把問題拆開，逐步講清楚。", blurbEn: "Break a problem into clear steps.", page: 0 },
  { id: "search", zh: "搜尋", en: "Search", icon: "search-outline", blurbZh: "示範畫面。真正搜尋下一輪先接。", blurbEn: "A sample screen. Live search comes later.", page: 0 },
  { id: "memo", zh: "備忘", en: "Memo", icon: "bookmark-outline", blurbZh: "示範備忘。內容只留在呢個畫面。", blurbEn: "A sample memo. Nothing is stored yet.", page: 0 },
  { id: "voice", zh: "即時語音", en: "Voice", icon: "call-outline", blurbZh: "用裝置咪同智泉傾。", blurbEn: "Talk with the device microphone.", page: 0 },
  { id: "pdf", zh: "聊天 PDF", en: "Chat PDF", icon: "document-text-outline", blurbZh: "示範畫面。檔案上傳下一輪先接。", blurbEn: "A sample screen. File upload comes later.", page: 0 },
  { id: "artifacts", zh: "創作", en: "Compose", icon: "color-wand-outline", blurbZh: "開一張寫作卡。", blurbEn: "Open a writing card.", page: 0, mode: "write", templateId: "email" },
  { id: "plain", zh: "淺白", en: "Plain", icon: "chatbox-outline", blurbZh: "改成淺白短句。", blurbEn: "Turn it into plain speech.", page: 0, mode: "write", templateId: "plain" },
  { id: "mind", zh: "大綱", en: "Outline", icon: "git-network-outline", blurbZh: "整理成要點大綱。", blurbEn: "Turn notes into an outline.", page: 1, mode: "write", templateId: "report" },
  { id: "bot", zh: "助手", en: "Aide", icon: "happy-outline", blurbZh: "用固定語氣回覆。", blurbEn: "Reply in a set tone.", page: 1 },
  { id: "photo", zh: "睇圖", en: "Look", icon: "camera-outline", blurbZh: "示範畫面。相片下一輪先接。", blurbEn: "A sample screen. Photos come later.", page: 1 },
  { id: "interpret", zh: "口譯", en: "Interpret", icon: "language-outline", blurbZh: "即時對譯。", blurbEn: "Spoken translation.", page: 1, mode: "translate" },
  { id: "detect", zh: "文風檢查", en: "Style check", icon: "search-circle-outline", blurbZh: "示範畫面。唔會聲稱可以避開偵測。", blurbEn: "A sample screen. It does not claim to hide detection.", page: 1 },
  { id: "summary", zh: "摘要", en: "Summary", icon: "book-outline", blurbZh: "把長文收短。", blurbEn: "Shorten a long text.", page: 1 },
  { id: "webchat", zh: "網頁聊天", en: "Page chat", icon: "globe-outline", blurbZh: "示範畫面。唔會標「來自網頁」。", blurbEn: "A sample screen. It will not claim web results.", page: 1 },
  { id: "more", zh: "使其更多", en: "Make more", icon: "images-outline", blurbZh: "用同一風格再寫一版。", blurbEn: "Write another version in the same style.", page: 2, mode: "write", templateId: "rewrite" },
  { id: "cantonese", zh: "廣東話", en: "Cantonese", icon: "chatbubbles-outline", blurbZh: "改成香港廣東話。", blurbEn: "Turn it into Hong Kong Cantonese.", page: 2, mode: "write", templateId: "cantonese" },
  { id: "translate", zh: "翻譯", en: "Translate", icon: "language-outline", blurbZh: "由一種語言譯去另一種。", blurbEn: "Translate from one language to another.", page: 2, mode: "translate" },
  { id: "formal", zh: "正式", en: "Formal", icon: "document-text-outline", blurbZh: "改成書面語。", blurbEn: "Turn it into formal writing.", page: 2, mode: "write", templateId: "formal" },
];

export const DRAW_CARDS: CardItem[] = [
  { id: "watermark", zh: "水墨去印", en: "Ink, no stamp", blurbZh: "留白淡墨，示範封面。", blurbEn: "A sample ink cover.", tone: "#3E5346" },
  { id: "portrait", zh: "人像紙本", en: "Portrait on paper", blurbZh: "暖色紙本，示範封面。", blurbEn: "A sample paper cover.", tone: "#5A4A3A" },
];

export const BOTS: CardItem[] = [
  { id: "biz", zh: "商務助手", en: "Business aide", blurbZh: "穩重短句，適合電郵同會議。", blurbEn: "Calm, short lines for mail and meetings.", tone: "#1F6B4A" },
  { id: "family", zh: "家庭行程", en: "Family planner", blurbZh: "幫你排一日嘅家務同外出。", blurbEn: "Plan a day of errands and outings.", tone: "#3D9B6E" },
  { id: "tutor", zh: "寫作導師", en: "Writing tutor", blurbZh: "改結構、改語氣，唔改原意。", blurbEn: "Fix structure and tone, keep the meaning.", tone: "#2F6F4E" },
];

export const HEROES: CardItem[] = [
  { id: "devices", zh: "在所有設備上使用智泉", en: "Use Wisdom Spring on every device", blurbZh: "手機、電腦同一口井。", blurbEn: "Phone and computer, one spring.", tone: "#1C1B19" },
  { id: "anywhere", zh: "隨時隨地聊天", en: "Chat anywhere", blurbZh: "打開就問。", blurbEn: "Open and ask.", tone: "#24352C" },
  { id: "write", zh: "寫得清楚", en: "Write clearly", blurbZh: "電郵、報告、改寫。", blurbEn: "Mail, reports, rewrites.", tone: "#2A3F34" },
];

export const RECOS: CardItem[] = [
  { id: "voice-in", zh: "語音輸入", en: "Voice in", blurbZh: "用咪講，智泉寫低。", blurbEn: "Speak, Wisdom Spring writes.", tone: "#2E4A40" },
  { id: "voice-chat", zh: "語音聊天", en: "Voice chat", blurbZh: "用朗讀聽返。", blurbEn: "Hear the reply read aloud.", tone: "#5C4638" },
  { id: "calendar", zh: "行程草稿", en: "Day draft", blurbZh: "用對話排一日。", blurbEn: "Plan a day in chat.", tone: "#3A3F5C" },
  { id: "look", zh: "睇圖", en: "Look", blurbZh: "示範畫面。", blurbEn: "A sample screen.", tone: "#4A3A52" },
  { id: "solver", zh: "解答", en: "Solve", blurbZh: "逐步拆題。", blurbEn: "Solve it in steps.", tone: "#3A2E58" },
  { id: "natural", zh: "自然寫作", en: "Natural writing", blurbZh: "寫得似日常說話。", blurbEn: "Write the way people speak.", tone: "#2E4A38" },
  { id: "check", zh: "文風檢查", en: "Style check", blurbZh: "示範畫面。", blurbEn: "A sample screen.", tone: "#4A4A4A" },
  { id: "read", zh: "快速閱讀", en: "Fast read", blurbZh: "收短長文。", blurbEn: "Shorten a long text.", tone: "#4A3A4A" },
  { id: "biz-card", zh: "商務助手", en: "Business aide", blurbZh: "外展同覆信。", blurbEn: "Outreach and replies.", tone: "#2C4A5C" },
  { id: "grammar", zh: "語法檢查", en: "Grammar", blurbZh: "改病句。", blurbEn: "Fix broken sentences.", tone: "#3A4A5C" },
  { id: "cite", zh: "引用草稿", en: "Citation draft", blurbZh: "示範畫面。", blurbEn: "A sample screen.", tone: "#4A4A3A" },
  { id: "post", zh: "內容創作", en: "Posts", blurbZh: "短帖草稿。", blurbEn: "A short post draft.", tone: "#3A5C4A" },
];

export const POOL_LABELS = ["智泉 · DeepSeek", "智泉 · Qwen", "智泉 · Gemma"];

import { Locale, SYSTEM_PROMPT, imageStyle, parseAppLocale, toolInstruction, writeTemplate } from "@spring/shared";

export interface ConversationModeFields {
  mode: string;
  templateId: string | null;
  sourceLang: string | null;
  targetLang: string | null;
  imageStyle: string | null;
}

export function generationLanguageLine(locale: string | undefined, templateId: string | null): string {
  if (templateId === "cantonese") {
    return "用香港廣東話口語作答，不要改用書面語。";
  }
  const app = parseAppLocale(locale);
  if (app === Locale.EN) {
    return "Reply in English. If the user writes in another language, follow that language.";
  }
  if (app === Locale.ZH_CN) {
    return "預設以香港書面語、簡體中文作答。用戶以其他語言提問則跟隨該語言。";
  }
  return "預設以香港書面語、繁體中文作答。用戶以其他語言提問則跟隨該語言。";
}

export function systemPromptFor(
  conversation: ConversationModeFields,
  requestedModel: string,
  extraInstruction?: string,
  extraHint?: string,
  systemPrompt = SYSTEM_PROMPT,
  locale?: string,
): string {
  const extra = extraInstruction || toolInstruction(conversation.templateId);
  if (conversation.mode === "translate") {
    const source = conversation.sourceLang ?? "auto";
    const target = conversation.targetLang ?? "zh-HK";
    const spoken =
      conversation.templateId === "interpret"
        ? "用口語短句自然對譯，保留語氣。"
        : "只輸出譯文，不要加解釋、標題、引號或前後對白。";
    const task = `你現在只負責翻譯。來源語言：${source}。目標語言：${target}。${spoken}`;
    const identity = `${systemPrompt}\n今輪請求模型：${requestedModel}。只有使用者問及模型身份時才可以提及。`;
    return extra ? `${task}\n${extra}\n${identity}` : `${task}\n${identity}`;
  }
  if (conversation.mode === "image") {
    const hint = extraHint || imageStyle(conversation.imageStyle)?.hint;
    return `Create one image and no extra caption. Style: ${hint ?? "restrained ink on warm paper"}.`;
  }
  const language = generationLanguageLine(locale, conversation.templateId);
  const identity = `${systemPrompt}\n今輪請求模型：${requestedModel}。只有使用者問及模型身份時才可以提及。\n${language}`;
  if (extra) return `${identity}\n${extra}`;
  if (conversation.mode === "write") {
    const template = writeTemplate(conversation.templateId);
    return `${identity}\n${template?.instruction ?? "幫用戶寫作，語氣穩重、清楚。"}`;
  }
  return identity;
}

export function withImageStyle(content: string, styleId: string | null, extraHint?: string): string {
  const hint = extraHint || imageStyle(styleId)?.hint;
  if (!hint) return content;
  return `${content}\nStyle: ${hint}`;
}

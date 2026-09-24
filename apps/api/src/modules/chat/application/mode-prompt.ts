import { SYSTEM_PROMPT, imageStyle, writeTemplate } from "@spring/shared";

export interface ConversationModeFields {
  mode: string;
  templateId: string | null;
  sourceLang: string | null;
  targetLang: string | null;
  imageStyle: string | null;
}

export function systemPromptFor(conversation: ConversationModeFields, requestedModel: string): string {
  const identity = `${SYSTEM_PROMPT}\n今輪請求模型：${requestedModel}。只有使用者問及模型身份時先可以提及。`;
  if (conversation.mode === "write") {
    const template = writeTemplate(conversation.templateId);
    return `${identity}\n${template?.instruction ?? "幫用戶寫作，語氣穩重、清楚。"}`;
  }
  if (conversation.mode === "translate") {
    const source = conversation.sourceLang ?? "auto";
    const target = conversation.targetLang ?? "zh-HK";
    return `${identity}\n你而家只負責翻譯。來源語言：${source}。目標語言：${target}。只輸出譯文，唔好加解釋。`;
  }
  if (conversation.mode === "image") {
    const style = imageStyle(conversation.imageStyle);
    return `Create one image and no extra caption. Style: ${style?.hint ?? "restrained ink on warm paper"}.`;
  }
  return identity;
}

export function withImageStyle(content: string, styleId: string | null): string {
  const style = imageStyle(styleId);
  if (!style) return content;
  return `${content}\nStyle: ${style.hint}`;
}

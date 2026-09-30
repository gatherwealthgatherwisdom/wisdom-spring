import { SYSTEM_PROMPT, imageStyle, toolInstruction, writeTemplate } from "@spring/shared";

export interface ConversationModeFields {
  mode: string;
  templateId: string | null;
  sourceLang: string | null;
  targetLang: string | null;
  imageStyle: string | null;
}

export function systemPromptFor(
  conversation: ConversationModeFields,
  requestedModel: string,
  extraInstruction?: string,
  extraHint?: string,
): string {
  const identity = `${SYSTEM_PROMPT}\n今輪請求模型：${requestedModel}。只有使用者問及模型身份時先可以提及。`;
  const extra = extraInstruction || toolInstruction(conversation.templateId);
  if (extra) return `${identity}\n${extra}`;
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
    const hint = extraHint || imageStyle(conversation.imageStyle)?.hint;
    return `Create one image and no extra caption. Style: ${hint ?? "restrained ink on warm paper"}.`;
  }
  return identity;
}

export function withImageStyle(content: string, styleId: string | null, extraHint?: string): string {
  const hint = extraHint || imageStyle(styleId)?.hint;
  if (!hint) return content;
  return `${content}\nStyle: ${hint}`;
}

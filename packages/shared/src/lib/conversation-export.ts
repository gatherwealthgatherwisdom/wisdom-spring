import { MessageRole } from "../enums/message-role";

export const EXPORT_UNTITLED = "新對話";
export const EXPORT_USER = "用戶";
export const EXPORT_ASSISTANT = "智泉";

export interface ExportTurn {
  role: string;
  content: string;
  imageUrl?: string | null;
  attachments?: { url: string }[];
}

export function conversationMarkdown(title: string | null | undefined, turns: ExportTurn[]): string {
  const heading = title?.trim() || EXPORT_UNTITLED;
  const blocks = [`# ${heading}`];
  for (const turn of turns) {
    const who = turn.role === MessageRole.USER ? EXPORT_USER : EXPORT_ASSISTANT;
    const images = [
      ...(turn.imageUrl ? [`![](${turn.imageUrl})`] : []),
      ...(turn.attachments ?? []).map((item) => `![](${item.url})`),
    ];
    const body = [turn.content.trim(), ...images].filter((part) => part.length > 0).join("\n\n");
    blocks.push(`**${who}**\n\n${body || "（無文字）"}`);
  }
  return `${blocks.join("\n\n")}\n`;
}

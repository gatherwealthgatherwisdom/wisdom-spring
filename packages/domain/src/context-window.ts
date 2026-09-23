import type { ChatTurn } from "./chat-turn";

const CJK = /[\u3400-\u9fff]/;

export function estimateTokens(text: string): number {
  if (text.length === 0) return 0;
  const divisor = CJK.test(text) ? 2 : 4;
  return Math.ceil(text.length / divisor);
}

export interface ContextWindow {
  trim(messages: ChatTurn[], contextLength: number, reserveOutput: number): ChatTurn[];
}

export class EstimatedContextWindow implements ContextWindow {
  trim(messages: ChatTurn[], contextLength: number, reserveOutput: number): ChatTurn[] {
    const budget = Math.max(0, contextLength - reserveOutput);
    const system = messages.filter((message) => message.role === "system");
    const rest = messages.filter((message) => message.role !== "system");
    let used = system.reduce((sum, message) => sum + estimateTokens(message.content), 0);
    const kept: ChatTurn[] = [];

    for (let index = rest.length - 1; index >= 0; index -= 1) {
      const message = rest[index];
      if (!message) continue;
      const cost = estimateTokens(message.content);
      const isNewest = index === rest.length - 1;
      if (used + cost <= budget) {
        kept.push(message);
        used += cost;
        continue;
      }
      if (isNewest) {
        const remain = Math.max(0, budget - used);
        const chars = remain * (CJK.test(message.content) ? 2 : 4);
        kept.push({ ...message, content: message.content.slice(0, chars) });
      }
      break;
    }

    return [...system, ...kept.reverse()];
  }
}

import type { ConversationMode } from "../constants/tools";

export const GENERATION_KINDS = ["text-to-text", "text-to-image", "image-to-text", "file-to-text"] as const;
export type GenerationKind = (typeof GENERATION_KINDS)[number];

export function generationKind(input: {
  mode: ConversationMode | string;
  hasVision?: boolean;
  hasPdf?: boolean;
}): GenerationKind {
  if (input.mode === "image") return "text-to-image";
  if (input.hasVision) return "image-to-text";
  if (input.hasPdf) return "file-to-text";
  return "text-to-text";
}

import type { ConversationMode } from "@spring/shared";
import type { Copy } from "../../shared/lib/i18n";

export type ComposerAction = "ask" | "draw" | "look" | "file";

export function actionFromRoute(params?: {
  mode?: ConversationMode;
  attach?: "camera" | "library" | "file";
}): ComposerAction {
  if (params?.attach === "file") return "file";
  if (params?.attach === "camera" || params?.attach === "library") return "look";
  if (params?.mode === "image") return "draw";
  return "ask";
}

export function turnModeFor(
  action: ComposerAction,
  conversationMode: ConversationMode = "chat",
): ConversationMode {
  if (action === "draw") return "image";
  if (conversationMode === "image") return "chat";
  return conversationMode;
}

export function placeholderFor(text: Copy, action: ComposerAction): string {
  if (action === "draw") return text.placeholderDraw;
  if (action === "look") return text.placeholderLook;
  if (action === "file") return text.placeholderFile;
  return text.placeholder;
}

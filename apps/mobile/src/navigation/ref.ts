import { createNavigationContainerRef } from "@react-navigation/native";
import type { AppStackParamList } from "./types";

export const navigationRef = createNavigationContainerRef<AppStackParamList>();

export function openChatFromPush(conversationId: string): void {
  if (!navigationRef.isReady()) return;
  navigationRef.navigate("Chat", { conversationId });
}

export function openNoticesFromPush(): void {
  if (!navigationRef.isReady()) return;
  navigationRef.navigate("Notices");
}

export function openSettingsFromPush(): void {
  if (!navigationRef.isReady()) return;
  navigationRef.navigate("Main", { screen: "Settings" });
}

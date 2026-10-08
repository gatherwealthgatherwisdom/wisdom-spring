import { createNavigationContainerRef } from "@react-navigation/native";
import type { AppStackParamList } from "./MainTabs";

export const navigationRef = createNavigationContainerRef<AppStackParamList>();

export function openChatFromPush(conversationId: string): void {
  if (!navigationRef.isReady()) return;
  navigationRef.navigate("Chat", { conversationId });
}

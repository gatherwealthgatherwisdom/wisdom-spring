import type { NavigatorScreenParams } from "@react-navigation/native";

export type MainTabParamList = {
  Inbox: undefined;
  Image: undefined;
  Discover: undefined;
  Settings: undefined;
};

export type ChatParams = {
  conversationId?: string;
  mode?: "chat" | "write" | "translate" | "image";
  templateId?: string;
  sourceLang?: string;
  targetLang?: string;
  imageStyle?: string;
  seed?: string;
  attach?: "camera" | "library" | "file";
  focusMessageId?: string;
};

export type AuthParams = {
  resume?: ChatParams;
};

export type AppStackParamList = {
  Auth: AuthParams | undefined;
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
  Chat: ChatParams | undefined;
  Register: undefined;
  Tool: { id: string };
  AllTools: undefined;
  AllBots: undefined;
  Write: undefined;
  Translate: { templateId?: string } | undefined;
  Notices: undefined;
};

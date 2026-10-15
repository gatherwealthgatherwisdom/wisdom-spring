import type { NavigationProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { springTool, type SpringTool } from "@spring/shared";
import type { AppStackParamList, ChatParams, MainTabParamList } from "./types";

export function openChat(navigation: NavigationProp<MainTabParamList>, params: ChatParams): void {
  const parent = navigation.getParent<NativeStackNavigationProp<AppStackParamList>>();
  parent?.navigate("Chat", params);
}

export function openRegister(navigation: NavigationProp<MainTabParamList>): void {
  const parent = navigation.getParent<NativeStackNavigationProp<AppStackParamList>>();
  parent?.navigate("Register");
}

export function openAuth(navigation: NavigationProp<MainTabParamList>, resume?: ChatParams): void {
  const parent = navigation.getParent<NativeStackNavigationProp<AppStackParamList>>();
  parent?.navigate("Auth", resume ? { resume } : undefined);
}

/** Empty chat is replaced so Auth back lands on Main tabs instead of a tab-less thread. */
export function requireAuth(
  navigation: Pick<NativeStackNavigationProp<AppStackParamList>, "navigate" | "replace">,
  resume?: ChatParams,
): void {
  if (resume?.conversationId) {
    navigation.navigate("Auth");
    return;
  }
  navigation.replace("Auth", { resume: resume ?? {} });
}

type LiveToolSpec = Pick<SpringTool, "id"> & {
  live?: boolean;
  mode?: SpringTool["mode"];
  templateId?: string;
  imageStyle?: string;
};

export function paramsForLiveTool(spec: LiveToolSpec | string): ChatParams | null {
  const tool = typeof spec === "string" ? springTool(spec) : spec;
  if (!tool || tool.live === false) return null;
  if (tool.id === "photo") return { mode: tool.mode ?? "chat", attach: "library" };
  if (tool.id === "pdf") return { mode: tool.mode ?? "chat", attach: "file" };
  return {
    mode: tool.mode ?? "chat",
    ...(tool.templateId ? { templateId: tool.templateId } : {}),
    ...(tool.imageStyle ? { imageStyle: tool.imageStyle } : {}),
  };
}

export function openCatalogTool(
  navigation: Pick<NativeStackNavigationProp<AppStackParamList>, "navigate">,
  toolId: string,
): void {
  if (toolId === "artifacts") {
    navigation.navigate("Write");
    return;
  }
  if (toolId === "bot") {
    navigation.navigate("AllBots");
    return;
  }
  if (toolId === "translate") {
    navigation.navigate("Translate");
    return;
  }
  if (toolId === "interpret") {
    navigation.navigate("Translate", { templateId: "interpret" });
    return;
  }
  const params = paramsForLiveTool(toolId);
  if (params?.attach) {
    navigation.navigate("Chat", params);
    return;
  }
  if (!params) return;
  navigation.navigate("Tool", { id: toolId });
}

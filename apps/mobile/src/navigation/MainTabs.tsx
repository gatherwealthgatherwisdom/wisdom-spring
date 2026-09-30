import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import type { NavigationProp, NavigatorScreenParams } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Icon, type IconName } from "../shared/ui/Icon";
import { DiscoverScreen } from "../features/discover/DiscoverScreen";
import { ImageScreen } from "../features/image/ImageScreen";
import { InboxScreen } from "../features/inbox/InboxScreen";
import { SettingsScreen } from "../features/settings/SettingsScreen";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePrefs } from "../shared/lib/prefs";
import { copy } from "../shared/lib/i18n";
import { useColors } from "../shared/theme";
import { springTool, type SpringTool } from "@spring/shared";

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
};

export type AppStackParamList = {
  Auth: undefined;
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
  Chat: ChatParams | undefined;
  Register: undefined;
  Tool: { id: string };
  AllTools: undefined;
  AllBots: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export function openChat(navigation: NavigationProp<MainTabParamList>, params: ChatParams): void {
  const parent = navigation.getParent<NativeStackNavigationProp<AppStackParamList>>();
  parent?.navigate("Chat", params);
}

export function openRegister(navigation: NavigationProp<MainTabParamList>): void {
  const parent = navigation.getParent<NativeStackNavigationProp<AppStackParamList>>();
  parent?.navigate("Register");
}

export function openAuth(navigation: NavigationProp<MainTabParamList>): void {
  const parent = navigation.getParent<NativeStackNavigationProp<AppStackParamList>>();
  parent?.navigate("Auth");
}

type LiveToolSpec = Pick<SpringTool, "id" | "blurbZh" | "blurbEn"> & {
  live?: boolean;
  mode?: SpringTool["mode"];
  templateId?: string;
  imageStyle?: string;
};

export function paramsForLiveTool(spec: LiveToolSpec | string, locale: "zh-HK" | "en"): ChatParams | null {
  const tool = typeof spec === "string" ? springTool(spec) : spec;
  if (!tool || tool.live === false) return null;
  if (tool.id === "photo") return { mode: tool.mode ?? "chat", attach: "library" };
  if (tool.id === "pdf") return { mode: tool.mode ?? "chat", attach: "file" };
  const seed = tool.id === "search" || tool.id === "webchat" ? undefined : locale === "en" ? tool.blurbEn : tool.blurbZh;
  return {
    mode: tool.mode ?? "chat",
    ...(tool.templateId ? { templateId: tool.templateId } : {}),
    ...(tool.imageStyle ? { imageStyle: tool.imageStyle } : {}),
    ...(seed ? { seed } : {}),
  };
}

export function MainTabs() {
  const colors = useColors();
  const locale = usePrefs((state) => state.locale);
  const text = copy[locale];
  const insets = useSafeAreaInsets();
  const tabBottom = Math.max(insets.bottom, 8);
  return (
    <Tab.Navigator
      safeAreaInsets={{ bottom: 0 }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.line,
          paddingTop: 6,
          paddingBottom: tabBottom,
          height: 50 + tabBottom,
        },
        tabBarLabelStyle: { fontSize: 12, marginTop: -2 },
      }}
    >
      <Tab.Screen name="Inbox" component={InboxScreen} options={{ title: text.inbox, tabBarIcon: tabIcon("chatbubble-outline", "chatbubble") }} />
      <Tab.Screen name="Image" component={ImageScreen} options={{ title: text.image, tabBarIcon: tabIcon("image-outline", "image") }} />
      <Tab.Screen name="Discover" component={DiscoverScreen} options={{ title: text.discover, tabBarIcon: tabIcon("compass-outline", "compass") }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: text.mine, tabBarIcon: tabIcon("person-outline", "person") }} />
    </Tab.Navigator>
  );
}

function tabIcon(idle: IconName, active: IconName) {
  return ({ color, focused }: { color: string; focused: boolean }) => (
    <Icon name={focused ? active : idle} color={color} size={22} />
  );
}

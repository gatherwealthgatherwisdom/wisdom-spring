import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import type { NavigationProp, NavigatorScreenParams } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Icon, type IconName } from "../shared/ui/Icon";
import { ImageScreen } from "../features/image/ImageScreen";
import { InboxScreen } from "../features/inbox/InboxScreen";
import { SettingsScreen } from "../features/settings/SettingsScreen";
import { TranslateScreen } from "../features/translate/TranslateScreen";
import { WriteScreen } from "../features/write/WriteScreen";
import { usePrefs } from "../shared/lib/prefs";
import { copy } from "../shared/lib/i18n";
import { useColors } from "../shared/theme";

export type MainTabParamList = {
  Inbox: undefined;
  Write: undefined;
  Translate: undefined;
  Image: undefined;
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
};

export type AppStackParamList = {
  Auth: undefined;
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
  Chat: ChatParams | undefined;
  Register: undefined;
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

export function MainTabs() {
  const colors = useColors();
  const locale = usePrefs((state) => state.locale);
  const text = copy[locale];
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.bg, borderTopColor: colors.line, paddingTop: 4 },
        tabBarLabelStyle: { fontSize: 12, marginTop: -2 },
      }}
    >
      <Tab.Screen name="Inbox" component={InboxScreen} options={{ title: text.inbox, tabBarIcon: tabIcon("chatbubble-outline", "chatbubble") }} />
      <Tab.Screen name="Write" component={WriteScreen} options={{ title: text.write, tabBarIcon: tabIcon("create-outline", "create") }} />
      <Tab.Screen name="Translate" component={TranslateScreen} options={{ title: text.translate, tabBarIcon: tabIcon("language-outline", "language") }} />
      <Tab.Screen name="Image" component={ImageScreen} options={{ title: text.image, tabBarIcon: tabIcon("image-outline", "image") }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: text.mine, tabBarIcon: tabIcon("person-outline", "person") }} />
    </Tab.Navigator>
  );
}

function tabIcon(idle: IconName, active: IconName) {
  return ({ color, focused }: { color: string; focused: boolean }) => (
    <Icon name={focused ? active : idle} color={color} size={22} />
  );
}

import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import type { NavigationProp, NavigatorScreenParams } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Text, View } from "react-native";
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
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export function openChat(navigation: NavigationProp<MainTabParamList>, params: ChatParams): void {
  const parent = navigation.getParent<NativeStackNavigationProp<AppStackParamList>>();
  parent?.navigate("Chat", params);
}

export function MainTabs() {
  const colors = useColors();
  const locale = usePrefs((state) => state.locale);
  const text = copy[locale];
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.bg, borderTopColor: colors.line, height: 62 },
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.muted,
      }}
    >
      <Tab.Screen name="Inbox" component={InboxScreen} options={{ tabBarLabel: ({ focused }) => label(text.inbox, focused, colors) }} />
      <Tab.Screen name="Write" component={WriteScreen} options={{ tabBarLabel: ({ focused }) => label(text.write, focused, colors) }} />
      <Tab.Screen name="Translate" component={TranslateScreen} options={{ tabBarLabel: ({ focused }) => label(text.translate, focused, colors) }} />
      <Tab.Screen name="Image" component={ImageScreen} options={{ tabBarLabel: ({ focused }) => label(text.image, focused, colors) }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ tabBarLabel: ({ focused }) => label(text.mine, focused, colors) }} />
    </Tab.Navigator>
  );
}

function label(title: string, focused: boolean, colors: { ink: string; muted: string; gold: string }) {
  return (
    <View style={{ borderBottomWidth: focused ? 2 : 0, borderBottomColor: colors.gold, paddingBottom: 4 }}>
      <Text style={{ color: focused ? colors.ink : colors.muted, fontSize: 13 }}>{title}</Text>
    </View>
  );
}

import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Icon, type IconName } from "../shared/ui/Icon";
import { DiscoverScreen } from "../features/discover/DiscoverScreen";
import { ImageScreen } from "../features/image/ImageScreen";
import { InboxScreen } from "../features/inbox/InboxScreen";
import { SettingsScreen } from "../features/settings/SettingsScreen";
import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePrefs } from "../shared/lib/prefs";
import { copy } from "../shared/lib/i18n";
import { useColors } from "../shared/theme";
import type { MainTabParamList } from "./types";

export type { AppStackParamList, AuthParams, ChatParams, MainTabParamList } from "./types";

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabs() {
  const colors = useColors();
  const locale = usePrefs((state) => state.locale);
  const text = copy[locale];
  const insets = useSafeAreaInsets();
  const tabBottom = Math.max(insets.bottom, 8);
  const [keyboardUp, setKeyboardUp] = useState(false);
  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const show = Keyboard.addListener(showEvent, () => setKeyboardUp(true));
    const hide = Keyboard.addListener(hideEvent, () => setKeyboardUp(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return (
    <Tab.Navigator
      safeAreaInsets={{ bottom: 0 }}
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: keyboardUp
          ? { height: 0, overflow: "hidden", borderTopWidth: 0, paddingTop: 0, paddingBottom: 0, display: "none", elevation: 0 }
          : {
              backgroundColor: colors.bg,
              borderTopColor: colors.line,
              paddingTop: 6,
              paddingBottom: tabBottom,
              height: 50 + tabBottom,
            },
        tabBarLabelStyle: { fontSize: 12, marginTop: -2 },
      }}
    >
      <Tab.Screen name="Inbox" component={InboxScreen} options={{ title: text.inbox, tabBarAccessibilityLabel: text.inbox, tabBarIcon: tabIcon("chatbubble-outline", "chatbubble") }} />
      <Tab.Screen name="Image" component={ImageScreen} options={{ title: text.image, tabBarAccessibilityLabel: text.image, tabBarIcon: tabIcon("image-outline", "image") }} />
      <Tab.Screen name="Discover" component={DiscoverScreen} options={{ title: text.discover, tabBarAccessibilityLabel: text.discover, tabBarIcon: tabIcon("compass-outline", "compass") }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: text.mine, tabBarAccessibilityLabel: text.mine, tabBarIcon: tabIcon("person-outline", "person") }} />
    </Tab.Navigator>
  );
}

function tabIcon(idle: IconName, active: IconName) {
  return ({ color, focused }: { color: string; focused: boolean }) => (
    <Icon name={focused ? active : idle} color={color} size={22} />
  );
}

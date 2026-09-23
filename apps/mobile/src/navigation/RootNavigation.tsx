import { NavigationContainer, DarkTheme, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AuthScreen } from "../features/auth/AuthScreen";
import { ChatScreen } from "../features/chat/ChatScreen";
import { InboxScreen } from "../features/inbox/InboxScreen";
import { SettingsScreen } from "../features/settings/SettingsScreen";
import { usePrefs } from "../shared/lib/prefs";
import { usePalette } from "../shared/theme";


export type AppStackParamList = {
  Auth: undefined;
  Inbox: undefined;
  Chat: { conversationId?: string };
  Settings: undefined;
};

const Stack = createNativeStackNavigator<AppStackParamList>();

export function RootNavigation() {
  const token = usePrefs((state) => state.accessToken);
  const ready = usePrefs((state) => state.ready);
  const palette = usePalette();
  if (!ready) return null;
  const theme = {
    ...(palette.bg === "#1B1424" ? DarkTheme : DefaultTheme),
    colors: {
      ...(palette.bg === "#1B1424" ? DarkTheme.colors : DefaultTheme.colors),
      background: palette.bg,
      card: palette.card,
      text: palette.ink,
      primary: palette.violet,
      border: palette.line,
    },
  };
  return (
    <NavigationContainer theme={theme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {token ? (
          <>
            <Stack.Screen name="Inbox" component={InboxScreen} />
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
          </>
        ) : (
          <Stack.Screen name="Auth" component={AuthScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

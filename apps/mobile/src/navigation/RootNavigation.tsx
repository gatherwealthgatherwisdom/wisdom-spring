import { NavigationContainer, DarkTheme, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AuthScreen } from "../features/auth/AuthScreen";
import { CompleteRegistrationScreen } from "../features/auth/CompleteRegistrationScreen";
import { ChatScreen } from "../features/chat/ChatScreen";
import { AllBotsScreen } from "../features/discover/AllBotsScreen";
import { AllToolsScreen } from "../features/discover/AllToolsScreen";
import { ToolScreen } from "../features/discover/ToolScreen";
import { usePrefs } from "../shared/lib/prefs";
import { usePalette } from "../shared/theme";
import { MainTabs, type AppStackParamList } from "./MainTabs";

export type { AppStackParamList, ChatParams } from "./MainTabs";

const Stack = createNativeStackNavigator<AppStackParamList>();

export function RootNavigation() {
  const ready = usePrefs((state) => state.ready);
  const palette = usePalette();
  if (!ready) return null;
  const theme = {
    ...(palette.bg === "#141311" ? DarkTheme : DefaultTheme),
    colors: {
      ...(palette.bg === "#141311" ? DarkTheme.colors : DefaultTheme.colors),
      background: palette.bg,
      card: palette.card,
      text: palette.ink,
      primary: palette.accent,
      border: palette.line,
    },
  };
  return (
    <NavigationContainer theme={theme}>
      <Stack.Navigator initialRouteName="Main" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen name="Chat" component={ChatScreen} />
        <Stack.Screen name="Auth" component={AuthScreen} />
        <Stack.Screen name="Register" component={CompleteRegistrationScreen} />
        <Stack.Screen name="Tool" component={ToolScreen} />
        <Stack.Screen name="AllTools" component={AllToolsScreen} />
        <Stack.Screen name="AllBots" component={AllBotsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

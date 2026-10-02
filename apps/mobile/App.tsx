import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { AppState } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { RootNavigation } from "./src/navigation/RootNavigation";
import { useHistoryStore } from "./src/shared/lib/history";
import { usePrefs } from "./src/shared/lib/prefs";
import { ThemeProvider, usePalette } from "./src/shared/theme";

const queryClient = new QueryClient();

function HistoryBridge() {
  const ready = usePrefs((state) => state.ready);
  const userId = usePrefs((state) => state.user?.id ?? null);
  const token = usePrefs((state) => state.accessToken);
  useEffect(() => {
    if (!ready) return;
    void useHistoryStore.getState().hydrate(token && userId ? userId : null);
  }, [ready, userId, token]);
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      if (next === "active") void useHistoryStore.getState().sync();
    });
    return () => sub.remove();
  }, []);
  return null;
}

function Shell() {
  const hydrate = usePrefs((state) => state.hydrate);
  const palette = usePalette();
  useEffect(() => {
    void hydrate();
  }, [hydrate]);
  return (
    <ThemeProvider value={palette}>
      <HistoryBridge />
      <ExpoStatusBar style={palette.bg === "#141311" ? "light" : "dark"} />
      <RootNavigation />
    </ThemeProvider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <Shell />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

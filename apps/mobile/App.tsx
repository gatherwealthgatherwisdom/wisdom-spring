import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { AppState } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { OtpPrompt } from "./src/features/notices/OtpPrompt";
import { RootNavigation } from "./src/navigation/RootNavigation";
import { useHistoryStore } from "./src/shared/lib/history";
import { INBOX_QUERY } from "./src/shared/lib/otp-prompt";
import { usePrefs } from "./src/shared/lib/prefs";
import {
  configurePush,
  refreshInboxNotices,
  registerPushDevice,
  subscribePushReceived,
  subscribePushResponses,
} from "./src/shared/lib/push";
import { ThemeProvider, usePalette } from "./src/shared/theme";

const queryClient = new QueryClient();

function HistoryBridge() {
  const ready = usePrefs((state) => state.ready);
  const userId = usePrefs((state) => state.user?.id ?? null);
  useEffect(() => {
    if (!ready) return;
    void useHistoryStore.getState().hydrate(userId);
  }, [ready, userId]);
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      if (next === "active") void useHistoryStore.getState().sync();
    });
    return () => sub.remove();
  }, []);
  return null;
}

function PushBridge() {
  const ready = usePrefs((state) => state.ready);
  const token = usePrefs((state) => state.accessToken);
  const queryClient = useQueryClient();
  useEffect(() => {
    configurePush();
    const stopResponses = subscribePushResponses();
    const stopReceived = subscribePushReceived(() => {
      void queryClient.invalidateQueries({ queryKey: INBOX_QUERY });
    });
    return () => {
      stopResponses();
      stopReceived();
    };
  }, [queryClient]);
  useEffect(() => {
    if (!ready || !token) return;
    void registerPushDevice();
    void refreshInboxNotices();
    void queryClient.invalidateQueries({ queryKey: INBOX_QUERY });
  }, [ready, token, queryClient]);
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      if (next !== "active" || !usePrefs.getState().accessToken) return;
      void refreshInboxNotices();
      void queryClient.invalidateQueries({ queryKey: INBOX_QUERY });
    });
    return () => sub.remove();
  }, [queryClient]);
  return null;
}

function Shell() {
  const hydrate = usePrefs((state) => state.hydrate);
  const ready = usePrefs((state) => state.ready);
  const palette = usePalette();
  useEffect(() => {
    void hydrate();
  }, [hydrate]);
  useEffect(() => {
    if (ready) void SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);
  return (
    <ThemeProvider value={palette}>
      <HistoryBridge />
      <PushBridge />
      <ExpoStatusBar style={palette.bg === "#141311" ? "light" : "dark"} />
      <RootNavigation />
      <OtpPrompt />
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

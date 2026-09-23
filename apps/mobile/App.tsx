import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { RootNavigation } from "./src/navigation/RootNavigation";
import { usePrefs } from "./src/shared/lib/prefs";
import { ThemeProvider, usePalette } from "./src/shared/theme";

const queryClient = new QueryClient();

function Shell() {
  const hydrate = usePrefs((state) => state.hydrate);
  const palette = usePalette();
  useEffect(() => {
    void hydrate();
  }, [hydrate]);
  return (
    <ThemeProvider value={palette}>
      <StatusBar style={palette.bg === "#1B1424" ? "light" : "dark"} />
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

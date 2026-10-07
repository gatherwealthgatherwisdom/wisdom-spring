import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { ActivityIndicator, Image, Text, View } from "react-native";
import { copy } from "../shared/lib/i18n";
import { usePrefs } from "../shared/lib/prefs";
import { usePalette } from "../shared/theme";

const mark = require("../../assets/icon.png") as number;

export function LoadingScreen() {
  const palette = usePalette();
  const locale = usePrefs((state) => state.locale);
  const text = copy[locale];
  useEffect(() => {
    void SplashScreen.hideAsync().catch(() => undefined);
  }, []);
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={text.app}
      accessibilityState={{ busy: true }}
      testID="loading-screen"
      style={{ flex: 1, backgroundColor: palette.bg, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}
    >
      <View style={{ width: 96, height: 96, borderRadius: 24, overflow: "hidden" }}>
        <Image source={mark} style={{ width: 96, height: 96 }} />
      </View>
      <Text style={{ fontFamily: "Palatino", fontSize: 28, color: palette.ink, marginTop: 20 }}>{text.app}</Text>
      <Text style={{ color: palette.muted, marginTop: 8, textAlign: "center" }}>{text.splash}</Text>
      <ActivityIndicator color={palette.accent} style={{ marginTop: 28 }} />
    </View>
  );
}

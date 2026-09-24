import { Locale } from "@spring/shared";
import { useQuery } from "@tanstack/react-query";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { spring } from "../../shared/lib/api";
import { copy } from "../../shared/lib/i18n";
import { usePrefs, type Appearance } from "../../shared/lib/prefs";
import { useColors } from "../../shared/theme";

export function SettingsScreen() {
  const colors = useColors();
  const locale = usePrefs((state) => state.locale);
  const text = copy[locale];
  const appearance = usePrefs((state) => state.appearance);
  const setAppearance = usePrefs((state) => state.setAppearance);
  const setLocale = usePrefs((state) => state.setLocale);
  const clear = usePrefs((state) => state.clear);
  const me = useQuery({ queryKey: ["me"], queryFn: () => spring.me() });
  const quota = me.data?.quota;
  const remaining = quota ? Math.max(0, quota.dailyLimit - quota.dailyUsed) : null;

  async function chooseLocale(next: "zh-HK" | "en") {
    setLocale(next);
    const updated = await spring.updateMe({ locale: next === "en" ? Locale.EN : Locale.ZH_HK });
    usePrefs.getState().setUser(updated.user);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, padding: 20 }}>
      <Text style={{ fontSize: 32, color: colors.ink, fontFamily: "Palatino", marginBottom: 8 }}>{text.mine}</Text>
      <View style={{ height: 2, width: 48, backgroundColor: colors.gold, marginBottom: 16 }} />
      <Text style={{ color: colors.muted }}>{text.quota}</Text>
      <Text style={{ color: colors.ink, fontSize: 28, marginBottom: 18 }}>{remaining ?? "—"}</Text>
      <Text style={{ color: colors.ink, marginBottom: 8 }}>{text.language}</Text>
      <Row colors={colors} labels={[["zh-HK", "繁中"], ["en", "English"]]} selected={locale} onPress={(value) => void chooseLocale(value as "zh-HK" | "en")} />
      <Text style={{ color: colors.ink, marginVertical: 8 }}>{text.appearance}</Text>
      <Row
        colors={colors}
        labels={[["system", text.system], ["light", text.light], ["dark", text.dark]]}
        selected={appearance}
        onPress={(value) => setAppearance(value as Appearance)}
      />
      <Pressable onPress={() => { void spring.logout(true).catch(() => undefined); clear(); }} style={{ marginTop: 28 }}>
        <Text style={{ color: colors.violet }}>{text.logout}</Text>
      </Pressable>
      <Pressable
        onPress={() => { void spring.deleteMe().then(() => clear()).catch(() => undefined); }}
        style={{ marginTop: 16 }}
      >
        <Text style={{ color: colors.danger }}>{text.deleteAccount}</Text>
      </Pressable>
    </SafeAreaView>
  );
}

function Row({
  labels,
  selected,
  onPress,
  colors,
}: {
  labels: Array<[string, string]>;
  selected: string;
  onPress: (value: string) => void;
  colors: { card: string; line: string; ink: string; violet: string };
}) {
  return (
    <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
      {labels.map(([value, label]) => (
        <Pressable key={value} onPress={() => onPress(value)} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: selected === value ? colors.violet : colors.line, backgroundColor: colors.card }}>
          <Text style={{ color: colors.ink }}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

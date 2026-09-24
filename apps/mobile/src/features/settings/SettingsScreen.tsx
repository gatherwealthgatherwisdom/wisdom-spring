import { Locale } from "@spring/shared";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { openAuth, openRegister, type MainTabParamList } from "../../navigation/MainTabs";
import { spring } from "../../shared/lib/api";
import { copy } from "../../shared/lib/i18n";
import { usePrefs, type Appearance } from "../../shared/lib/prefs";
import { useColors } from "../../shared/theme";
import { ScreenHeader } from "../../shared/ui/ScreenHeader";

export function SettingsScreen() {
  const colors = useColors();
  const locale = usePrefs((state) => state.locale);
  const text = copy[locale];
  const appearance = usePrefs((state) => state.appearance);
  const setAppearance = usePrefs((state) => state.setAppearance);
  const setLocale = usePrefs((state) => state.setLocale);
  const clear = usePrefs((state) => state.clear);
  const navigation = useNavigation<NavigationProp<MainTabParamList>>();
  const signedIn = usePrefs((state) => Boolean(state.accessToken));
  const sessionUser = usePrefs((state) => state.user);
  const me = useQuery({ queryKey: ["me"], queryFn: () => spring.me(), enabled: signedIn });
  const user = me.data?.user ?? sessionUser;
  const quota = me.data?.quota;
  const remaining = quota ? Math.max(0, quota.dailyLimit - quota.dailyUsed) : null;
  const trialRemaining = user && user.registered === false ? Math.max(0, user.guestLimit - user.guestUses) : null;
  const guest = trialRemaining !== null;

  async function chooseLocale(next: "zh-HK" | "en") {
    setLocale(next);
    if (!usePrefs.getState().accessToken) return;
    const updated = await spring.updateMe({ locale: next === "en" ? Locale.EN : Locale.ZH_HK });
    usePrefs.getState().setUser(updated.user);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, padding: 20 }}>
      <ScreenHeader title={text.mine} />
      {!signedIn ? (
        <>
          <Text style={{ color: colors.ink, marginBottom: 16 }}>{text.signInHint}</Text>
          <Pressable onPress={() => openAuth(navigation)} style={{ backgroundColor: colors.violet, borderRadius: 16, padding: 14, alignItems: "center", marginBottom: 18 }}>
            <Text style={{ color: colors.onAccent }}>{text.login}</Text>
          </Pressable>
        </>
      ) : guest ? (
        <>
          <Text style={{ color: colors.muted }}>{text.trialTitle}</Text>
          <Text style={{ color: colors.ink, fontSize: 28, marginBottom: 8 }}>{text.trialLeft(trialRemaining ?? 0)}</Text>
          {user?.phone ? <Text style={{ color: colors.muted, marginBottom: 8 }}>{user.phone}</Text> : null}
          <Pressable onPress={() => openRegister(navigation)} style={{ marginBottom: 18 }}>
            <Text style={{ color: colors.violet }}>{text.completeRegistration}</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text style={{ color: colors.muted }}>{text.quota}</Text>
          <Text style={{ color: colors.ink, fontSize: 28, marginBottom: 18 }}>{remaining ?? "—"}</Text>
        </>
      )}
      <Text style={{ color: colors.ink, marginBottom: 8 }}>{text.language}</Text>
      <Row colors={colors} labels={[["zh-HK", "繁中"], ["en", "English"]]} selected={locale} onPress={(value) => void chooseLocale(value as "zh-HK" | "en")} />
      <Text style={{ color: colors.ink, marginVertical: 8 }}>{text.appearance}</Text>
      <Row
        colors={colors}
        labels={[["system", text.system], ["light", text.light], ["dark", text.dark]]}
        selected={appearance}
        onPress={(value) => setAppearance(value as Appearance)}
      />
      {signedIn ? (
        <>
          <Pressable onPress={() => { void spring.logout(true).catch(() => undefined); clear(); }} style={{ marginTop: 28 }}>
            <Text style={{ color: colors.violet }}>{text.logout}</Text>
          </Pressable>
          <Pressable
            onPress={() => { void spring.deleteMe().then(() => clear()).catch(() => undefined); }}
            style={{ marginTop: 16 }}
          >
            <Text style={{ color: colors.danger }}>{text.deleteAccount}</Text>
          </Pressable>
        </>
      ) : null}
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

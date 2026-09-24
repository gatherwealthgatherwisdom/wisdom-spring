import { Locale } from "@spring/shared";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { openAuth, openRegister, type MainTabParamList } from "../../navigation/MainTabs";
import { spring } from "../../shared/lib/api";
import { copy } from "../../shared/lib/i18n";
import { usePrefs, type Appearance } from "../../shared/lib/prefs";
import { useColors } from "../../shared/theme";
import { Icon, type IconName } from "../../shared/ui/Icon";
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
      <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 16, marginBottom: 18 }}>
        {!signedIn ? (
          <>
            <Text style={{ color: colors.ink, marginBottom: 12 }}>{text.signInHint}</Text>
            <Pressable onPress={() => openAuth(navigation)} style={{ backgroundColor: colors.accent, borderRadius: 14, padding: 12, alignItems: "center" }}>
              <Text style={{ color: colors.onAccent }}>{text.login}</Text>
            </Pressable>
          </>
        ) : (
          <>
            {user?.phone ? <Text style={{ color: colors.ink, fontSize: 18 }}>{user.phone}</Text> : <Text style={{ color: colors.ink, fontSize: 18 }}>{text.account}</Text>}
            <Text style={{ color: colors.muted, marginTop: 4, marginBottom: 10 }}>
              {guest ? text.trialLeft(trialRemaining ?? 0) : `${text.quota} ${remaining ?? "—"}`}
            </Text>
            {guest ? (
              <Pressable onPress={() => openRegister(navigation)}>
                <Text style={{ color: colors.accent }}>{text.completeRegistration}</Text>
              </Pressable>
            ) : null}
          </>
        )}
      </View>
      <Group title={text.language} colors={colors}>
        <SettingLine icon="language-outline" label="繁中" selected={locale === "zh-HK"} colors={colors} onPress={() => void chooseLocale("zh-HK")} />
        <SettingLine icon="language-outline" label="English" selected={locale === "en"} colors={colors} onPress={() => void chooseLocale("en")} />
      </Group>
      <Group title={text.appearance} colors={colors}>
        <SettingLine icon="phone-portrait-outline" label={text.system} selected={appearance === "system"} colors={colors} onPress={() => setAppearance("system")} />
        <SettingLine icon="sunny-outline" label={text.light} selected={appearance === "light"} colors={colors} onPress={() => setAppearance("light")} />
        <SettingLine icon="moon-outline" label={text.dark} selected={appearance === "dark"} colors={colors} onPress={() => setAppearance("dark")} />
      </Group>
      {signedIn ? (
        <Group title={text.account} colors={colors}>
          <SettingLine icon="log-out-outline" label={text.logout} colors={colors} onPress={() => { void spring.logout(true).catch(() => undefined); clear(); }} />
          <SettingLine icon="trash-outline" label={text.deleteAccount} danger colors={colors} onPress={() => { void spring.deleteMe().then(() => clear()).catch(() => undefined); }} />
        </Group>
      ) : null}
    </SafeAreaView>
  );
}

function Group({ title, colors, children }: { title: string; colors: { muted: string; card: string; line: string }; children: ReactNode }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ color: colors.muted, marginBottom: 8 }}>{title}</Text>
      <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 16, overflow: "hidden" }}>{children}</View>
    </View>
  );
}

function SettingLine({
  icon,
  label,
  selected,
  danger,
  colors,
  onPress,
}: {
  icon: IconName;
  label: string;
  selected?: boolean;
  danger?: boolean;
  colors: { ink: string; accent: string; danger: string; line: string };
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 14, borderTopWidth: 0, borderBottomWidth: 0 }}>
      <Icon name={icon} color={danger ? colors.danger : colors.accent} size={20} />
      <Text style={{ flex: 1, color: danger ? colors.danger : colors.ink, fontSize: 16 }}>{label}</Text>
      {selected ? <Icon name="checkmark" color={colors.accent} size={18} /> : null}
    </Pressable>
  );
}

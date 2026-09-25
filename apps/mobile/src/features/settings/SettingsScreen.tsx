import { Locale } from "@spring/shared";
import * as Clipboard from "expo-clipboard";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Pressable, ScrollView, Switch, Text, View } from "react-native";
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
  const speakNotify = usePrefs((state) => state.speakNotify);
  const setSpeakNotify = usePrefs((state) => state.setSpeakNotify);
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

  const display = user?.displayName?.trim() || text.app;
  const used = guest ? user?.guestUses ?? 0 : quota?.dailyUsed ?? 0;
  const limit = guest ? user?.guestLimit ?? 5 : quota?.dailyLimit ?? 20;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 32 }}>
      <ScreenHeader title={text.mine} />
      <View style={{ alignItems: "center", marginBottom: 18 }}>
        <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.accent, alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
          <Icon name="person-outline" color={colors.ink} size={36} />
        </View>
        <Text style={{ color: colors.ink, fontSize: 20, fontFamily: "Palatino" }}>{signedIn ? display : text.app}</Text>
        <Pressable onPress={() => { if (user?.phone) void Clipboard.setStringAsync(user.phone); }}>
          <Text style={{ color: colors.muted, marginTop: 4 }}>{signedIn ? user?.phone ?? text.account : text.signedOut}</Text>
        </Pressable>
        {signedIn ? (
          <View style={{ marginTop: 8, borderWidth: 1, borderColor: colors.accent, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ color: colors.accent, fontSize: 12 }}>{guest ? text.trialPlan : text.freePlan}</Text>
          </View>
        ) : null}
      </View>
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
            <Text style={{ color: colors.muted, marginTop: 4, marginBottom: 8 }}>
              {text.usedOf(used, limit)}
            </Text>
            <UsageBar used={used} limit={limit} colors={colors} />
            {guest ? (
              <Pressable onPress={() => openRegister(navigation)}>
                <Text style={{ color: colors.accent }}>{text.completeRegistration}</Text>
              </Pressable>
            ) : null}
          </>
        )}
      </View>
      <Group title={text.shortcuts} colors={colors}>
        <SettingLine icon="chatbubble-outline" label={text.lastChat} colors={colors} chevron onPress={() => navigation.navigate("Inbox")} />
        <SettingLine icon="compass-outline" label={text.discover} colors={colors} chevron onPress={() => navigation.navigate("Discover")} />
        <SettingLine icon="image-outline" label={text.image} colors={colors} chevron onPress={() => navigation.navigate("Image")} />
      </Group>
      <Group title={text.notify} colors={colors}>
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10 }}>
          <Icon name="volume-medium-outline" color={colors.accent} size={20} />
          <Text style={{ flex: 1, color: colors.ink, fontSize: 16, marginLeft: 12 }}>{text.speakNotify}</Text>
          <Switch value={speakNotify} onValueChange={setSpeakNotify} trackColor={{ true: colors.accent, false: colors.line }} />
        </View>
      </Group>
      <Group title={text.language} colors={colors}>
        <SettingLine icon="language-outline" label="繁中" selected={locale === "zh-HK"} colors={colors} onPress={() => void chooseLocale("zh-HK")} />
        <SettingLine icon="language-outline" label="English" selected={locale === "en"} colors={colors} onPress={() => void chooseLocale("en")} />
      </Group>
      <Group title={text.appearance} colors={colors}>
        <SettingLine icon="phone-portrait-outline" label={text.system} selected={appearance === "system"} colors={colors} onPress={() => setAppearance("system")} />
        <SettingLine icon="sunny-outline" label={text.light} selected={appearance === "light"} colors={colors} onPress={() => setAppearance("light")} />
        <SettingLine icon="moon-outline" label={text.dark} selected={appearance === "dark"} colors={colors} onPress={() => setAppearance("dark")} />
      </Group>
      <Group title={text.about} colors={colors}>
        <View style={{ paddingHorizontal: 14, paddingVertical: 14 }}>
          <Text style={{ color: colors.ink, fontFamily: "Palatino", fontSize: 18 }}>智泉</Text>
          <Text style={{ color: colors.muted, marginTop: 4 }}>{text.splash}</Text>
          <Text style={{ color: colors.muted, marginTop: 4 }}>{text.company}</Text>
          <Text style={{ color: colors.muted, marginTop: 8 }}>{text.version} 1.0.0</Text>
        </View>
      </Group>
      {signedIn ? (
        <Group title={text.account} colors={colors}>
          <SettingLine icon="log-out-outline" label={text.logout} colors={colors} onPress={() => { void spring.logout(true).catch(() => undefined); clear(); }} />
          <SettingLine icon="trash-outline" label={text.deleteAccount} danger colors={colors} onPress={() => { void spring.deleteMe().then(() => clear()).catch(() => undefined); }} />
        </Group>
      ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function UsageBar({ used, limit, colors }: { used: number; limit: number; colors: { accent: string; line: string } }) {
  const width = limit <= 0 ? 0 : Math.min(100, Math.round((used / limit) * 100));
  return (
    <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.line, overflow: "hidden", marginBottom: 10 }}>
      <View style={{ width: `${width}%`, height: 6, backgroundColor: colors.accent }} />
    </View>
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
  chevron,
  colors,
  onPress,
}: {
  icon: IconName;
  label: string;
  selected?: boolean;
  danger?: boolean;
  chevron?: boolean;
  colors: { ink: string; accent: string; danger: string; line: string };
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.line }}>
      <Icon name={icon} color={danger ? colors.danger : colors.accent} size={20} />
      <Text style={{ flex: 1, color: danger ? colors.danger : colors.ink, fontSize: 16 }}>{label}</Text>
      {selected ? <Icon name="checkmark" color={colors.accent} size={18} /> : null}
      {chevron ? <Icon name="chevron-forward" color={colors.line} size={18} /> : null}
    </Pressable>
  );
}

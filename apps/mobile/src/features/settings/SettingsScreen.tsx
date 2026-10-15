import { formatE164, Locale, PlanTier, microsToUsd, type AppLocale, type MeResponse, type UserPublic } from "@spring/shared";
import * as Clipboard from "expo-clipboard";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp } from "@react-navigation/native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Switch, Text, TextInput, View } from "react-native";
import { Screen } from "../../shared/ui/Screen";
import { useHostInsets } from "../../shared/ui/hostInsets";
import { openAuth, openChat, openRegister } from "../../navigation/open";
import type { MainTabParamList } from "../../navigation/types";
import { spring } from "../../shared/lib/api";
import { useHistory, useHistoryStore } from "../../shared/lib/history";
import { copy, type Copy } from "../../shared/lib/i18n";
import { usePrefs, type Appearance } from "../../shared/lib/prefs";
import { registerPushDevice, requestPushPermission, unregisterPushDevice } from "../../shared/lib/push";
import { formatWhen } from "../../shared/lib/time";
import { useColors } from "../../shared/theme";
import { Icon, type IconName } from "../../shared/ui/Icon";
import { ScreenHeader } from "../../shared/ui/ScreenHeader";

export function SettingsScreen() {
  const colors = useColors();
  const insets = useHostInsets();
  const locale = usePrefs((state) => state.locale);
  const text = copy[locale];
  const appearance = usePrefs((state) => state.appearance);
  const setAppearance = usePrefs((state) => state.setAppearance);
  const setLocale = usePrefs((state) => state.setLocale);
  const speakNotify = usePrefs((state) => state.speakNotify);
  const setSpeakNotify = usePrefs((state) => state.setSpeakNotify);
  const clear = usePrefs((state) => state.clear);
  const navigation = useNavigation<NavigationProp<MainTabParamList>>();
  const queryClient = useQueryClient();
  const signedIn = usePrefs((state) => Boolean(state.accessToken));
  const sessionUser = usePrefs((state) => state.user);
  const last = useHistory().lastActive;
  const pulledAt = useHistoryStore((state) => state.pulledAt);
  const savedCount = useHistoryStore((state) => state.conversations.length);
  const syncing = useHistoryStore((state) => state.syncing);
  const [notice, setNotice] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const me = useQuery({ queryKey: ["me"], queryFn: () => spring.me(), enabled: signedIn });
  const usage = useQuery({ queryKey: ["me-usage"], queryFn: () => spring.meUsage(), enabled: signedIn });
  const user = me.data?.user ?? sessionUser;
  const quota = me.data?.quota;
  const remaining = quota ? Math.max(0, quota.dailyLimit - quota.dailyUsed) : null;
  const trialRemaining = user && user.registered === false ? Math.max(0, user.guestLimit - user.guestUses) : null;
  const guest = trialRemaining !== null;

  async function chooseLocale(next: AppLocale) {
    setLocale(next);
    if (!usePrefs.getState().accessToken) return;
    const updated = await spring.updateMe({ locale: next as Locale });
    usePrefs.getState().setUser(updated.user);
  }

  async function setNotifyFlag(patch: { notifyGenerationDone?: boolean; notifyQuotaLow?: boolean }) {
    const previous = queryClient.getQueryData<MeResponse>(["me"]);
    const previousUser = usePrefs.getState().user;
    if (previousUser) {
      const nextUser = { ...previousUser, ...patch };
      usePrefs.getState().setUser(nextUser);
      queryClient.setQueryData<MeResponse>(["me"], (current) =>
        current ? { ...current, user: { ...current.user, ...patch } } : current,
      );
    }
    if (patch.notifyGenerationDone === true || patch.notifyQuotaLow === true) {
      await requestPushPermission();
      await registerPushDevice();
    }
    if (!usePrefs.getState().accessToken) return;
    try {
      const updated = await spring.updateMe(patch);
      usePrefs.getState().setUser(updated.user);
      queryClient.setQueryData(["me"], updated);
    } catch {
      if (previousUser) usePrefs.getState().setUser(previousUser);
      if (previous !== undefined) queryClient.setQueryData(["me"], previous);
    }
  }

  const display = user?.displayName?.trim() || text.app;
  const used = guest ? user?.guestUses ?? 0 : quota?.dailyUsed ?? 0;
  const limit = guest ? user?.guestLimit ?? 5 : quota?.dailyLimit ?? 20;
  const badge = planLabel(user, text);

  async function saveDisplayName() {
    if (!usePrefs.getState().accessToken) return;
    const trimmed = nameDraft.trim();
    const updated = await spring.updateMe({ displayName: trimmed.length > 0 ? trimmed : null });
    usePrefs.getState().setUser(updated.user);
    queryClient.setQueryData(["me"], updated);
    setEditingName(false);
    setNotice(text.displayNameSaved);
  }

  async function deleteAccount() {
    setConfirmingDelete(false);
    try {
      await unregisterPushDevice().catch(() => undefined);
      await spring.deleteMe();
    } finally {
      void useHistoryStore.getState().hydrate(null);
      clear();
    }
  }

  return (
    <Screen edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 50 + insets.bottom + 16 }}>
      <ScreenHeader title={text.mine} />
      <View style={{ alignItems: "center", marginBottom: 14 }}>
        <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.accent, alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
          <Icon name="person-outline" color={colors.ink} size={32} />
        </View>
        <Text style={{ color: colors.ink, fontSize: 20, fontFamily: "Palatino" }}>{signedIn ? display : text.app}</Text>
        <Pressable onPress={() => { if (user?.phone) void Clipboard.setStringAsync(user.phone); }}>
          <Text style={{ color: colors.muted, marginTop: 4 }}>{signedIn ? (user?.phone ? formatE164(user.phone) : text.account) : text.signedOut}</Text>
        </Pressable>
        {signedIn ? (
          <View
            testID="plan-badge"
            accessibilityLabel={badge}
            style={{ marginTop: 8, borderWidth: 1, borderColor: colors.accent, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}
          >
            <Text style={{ color: colors.accent, fontSize: 12 }}>{badge}</Text>
          </View>
        ) : null}
      </View>
      <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 16, marginBottom: 14 }}>
        {!signedIn ? (
          <>
            <Text style={{ color: colors.ink, marginBottom: 12 }}>{text.signInHint}</Text>
            <Pressable onPress={() => openAuth(navigation)} style={{ backgroundColor: colors.accent, borderRadius: 14, padding: 12, alignItems: "center" }}>
              <Text style={{ color: colors.onAccent }}>{text.login}</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={{ color: colors.ink, fontSize: 18, marginBottom: 8 }}>{text.usedOf(used, limit)}</Text>
            <UsageBar used={used} limit={limit} colors={colors} />
            {usage.data ? (
              <Text style={{ color: colors.muted, marginBottom: 4 }}>
                {text.monthlyUsage(usage.data.requests, microsToUsd(usage.data.costUsdMicros))}
              </Text>
            ) : null}
            {guest ? (
              <Pressable onPress={() => openRegister(navigation)}>
                <Text style={{ color: colors.accent }}>{text.completeRegistration}</Text>
              </Pressable>
            ) : null}
          </>
        )}
      </View>
      <Group title={text.shortcuts} colors={colors}>
        <SettingLine
          icon="chatbubble-outline"
          label={last?.title || text.lastChat}
          colors={colors}
          chevron
          onPress={() => {
            if (last) openChat(navigation, { conversationId: last.id, mode: last.mode });
            else navigation.navigate("Inbox");
          }}
        />
        <SettingLine icon="compass-outline" label={text.discover} colors={colors} chevron onPress={() => navigation.navigate("Discover")} />
        <SettingLine icon="image-outline" label={text.image} colors={colors} chevron onPress={() => navigation.navigate("Image")} />
      </Group>
      {signedIn ? (
        <Group title={text.storage} colors={colors}>
          <View style={{ paddingHorizontal: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.line }}>
            <Text style={{ color: colors.ink, fontSize: 16 }}>{text.onDevice(savedCount)}</Text>
            <Text style={{ color: colors.muted, marginTop: 4 }}>
              {pulledAt ? text.lastSync(formatWhen(pulledAt, locale)) : text.neverSync}
            </Text>
            {notice ? <Text style={{ color: colors.accent, marginTop: 8 }}>{notice}</Text> : null}
          </View>
          <SettingLine
            icon="sync-outline"
            label={text.syncNow}
            colors={colors}
            disabled={syncing}
            onPress={() => {
              void useHistoryStore
                .getState()
                .sync()
                .then(() => {
                  if (useHistoryStore.getState().online) setNotice(text.synced);
                });
            }}
          />
          <SettingLine
            icon="image-outline"
            label={text.clearCache}
            colors={colors}
            onPress={() => {
              void useHistoryStore
                .getState()
                .clearMediaCache()
                .then(() => setNotice(text.cacheCleared));
            }}
          />
        </Group>
      ) : null}
      <Group title={text.notify} colors={colors}>
        {signedIn ? (
          <>
            <NotifySwitch
              icon="notifications-outline"
              label={text.notifyGenerationDone}
              testID="notify-generation"
              value={user?.notifyGenerationDone !== false}
              onValueChange={(next) => void setNotifyFlag({ notifyGenerationDone: next })}
              colors={colors}
            />
            <NotifySwitch
              icon="hourglass-outline"
              label={text.notifyQuotaLow}
              testID="notify-quota"
              value={user?.notifyQuotaLow !== false}
              onValueChange={(next) => void setNotifyFlag({ notifyQuotaLow: next })}
              colors={colors}
            />
          </>
        ) : null}
        <NotifySwitch
          icon="volume-medium-outline"
          label={text.speakNotify}
          value={speakNotify}
          onValueChange={setSpeakNotify}
          colors={colors}
        />
      </Group>
      <Group title={text.language} colors={colors}>
        <SettingLine icon="language-outline" label="繁體中文" selected={locale === "zh-HK"} colors={colors} onPress={() => void chooseLocale("zh-HK")} />
        <SettingLine icon="language-outline" label="简体中文" selected={locale === "zh-CN"} colors={colors} onPress={() => void chooseLocale("zh-CN")} />
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
          <SettingLine
            icon="person-outline"
            label={text.displayName}
            colors={colors}
            chevron
            onPress={() => {
              setNameDraft(user?.displayName ?? "");
              setEditingName(true);
            }}
          />
          <SettingLine
            icon="log-out-outline"
            label={text.logout}
            colors={colors}
            onPress={() => {
              void unregisterPushDevice()
                .catch(() => undefined)
                .finally(() => {
                  void spring.logout(true).catch(() => undefined);
                  void useHistoryStore.getState().hydrate(null);
                  clear();
                });
            }}
          />
          <SettingLine
            icon="trash-outline"
            label={text.deleteAccount}
            danger
            colors={colors}
            onPress={() => setConfirmingDelete(true)}
          />
        </Group>
      ) : null}
      </ScrollView>
      {editingName ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: "#00000066", justifyContent: "center", padding: 24 }}
        >
          <Pressable onPress={() => setEditingName(false)} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} />
          <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.line }}>
            <Text style={{ color: colors.ink, fontSize: 16, marginBottom: 12 }}>{text.displayName}</Text>
            <TextInput
              testID="display-name"
              value={nameDraft}
              onChangeText={setNameDraft}
              placeholder={text.displayName}
              placeholderTextColor={colors.muted}
              maxLength={80}
              autoFocus
              onSubmitEditing={() => void saveDisplayName()}
              style={{ borderWidth: 1, borderColor: colors.line, backgroundColor: colors.bg, color: colors.ink, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 }}
            />
            <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 12 }}>
              <Pressable onPress={() => setEditingName(false)} style={{ paddingHorizontal: 12, paddingVertical: 10 }}>
                <Text style={{ color: colors.muted }}>{text.cancel}</Text>
              </Pressable>
              <Pressable
                testID="save-display-name"
                onPress={() => void saveDisplayName()}
                style={{ backgroundColor: colors.accent, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 }}
              >
                <Text style={{ color: colors.onAccent }}>{text.save}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      ) : null}
      {confirmingDelete ? (
        <View style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: "#00000066", justifyContent: "center", padding: 24 }}>
          <Pressable onPress={() => setConfirmingDelete(false)} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} />
          <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.line }}>
            <Text style={{ color: colors.ink, fontSize: 16, marginBottom: 16 }}>{text.confirmDeleteAccount}</Text>
            <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 12 }}>
              <Pressable onPress={() => setConfirmingDelete(false)} style={{ paddingHorizontal: 12, paddingVertical: 10 }}>
                <Text style={{ color: colors.muted }}>{text.cancel}</Text>
              </Pressable>
              <Pressable
                testID="confirm-delete-account"
                onPress={() => void deleteAccount()}
                style={{ backgroundColor: colors.danger, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 }}
              >
                <Text style={{ color: colors.onAccent }}>{text.deleteAccount}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}
    </Screen>
  );
}

function planLabel(user: UserPublic | undefined, text: Copy): string {
  if (!user || user.registered === false) return text.trialPlan;
  if (user.planTier === PlanTier.PLUS) return text.plusPlan;
  if (user.planTier === PlanTier.INTERNAL) return text.internalPlan;
  return text.freePlan;
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

function NotifySwitch({
  icon,
  label,
  value,
  testID,
  colors,
  onValueChange,
}: {
  icon: IconName;
  label: string;
  value: boolean;
  testID?: string;
  colors: { ink: string; accent: string; line: string };
  onValueChange: (next: boolean) => void;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line }}>
      <Icon name={icon} color={colors.accent} size={20} />
      <Text style={{ flex: 1, color: colors.ink, fontSize: 16, marginLeft: 12 }}>{label}</Text>
      <Switch
        testID={testID}
        accessibilityLabel={label}
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: colors.accent, false: colors.line }}
      />
    </View>
  );
}

function SettingLine({
  icon,
  label,
  selected,
  danger,
  chevron,
  disabled,
  colors,
  onPress,
}: {
  icon: IconName;
  label: string;
  selected?: boolean;
  danger?: boolean;
  chevron?: boolean;
  disabled?: boolean;
  colors: { ink: string; accent: string; danger: string; line: string };
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.line, opacity: disabled ? 0.45 : 1 }}
    >
      <Icon name={icon} color={danger ? colors.danger : colors.accent} size={20} />
      <Text style={{ flex: 1, color: danger ? colors.danger : colors.ink, fontSize: 16 }}>{label}</Text>
      {selected ? <Icon name="checkmark" color={colors.accent} size={18} /> : null}
      {chevron ? <Icon name="chevron-forward" color={colors.line} size={18} /> : null}
    </Pressable>
  );
}

import type { ConversationView } from "@spring/shared";
import { ConversationStatus } from "@spring/shared";
import type { NavigationProp } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useHostInsets } from "../../shared/ui/hostInsets";
import { openAuth, openChat, type MainTabParamList } from "../../navigation/MainTabs";
import { groupHistory, useHistory, useHistoryStore } from "../../shared/lib/history";
import { copy, type Copy } from "../../shared/lib/i18n";
import { usePrefs } from "../../shared/lib/prefs";
import { formatWhen } from "../../shared/lib/time";
import { useColors, type Palette } from "../../shared/theme";
import { Icon, type IconName } from "../../shared/ui/Icon";

export function DrawerMenu({
  open,
  onClose,
  navigation,
}: {
  open: boolean;
  onClose: () => void;
  navigation: NavigationProp<MainTabParamList>;
}) {
  const colors = useColors();
  const insets = useHostInsets(open);
  const locale = usePrefs((state) => state.locale);
  const text = copy[locale];
  const signedIn = usePrefs((state) => Boolean(state.accessToken));
  const user = usePrefs((state) => state.user);
  const [q, setQ] = useState("");
  const [renaming, setRenaming] = useState<ConversationView | null>(null);
  const [renameTitle, setRenameTitle] = useState("");
  const trimmed = q.trim();
  const history = useHistory({ q: trimmed });
  const groups = groupHistory(history.items);
  const initial = user?.displayName?.trim().charAt(0) ?? "";

  useEffect(() => {
    if (!open) {
      setQ("");
      setRenaming(null);
      return;
    }
    if (signedIn) void useHistoryStore.getState().sync();
  }, [open, signedIn]);

  function goChat(params: Parameters<typeof openChat>[1]) {
    onClose();
    openChat(navigation, params);
  }

  function manage(item: ConversationView) {
    Alert.alert(item.title || text.newChat, undefined, [
      {
        text: item.pinnedAt ? text.unpin : text.pin,
        onPress: () => {
          void history.pin(item.id, !item.pinnedAt);
        },
      },
      {
        text: text.rename,
        onPress: () => {
          setRenaming(item);
          setRenameTitle(item.title ?? "");
        },
      },
      {
        text: item.status === ConversationStatus.ARCHIVED ? text.restore : text.archive,
        onPress: () => {
          void history.setStatus(
            item.id,
            item.status === ConversationStatus.ARCHIVED ? ConversationStatus.ACTIVE : ConversationStatus.ARCHIVED,
          );
        },
      },
      {
        text: text.remove,
        style: "destructive",
        onPress: () => {
          Alert.alert(text.confirmRemove, item.title || text.newChat, [
            { text: text.cancel, style: "cancel" },
            {
              text: text.remove,
              style: "destructive",
              onPress: () => {
                void history.remove(item.id);
              },
            },
          ]);
        },
      },
      { text: text.cancel, style: "cancel" },
    ]);
  }

  function saveRename() {
    if (!renaming) return;
    const title = renameTitle.trim();
    if (title) void history.rename(renaming.id, title);
    setRenaming(null);
  }

  return (
    <Modal visible={open} animationType="fade" transparent statusBarTranslucent onRequestClose={onClose}>
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 0, height: 0 },
          insets,
        }}
      >
      <View style={{ flex: 1, flexDirection: "row" }}>
        <View style={{ width: "82%", backgroundColor: colors.bg, paddingTop: insets.top, paddingBottom: insets.bottom }}>
          <View style={{ paddingHorizontal: 12, paddingBottom: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", minHeight: 40 }}>
              <Text style={{ flex: 1, color: colors.ink, fontFamily: "Palatino", fontSize: 22 }}>{text.app}</Text>
              <Pressable accessibilityLabel={text.back} onPress={onClose} style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
                <Icon name="close" color={colors.ink} size={22} />
              </Pressable>
            </View>
            <Pressable
              onPress={() => goChat({ mode: "chat" })}
              style={{ marginTop: 12, backgroundColor: colors.accent, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}
            >
              <Icon name="add" color={colors.onAccent} size={20} />
              <Text style={{ color: colors.onAccent, fontSize: 16 }}>{text.newChat}</Text>
            </Pressable>
            {signedIn ? (
              <View style={{ marginTop: 12, flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, borderRadius: 12, paddingHorizontal: 12 }}>
                <Icon name="search-outline" color={colors.muted} size={18} />
                <TextInput
                  value={q}
                  onChangeText={setQ}
                  placeholder={text.search}
                  placeholderTextColor={colors.muted}
                  autoCorrect={false}
                  style={{ flex: 1, paddingVertical: 12, color: colors.ink }}
                />
              </View>
            ) : null}
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: 16 }}>
            {signedIn && !history.online ? (
              <View style={{ marginHorizontal: 8, marginTop: 8, marginBottom: 4, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 }}>
                <Text style={{ color: colors.muted, fontSize: 13 }}>{text.offlineHistory}</Text>
              </View>
            ) : null}
            {!signedIn ? (
              <View style={{ marginHorizontal: 8, marginTop: 8, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 16 }}>
                <Text style={{ color: colors.ink, marginBottom: 12 }}>{text.signInHint}</Text>
                <Pressable
                  onPress={() => {
                    onClose();
                    openAuth(navigation);
                  }}
                  style={{ backgroundColor: colors.accent, borderRadius: 14, padding: 12, alignItems: "center" }}
                >
                  <Text style={{ color: colors.onAccent }}>{text.login}</Text>
                </Pressable>
              </View>
            ) : !history.ready && history.items.length === 0 ? (
              <View style={{ height: 24 }} />
            ) : history.items.length === 0 ? (
              <Text style={{ color: colors.muted, padding: 16 }}>{text.emptyChats}</Text>
            ) : (
              <>
                <ChatGroup title={text.pinned} items={groups.pinned} colors={colors} locale={locale} text={text} onOpen={goChat} onManage={manage} />
                <ChatGroup title={text.today} items={groups.today} colors={colors} locale={locale} text={text} onOpen={goChat} onManage={manage} />
                <ChatGroup title={text.yesterday} items={groups.yesterday} colors={colors} locale={locale} text={text} onOpen={goChat} onManage={manage} />
                <ChatGroup title={text.earlier} items={groups.earlier} colors={colors} locale={locale} text={text} onOpen={goChat} onManage={manage} />
                <ChatGroup title={text.archive} items={groups.archived} colors={colors} locale={locale} text={text} onOpen={goChat} onManage={manage} />
              </>
            )}
          </ScrollView>
          <View style={{ borderTopWidth: 1, borderTopColor: colors.line, paddingHorizontal: 8, paddingVertical: 8 }}>
            <Pressable
              onPress={() => {
                onClose();
                navigation.navigate("Discover");
              }}
              style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12 }}
            >
              <Icon name="compass-outline" color={colors.accent} size={20} />
              <Text style={{ color: colors.ink, fontSize: 16 }}>{text.discover}</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                onClose();
                if (signedIn) navigation.navigate("Settings");
                else openAuth(navigation);
              }}
              style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12 }}
            >
              <View style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: signedIn ? colors.accent : colors.line, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" }}>
                {signedIn && initial ? (
                  <Text style={{ color: colors.ink, fontSize: 13 }}>{initial}</Text>
                ) : (
                  <Icon name="person-outline" color={colors.ink} size={14} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.ink, fontSize: 16 }} numberOfLines={1}>
                  {signedIn ? user?.displayName?.trim() || user?.phone || text.account : text.signedOut}
                </Text>
                <Text style={{ color: colors.muted, fontSize: 12 }}>{signedIn ? text.mine : text.login}</Text>
              </View>
            </Pressable>
          </View>
        </View>
        <Pressable accessibilityLabel={text.back} onPress={onClose} style={{ flex: 1, backgroundColor: "#00000066" }} />
      </View>
      {renaming ? (
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: "#00000066", justifyContent: "center", padding: 24 }}>
          <Pressable onPress={() => setRenaming(null)} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} />
          <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.line }}>
            <Text style={{ color: colors.ink, fontSize: 16, marginBottom: 12 }}>{text.rename}</Text>
            <TextInput
              value={renameTitle}
              onChangeText={setRenameTitle}
              placeholder={text.titlePlaceholder}
              placeholderTextColor={colors.muted}
              maxLength={80}
              autoFocus
              onSubmitEditing={saveRename}
              style={{ borderWidth: 1, borderColor: colors.line, backgroundColor: colors.bg, color: colors.ink, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 }}
            />
            <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 12 }}>
              <Pressable onPress={() => setRenaming(null)} style={{ paddingHorizontal: 12, paddingVertical: 10 }}>
                <Text style={{ color: colors.muted }}>{text.cancel}</Text>
              </Pressable>
              <Pressable onPress={saveRename} style={{ backgroundColor: colors.accent, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 }}>
                <Text style={{ color: colors.onAccent }}>{text.save}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      ) : null}
      </SafeAreaProvider>
    </Modal>
  );
}

function ChatGroup({
  title,
  items,
  colors,
  locale,
  text,
  onOpen,
  onManage,
}: {
  title: string;
  items: ConversationView[];
  colors: Palette;
  locale: "zh-HK" | "en";
  text: Copy;
  onOpen: (params: Parameters<typeof openChat>[1]) => void;
  onManage: (item: ConversationView) => void;
}) {
  if (items.length === 0) return null;
  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={{ color: colors.muted, fontSize: 12, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 4 }}>{title}</Text>
      {items.map((item) => (
        <Pressable
          key={item.id}
          onPress={() => onOpen({ conversationId: item.id, mode: item.mode })}
          onLongPress={() => onManage(item)}
          style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12 }}
        >
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center" }}>
            <Icon name={modeIcon(item.mode)} color={colors.accent} size={16} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
              <Text style={{ flex: 1, color: colors.ink, fontSize: 16 }} numberOfLines={1}>
                {item.title || text.newChat}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>{formatWhen(item.lastMessageAt, locale)}</Text>
            </View>
            {item.preview ? (
              <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                {item.preview}
              </Text>
            ) : (
              <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>{modeLabel(item.mode, text)}</Text>
            )}
          </View>
          {item.pinnedAt ? <Icon name="bookmark" color={colors.accent} size={16} /> : null}
        </Pressable>
      ))}
    </View>
  );
}

function modeIcon(mode: ConversationView["mode"]): IconName {
  if (mode === "write") return "create-outline";
  if (mode === "translate") return "language-outline";
  if (mode === "image") return "image-outline";
  return "chatbubble-outline";
}

function modeLabel(mode: ConversationView["mode"], text: Copy): string {
  if (mode === "write") return text.write;
  if (mode === "translate") return text.translate;
  if (mode === "image") return text.image;
  return text.inbox;
}

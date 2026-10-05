import type { ConversationView } from "@spring/shared";
import { ConversationStatus } from "@spring/shared";
import type { NavigationProp } from "@react-navigation/native";
import * as Clipboard from "expo-clipboard";
import { useEffect, useMemo, useState } from "react";
import { Alert, Image, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useHostInsets } from "../../shared/ui/hostInsets";
import { openAuth, openChat, type MainTabParamList } from "../../navigation/MainTabs";
import { mediaUrl } from "../../shared/lib/api";
import { groupHistory, inTrashWindow, useHistory, useHistoryStore, type HistoryHit } from "../../shared/lib/history";
import { copy, type Copy } from "../../shared/lib/i18n";
import { usePrefs } from "../../shared/lib/prefs";
import { formatWhen } from "../../shared/lib/time";
import { useColors, type Palette } from "../../shared/theme";
import { Icon, type IconName } from "../../shared/ui/Icon";

const MODE_CHIPS: Array<{ mode?: ConversationView["mode"]; label: (text: Copy) => string }> = [
  { label: (text) => text.all },
  { mode: "chat", label: (text) => text.inbox },
  { mode: "write", label: (text) => text.write },
  { mode: "translate", label: (text) => text.translate },
  { mode: "image", label: (text) => text.image },
];

const emptySelected = new Set<string>();

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
  const [mode, setMode] = useState<ConversationView["mode"] | undefined>();
  const [renaming, setRenaming] = useState<ConversationView | null>(null);
  const [renameTitle, setRenameTitle] = useState("");
  const [selected, setSelected] = useState<Set<string> | null>(null);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);
  const trimmed = q.trim();
  const history = useHistory({ q: trashOpen ? "" : trimmed, mode: trashOpen ? undefined : mode, trash: trashOpen });
  const conversations = useHistoryStore((state) => state.conversations);
  const syncing = useHistoryStore((state) => state.syncing);
  const groups = groupHistory(history.items);
  const hitsById = useMemo(() => new Map(history.hits.map((hit) => [hit.conversationId, hit])), [history.hits]);
  const searching = !trashOpen && trimmed.length > 0;
  const selecting = selected !== null;
  const trashCount = conversations.filter((item) => inTrashWindow(item)).length;
  const picked = useMemo(
    () => conversations.filter((item) => selected?.has(item.id)),
    [conversations, selected],
  );
  const allPinned = picked.length > 0 && picked.every((item) => item.pinnedAt);
  const allArchived = picked.length > 0 && picked.every((item) => item.status === ConversationStatus.ARCHIVED);
  const initial = user?.displayName?.trim().charAt(0) ?? "";

  useEffect(() => {
    if (!open) {
      setQ("");
      setMode(undefined);
      setRenaming(null);
      setSelected(null);
      setConfirmingRemove(false);
      setTrashOpen(false);
      return;
    }
    if (signedIn) void useHistoryStore.getState().sync();
  }, [open, signedIn]);

  function goChat(params: Parameters<typeof openChat>[1]) {
    onClose();
    openChat(navigation, params);
  }

  function enterSelect(id?: string) {
    setSelected(new Set(id ? [id] : []));
  }

  function toggleSelect(id: string) {
    setSelected((current) => {
      const next = new Set(current ?? []);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function fillCount(template: string, n: number) {
    return template.replace("{n}", String(n));
  }

  async function exportPicked() {
    const item = picked[0];
    if (!item) return;
    try {
      const markdown = await useHistoryStore.getState().exportThread(item.id);
      await Clipboard.setStringAsync(markdown);
      Alert.alert(text.copiedChat);
    } catch {
      Alert.alert(text.exportChat);
    }
  }

  function confirmRemovePicked() {
    if (picked.length === 0) return;
    setConfirmingRemove(true);
  }

  function removePicked() {
    const ids = picked.map((item) => item.id);
    setConfirmingRemove(false);
    void history.removeMany(ids).then(() => setSelected(null));
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
              {selecting ? (
                <>
                  <Text style={{ flex: 1, color: colors.ink, fontFamily: "Palatino", fontSize: 22 }}>
                    {fillCount(text.selectedCount, picked.length)}
                  </Text>
                  <Pressable onPress={() => setSelected(new Set(history.items.map((item) => item.id)))} style={{ paddingHorizontal: 10, height: 40, justifyContent: "center" }}>
                    <Text style={{ color: colors.accent, fontSize: 15 }}>{text.selectAll}</Text>
                  </Pressable>
                  <Pressable onPress={() => setSelected(null)} style={{ paddingHorizontal: 10, height: 40, justifyContent: "center" }}>
                    <Text style={{ color: colors.ink, fontSize: 15 }}>{text.cancel}</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Text style={{ flex: 1, color: colors.ink, fontFamily: "Palatino", fontSize: 22 }}>
                    {trashOpen ? text.recentlyDeleted : text.app}
                  </Text>
                  {signedIn && history.items.length > 0 ? (
                    <Pressable accessibilityLabel={text.tidy} onPress={() => enterSelect()} style={{ paddingHorizontal: 10, height: 40, justifyContent: "center" }}>
                      <Text style={{ color: colors.accent, fontSize: 15 }}>{text.tidy}</Text>
                    </Pressable>
                  ) : null}
                  {trashOpen ? (
                    <Pressable onPress={() => setTrashOpen(false)} style={{ paddingHorizontal: 10, height: 40, justifyContent: "center" }}>
                      <Text style={{ color: colors.ink, fontSize: 15 }}>{text.done}</Text>
                    </Pressable>
                  ) : (
                    <Pressable accessibilityLabel={text.back} onPress={onClose} style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
                      <Icon name="close" color={colors.ink} size={22} />
                    </Pressable>
                  )}
                </>
              )}
            </View>
            {selecting || trashOpen ? null : (
              <Pressable
                onPress={() => goChat({ mode: "chat" })}
                style={{ marginTop: 12, backgroundColor: colors.accent, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}
              >
                <Icon name="add" color={colors.onAccent} size={20} />
                <Text style={{ color: colors.onAccent, fontSize: 16 }}>{text.newChat}</Text>
              </Pressable>
            )}
            {signedIn && !trashOpen ? (
              <>
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
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10, flexGrow: 0 }} contentContainerStyle={{ gap: 8, paddingRight: 4, alignItems: "flex-start" }}>
                  {MODE_CHIPS.map((chip) => {
                    const selected = mode === chip.mode;
                    return (
                      <Pressable
                        key={chip.mode ?? "all"}
                        onPress={() => setMode(chip.mode)}
                        style={{
                          borderRadius: 999,
                          paddingHorizontal: 12,
                          paddingVertical: 7,
                          backgroundColor: selected ? colors.accent : colors.card,
                          borderWidth: 1,
                          borderColor: selected ? colors.accent : colors.line,
                        }}
                      >
                        <Text style={{ color: selected ? colors.onAccent : colors.ink, fontSize: 13 }}>{chip.label(text)}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </>
            ) : null}
          </View>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: 16 }}
            refreshControl={
              signedIn ? (
                <RefreshControl
                  refreshing={syncing}
                  onRefresh={() => {
                    void useHistoryStore.getState().sync();
                  }}
                  tintColor={colors.accent}
                  colors={[colors.accent]}
                />
              ) : undefined
            }
          >
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
              <Text style={{ color: colors.muted, padding: 16 }}>
                {trashOpen ? text.emptyTrash : searching ? text.emptySearch : text.emptyChats}
              </Text>
            ) : trashOpen ? (
              <ChatGroup
                title=""
                items={history.items}
                colors={colors}
                locale={locale}
                text={text}
                hits={hitsById}
                selecting={selecting}
                selected={selected ?? emptySelected}
                onOpen={goChat}
                onToggle={toggleSelect}
                onEnter={enterSelect}
              />
            ) : searching ? (
                <ChatGroup
                  title={text.searchResults}
                  items={history.items}
                  colors={colors}
                  locale={locale}
                  text={text}
                  hits={hitsById}
                  selecting={selecting}
                  selected={selected ?? emptySelected}
                  onOpen={goChat}
                  onToggle={toggleSelect}
                  onEnter={enterSelect}
                />
              ) : (
                <>
                  <ChatGroup title={text.pinned} items={groups.pinned} colors={colors} locale={locale} text={text} hits={hitsById} selecting={selecting} selected={selected ?? emptySelected} onOpen={goChat} onToggle={toggleSelect} onEnter={enterSelect} />
                  <ChatGroup title={text.today} items={groups.today} colors={colors} locale={locale} text={text} hits={hitsById} selecting={selecting} selected={selected ?? emptySelected} onOpen={goChat} onToggle={toggleSelect} onEnter={enterSelect} />
                  <ChatGroup title={text.yesterday} items={groups.yesterday} colors={colors} locale={locale} text={text} hits={hitsById} selecting={selecting} selected={selected ?? emptySelected} onOpen={goChat} onToggle={toggleSelect} onEnter={enterSelect} />
                  <ChatGroup title={text.earlier} items={groups.earlier} colors={colors} locale={locale} text={text} hits={hitsById} selecting={selecting} selected={selected ?? emptySelected} onOpen={goChat} onToggle={toggleSelect} onEnter={enterSelect} />
                  <ChatGroup title={text.archive} items={groups.archived} colors={colors} locale={locale} text={text} hits={hitsById} selecting={selecting} selected={selected ?? emptySelected} onOpen={goChat} onToggle={toggleSelect} onEnter={enterSelect} />
                </>
            )}
          </ScrollView>
          {selecting ? (
            <View style={{ borderTopWidth: 1, borderTopColor: colors.line, paddingHorizontal: 8, paddingVertical: 6, flexDirection: "row", flexWrap: "wrap", justifyContent: "space-around" }}>
              {trashOpen ? (
                <BulkAction
                  label={text.restoreDeleted}
                  icon="arrow-undo-outline"
                  colors={colors}
                  disabled={picked.length === 0}
                  onPress={() =>
                    void history.setStatusMany(
                      picked.map((item) => item.id),
                      ConversationStatus.ACTIVE,
                    ).then(() => setSelected(null))
                  }
                />
              ) : (
                <>
              <BulkAction
                label={allPinned ? text.unpin : text.pin}
                icon={allPinned ? "bookmark" : "bookmark-outline"}
                colors={colors}
                disabled={picked.length === 0}
                onPress={() => void history.pinMany(picked.map((item) => item.id), !allPinned)}
              />
              <BulkAction
                label={allArchived ? text.restore : text.archive}
                icon="archive-outline"
                colors={colors}
                disabled={picked.length === 0}
                onPress={() =>
                  void history.setStatusMany(
                    picked.map((item) => item.id),
                    allArchived ? ConversationStatus.ACTIVE : ConversationStatus.ARCHIVED,
                  )
                }
              />
              {picked.length === 1 ? (
                <BulkAction
                  label={text.rename}
                  icon="create-outline"
                  colors={colors}
                  onPress={() => {
                    const item = picked[0];
                    setRenaming(item);
                    setRenameTitle(item.title ?? "");
                  }}
                />
              ) : null}
              {picked.length === 1 ? (
                <BulkAction label={text.exportChat} icon="share-outline" colors={colors} onPress={() => void exportPicked()} />
              ) : null}
              <BulkAction
                label={text.remove}
                icon="trash-outline"
                colors={colors}
                danger
                disabled={picked.length === 0}
                onPress={confirmRemovePicked}
              />
                </>
              )}
            </View>
          ) : trashOpen ? null : (
            <View style={{ borderTopWidth: 1, borderTopColor: colors.line, paddingHorizontal: 8, paddingVertical: 8 }}>
              {signedIn ? (
                <Pressable
                  onPress={() => {
                    setSelected(null);
                    setTrashOpen(true);
                  }}
                  style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12 }}
                >
                  <Icon name="trash-outline" color={colors.accent} size={20} />
                  <Text style={{ flex: 1, color: colors.ink, fontSize: 16 }}>{text.recentlyDeleted}</Text>
                  {trashCount > 0 ? <Text style={{ color: colors.muted, fontSize: 13 }}>{trashCount}</Text> : null}
                </Pressable>
              ) : null}
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
          )}
        </View>
        <Pressable accessibilityLabel={text.back} onPress={onClose} style={{ flex: 1, backgroundColor: "#00000066" }} />
      </View>
      {confirmingRemove ? (
        <View style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: "#00000066", justifyContent: "center", padding: 24 }}>
          <Pressable onPress={() => setConfirmingRemove(false)} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} />
          <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.line }}>
            <Text style={{ color: colors.ink, fontSize: 16, marginBottom: 16 }}>
              {fillCount(picked.length === 1 ? text.confirmRemove : text.confirmRemoveMany, picked.length)}
            </Text>
            <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 12 }}>
              <Pressable onPress={() => setConfirmingRemove(false)} style={{ paddingHorizontal: 12, paddingVertical: 10 }}>
                <Text style={{ color: colors.muted }}>{text.cancel}</Text>
              </Pressable>
              <Pressable onPress={removePicked} style={{ backgroundColor: colors.danger, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 }}>
                <Text style={{ color: colors.onAccent }}>{text.remove}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}
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
  hits,
  selecting,
  selected,
  onOpen,
  onToggle,
  onEnter,
}: {
  title: string;
  items: ConversationView[];
  colors: Palette;
  locale: "zh-HK" | "en";
  text: Copy;
  hits: Map<string, HistoryHit>;
  selecting: boolean;
  selected: Set<string>;
  onOpen: (params: Parameters<typeof openChat>[1]) => void;
  onToggle: (id: string) => void;
  onEnter: (id: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <View style={{ marginBottom: 8 }}>
      {title ? (
        <Text style={{ color: colors.muted, fontSize: 12, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 4 }}>{title}</Text>
      ) : null}
      {items.map((item) => {
        const hit = hits.get(item.id);
        const thumb = item.mode === "image" ? mediaUrl(item.lastImageUrl) : null;
        const preview = hit?.snippet ?? item.preview ?? modeLabel(item.mode, text);
        const on = selected.has(item.id);
        return (
          <Pressable
            key={item.id}
            onPress={() => {
              if (selecting) onToggle(item.id);
              else
                onOpen({
                  conversationId: item.id,
                  mode: item.mode,
                  ...(hit?.messageId ? { focusMessageId: hit.messageId } : {}),
                });
            }}
            onLongPress={() => (selecting ? onToggle(item.id) : onEnter(item.id))}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderRadius: 12,
              backgroundColor: on ? colors.card : "transparent",
            }}
          >
            {selecting ? (
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  borderWidth: 1,
                  borderColor: on ? colors.accent : colors.line,
                  backgroundColor: on ? colors.accent : "transparent",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {on ? <Icon name="checkmark" color={colors.onAccent} size={14} /> : null}
              </View>
            ) : null}
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
              {thumb ? (
                <Image source={{ uri: thumb }} style={{ width: 36, height: 36 }} />
              ) : (
                <Icon name={modeIcon(item.mode)} color={colors.accent} size={16} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
                <Text style={{ flex: 1, color: colors.ink, fontSize: 16 }} numberOfLines={1}>
                  {item.title || text.newChat}
                </Text>
                <Text style={{ color: colors.muted, fontSize: 12 }}>
                  {formatWhen(item.status === ConversationStatus.DELETED ? item.updatedAt || item.lastMessageAt : item.lastMessageAt, locale)}
                </Text>
              </View>
              <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                {preview}
              </Text>
            </View>
            {item.pinnedAt && !selecting ? <Icon name="bookmark" color={colors.accent} size={16} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

function BulkAction({
  label,
  icon,
  colors,
  onPress,
  disabled,
  danger,
}: {
  label: string;
  icon: IconName;
  colors: Palette;
  onPress: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  const tint = disabled ? colors.muted : danger ? colors.danger : colors.ink;
  return (
    <Pressable onPress={onPress} disabled={disabled} style={{ alignItems: "center", minWidth: 64, paddingVertical: 8, opacity: disabled ? 0.4 : 1 }}>
      <Icon name={icon} color={tint} size={20} />
      <Text style={{ color: tint, fontSize: 12, marginTop: 4 }}>{label}</Text>
    </Pressable>
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

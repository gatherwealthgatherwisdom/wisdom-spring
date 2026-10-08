import { ApiError } from "@spring/api-client";
import * as Clipboard from "expo-clipboard";
import { ConversationStatus, ErrorCode, FeatureFlagKey, LIMITS, SUGGESTED_PROMPTS_ZH, generationKind, isImageMime, isPdfMime, type AssetView } from "@spring/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { Image, Pressable, Text, TextInput, View } from "react-native";
import { KeyboardDock } from "../../shared/ui/KeyboardDock";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { createClientMessageId, mediaUrl, spring } from "../../shared/lib/api";
import { hitFromMessage, isOfflineError, refreshAfterSend, useHistoryStore, useThread } from "../../shared/lib/history";
import { copy } from "../../shared/lib/i18n";
import { pickPdf, pickPhoto, type AttachKind } from "../../shared/lib/pick-image";
import { usePrefs } from "../../shared/lib/prefs";
import { notifyGenerationDoneLocal } from "../../shared/lib/push";
import { useStream } from "../../shared/lib/stream";
import { speak } from "../../shared/lib/voice";
import { useColors } from "../../shared/theme";
import { Icon } from "../../shared/ui/Icon";
import { Screen } from "../../shared/ui/Screen";
import { ScreenHeader } from "../../shared/ui/ScreenHeader";
import type { AppStackParamList } from "../../navigation/RootNavigation";
import { Composer } from "./Composer";
import { actionFromRoute, placeholderFor, turnModeFor, type ComposerAction } from "./composer-action";
import { MessageList } from "./MessageList";
import { QuotaBanner } from "./QuotaBanner";

type Props = NativeStackScreenProps<AppStackParamList, "Chat">;

export function ChatScreen({ navigation, route }: Props) {
  const colors = useColors();
  const locale = usePrefs((state) => state.locale);
  const text = copy[locale];
  const queryClient = useQueryClient();
  const conversationId = route.params?.conversationId;
  const focusMessageId = route.params?.focusMessageId;
  const mode = route.params?.mode ?? "chat";
  const seeded = useRef(false);
  const attached = useRef(false);
  const token = usePrefs((state) => state.accessToken);
  const askedToSignIn = useRef(false);
  const account = usePrefs((state) => state.user);
  const [draft, setDraft] = useState("");
  const [action, setAction] = useState<ComposerAction>(() => actionFromRoute(route.params));
  const [pending, setPending] = useState<AssetView[]>([]);
  const [banner, setBanner] = useState<string | null>(null);
  const [guestBlocked, setGuestBlocked] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const trimmedSearch = searchQ.trim();
  const trialLeft = account?.registered === false ? Math.max(0, account.guestLimit - account.guestUses) : null;
  const stream = useStream();
  const thread = useThread(conversationId);
  const deleted = thread.conversation?.status === ConversationStatus.DELETED;
  const found = useQuery({
    queryKey: ["messages", conversationId, trimmedSearch],
    queryFn: () => spring.messages(conversationId ?? "", { q: trimmedSearch }),
    enabled: Boolean(conversationId && searchOpen && trimmedSearch && thread.online),
  });
  const caps = useQuery({
    queryKey: ["capabilities"],
    queryFn: () => spring.capabilities(),
    enabled: Boolean(token),
  });
  const flags = useQuery({ queryKey: ["flags"], queryFn: () => spring.flags() });
  const copyQuery = useQuery({ queryKey: ["copy"], queryFn: () => spring.copy() });
  const suggestions = copyQuery.data?.emptyHero ?? [...SUGGESTED_PROMPTS_ZH];
  const flagOn = (key: FeatureFlagKey, fallback = true) =>
    flags.data?.items.find((item) => item.key === key)?.enabled ?? fallback;
  const chatTitle = thread.conversation?.title || text.app;

  const searching = searchOpen && trimmedSearch.length > 0;
  const streamHere =
    stream.conversationId === conversationId || (!conversationId && stream.status === "streaming");
  const messages = useMemo(
    () =>
      thread.messages.filter((item) => {
        if (item.status === "SUPERSEDED") return false;
        // Live draft already paints this turn; the replica STREAMING row is the same reply.
        if (item.status === "STREAMING" && streamHere) return false;
        return true;
      }),
    [thread.messages, streamHere],
  );
  const localMatchIds = useMemo(
    () => (trimmedSearch ? messages.flatMap((item) => (hitFromMessage(item, trimmedSearch) ? [item.id] : [])) : []),
    [messages, trimmedSearch],
  );
  const remoteMatchIds = found.data?.items.map((item) => item.id) ?? [];
  const matchIds = useMemo(() => {
    if (!searching) return [];
    const ids = new Set(localMatchIds);
    if (thread.online && found.isFetched) for (const id of remoteMatchIds) ids.add(id);
    return messages.filter((item) => ids.has(item.id)).map((item) => item.id);
  }, [searching, localMatchIds, remoteMatchIds, thread.online, found.isFetched, messages]);
  const highlightedId = searching ? matchIds[matchIds.length - 1] : focusMessageId;
  const persistedTurn = Boolean(stream.messageId && messages.some((item) => item.id === stream.messageId));
  const showDraft =
    searching || !streamHere || persistedTurn
      ? null
      : stream.status === "streaming" || stream.text.length > 0 || stream.thinking.length > 0
        ? { content: stream.text, thinking: stream.thinking, generationKind: stream.generationKind }
        : null;

  async function refreshAccount() {
    const me = await spring.me();
    usePrefs.getState().setUser(me.user);
    queryClient.setQueryData(["me"], me);
  }

  function noteGuest(code: string | undefined) {
    setGuestBlocked(code === ErrorCode.QUOTA_GUEST);
    void refreshAccount().catch(() => undefined);
  }

  async function attach(kind: AttachKind | "file") {
    if (!usePrefs.getState().accessToken) {
      navigation.navigate("Auth");
      return;
    }
    if (pending.length >= LIMITS.attachmentsMax) return;
    if (kind === "file") {
      try {
        const picked = await pickPdf();
        if (!picked) return;
        const uploaded = await spring.upload({ mime: picked.mime, data: picked.data });
        setAction("file");
        setPending((current) => [...current, uploaded].slice(0, LIMITS.attachmentsMax));
      } catch (error) {
        const message = error instanceof ApiError ? error.message : error instanceof Error ? error.message : text.attachLater;
        setBanner(message);
      }
      return;
    }
    const vision = caps.data?.vision ?? (await spring.capabilities().then((row) => row.vision).catch(() => false));
    if (!vision) {
      setBanner(text.noVisionModel);
      return;
    }
    try {
      const picked = await pickPhoto(kind);
      if (!picked) return;
      const uploaded = await spring.upload(picked);
      setAction("look");
      setPending((current) => [...current, uploaded].slice(0, LIMITS.attachmentsMax));
    } catch (error) {
      const message = error instanceof ApiError ? error.message : text.noVisionModel;
      setBanner(message);
    }
  }

  function selectAction(next: ComposerAction) {
    setAction(next);
    setBanner(null);
    if (next === "ask" || next === "draw") {
      setPending([]);
      return;
    }
    if (next === "look") {
      setPending((current) => current.filter((item) => isImageMime(item.mime)));
      return;
    }
    setPending((current) => current.filter((item) => isPdfMime(item.mime)));
  }

  async function send(content: string) {
    const trimmed = content.trim();
    if (deleted || (!trimmed && pending.length === 0) || stream.status === "streaming") return;
    if (!usePrefs.getState().accessToken) {
      navigation.navigate("Auth");
      return;
    }
    if (action === "look" && !pending.some((item) => isImageMime(item.mime))) {
      setBanner(text.needPhoto);
      return;
    }
    if (action === "file" && !pending.some((item) => isPdfMime(item.mime))) {
      setBanner(text.needFile);
      return;
    }
    if (action === "draw" && caps.data?.image === false) {
      setBanner(text.noImageModel);
      return;
    }
    setBanner(null);
    setGuestBlocked(false);
    const controller = new AbortController();
    stream.begin(controller);
    const attachments = action === "draw" ? [] : pending.map((item) => ({ assetId: item.id }));
    const thisMode = turnModeFor(action, mode);
    try {
      const params = route.params;
      await spring.sendMessage(
        {
          content: trimmed,
          attachments,
          clientMessageId: createClientMessageId(),
          mode: thisMode,
          ...(thisMode === "image"
            ? { imageStyle: params?.imageStyle ?? thread.conversation?.imageStyle ?? "ink" }
            : {}),
          ...(conversationId
            ? { conversationId }
            : {
                ...(params?.templateId && thisMode !== "image" ? { templateId: params.templateId } : {}),
                ...(params?.sourceLang ? { sourceLang: params.sourceLang } : {}),
                ...(params?.targetLang ? { targetLang: params.targetLang } : {}),
              }),
        },
        {
          onMeta: (event) => {
            setDraft("");
            setPending([]);
            stream.meta(event.conversationId, event.messageId, event.requestedModel, event.generationKind);
            if (!conversationId) navigation.setParams({ conversationId: event.conversationId });
          },
          onThinking: (event) => stream.appendThinking(event.text),
          onDelta: (event) => stream.delta(event.text),
          onDone: (event) => {
            stream.done(event.servedModel, event.fallbackUsed);
            const id = conversationId ?? useStream.getState().conversationId;
            if (id) void notifyGenerationDoneLocal(id);
            void refreshAfterSend().then(() => {
              if (id) void useHistoryStore.getState().loadThread(id);
            });
            void refreshAccount().catch(() => undefined);
          },
          onError: (event) => {
            stream.fail(event.message);
            setBanner(event.message);
            noteGuest(event.code);
          },
        },
        controller.signal,
      );
    } catch (error) {
      if (controller.signal.aborted) return;
      if (isOfflineError(error)) {
        useHistoryStore.getState().markOffline();
        stream.fail(text.offlineSend);
        setBanner(text.offlineSend);
        return;
      }
      const message = error instanceof ApiError ? error.message : text.placeholder;
      stream.fail(message);
      setBanner(message);
      noteGuest(error instanceof ApiError ? error.code : undefined);
    }
  }

  async function regenerate(messageId: string) {
    if (deleted || stream.status === "streaming") return;
    if (!usePrefs.getState().accessToken) {
      navigation.navigate("Auth");
      return;
    }
    const controller = new AbortController();
    stream.begin(controller);
    if (conversationId) {
      stream.meta(conversationId, messageId, "", generationKind({ mode }));
    }
    try {
      await spring.regenerate(
        messageId,
        {
          onMeta: (event) => stream.meta(event.conversationId, event.messageId, event.requestedModel, event.generationKind),
          onThinking: (event) => stream.appendThinking(event.text),
          onDelta: (event) => stream.delta(event.text),
          onDone: (event) => {
            stream.done(event.servedModel, event.fallbackUsed);
            const id = conversationId ?? useStream.getState().conversationId;
            if (id) void notifyGenerationDoneLocal(id);
            void refreshAfterSend().then(() => {
              if (id) void useHistoryStore.getState().loadThread(id);
            });
            void refreshAccount().catch(() => undefined);
          },
          onError: (event) => {
            stream.fail(event.message);
            setBanner(event.message);
            noteGuest(event.code);
          },
        },
        controller.signal,
      );
    } catch (error) {
      if (controller.signal.aborted) return;
      if (isOfflineError(error)) {
        useHistoryStore.getState().markOffline();
        stream.fail(text.offlineSend);
        setBanner(text.offlineSend);
        return;
      }
      const message = error instanceof ApiError ? error.message : "智泉暫時回應唔到，請稍後再試。";
      stream.fail(message);
      setBanner(message);
      noteGuest(error instanceof ApiError ? error.code : undefined);
    }
  }

  useEffect(() => {
    const seed = route.params?.seed;
    if (!seed || seeded.current || conversationId) return;
    if (!token) {
      if (!askedToSignIn.current) {
        askedToSignIn.current = true;
        navigation.navigate("Auth");
      }
      return;
    }
    seeded.current = true;
    void send(seed);
  }, [conversationId, route.params?.seed, token, navigation]);

  useEffect(() => {
    if (!focusMessageId || searching) return;
    const timer = setTimeout(() => {
      navigation.setParams({ focusMessageId: undefined });
    }, 2500);
    return () => clearTimeout(timer);
  }, [focusMessageId, searching, navigation]);

  useEffect(() => {
    const kind = route.params?.attach;
    if (!kind || attached.current) return;
    if (!token) {
      if (!askedToSignIn.current) {
        askedToSignIn.current = true;
        navigation.navigate("Auth");
      }
      return;
    }
    attached.current = true;
    navigation.setParams({ attach: undefined });
    void attach(kind);
  }, [route.params?.attach, token, navigation]);

  function stop() {
    const messageId = stream.messageId;
    stream.controller?.abort();
    if (messageId) void spring.abort(messageId).catch(() => undefined);
    stream.fail(locale === "en" ? "Generation stopped." : "已停止生成。");
  }

  async function exportChat() {
    if (!conversationId) return;
    try {
      const markdown = await useHistoryStore.getState().exportThread(conversationId);
      await Clipboard.setStringAsync(markdown);
      setBanner(text.copiedChat);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : text.placeholder;
      setBanner(message);
    }
  }

  async function rate(messageId: string, rating: "up" | "down") {
    try {
      await spring.feedback(messageId, { rating });
      if (conversationId) void useHistoryStore.getState().loadThread(conversationId);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : text.placeholder;
      setBanner(message);
    }
  }

  return (
    <Screen>
      <View style={{ flex: 1, paddingHorizontal: 16 }}>
        <ScreenHeader
          title={chatTitle}
          onBack={() => navigation.goBack()}
          accessibilityBack={text.inbox}
          trailing={
            <View style={{ flexDirection: "row" }}>
              <Pressable
                accessibilityLabel={text.searchInChat}
                onPress={() => {
                  setSearchOpen((open) => {
                    if (open) setSearchQ("");
                    return !open;
                  });
                }}
                style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}
              >
                <Icon name={searchOpen ? "close-outline" : "search-outline"} color={colors.ink} />
              </Pressable>
              <Pressable
                accessibilityLabel={text.exportChat}
                onPress={() => void exportChat()}
                style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}
              >
                <Icon name="share-outline" color={colors.ink} />
              </Pressable>
              <Pressable
                accessibilityLabel={text.newChat}
                onPress={() => {
                  stream.reset();
                  setDraft("");
                  setAction("ask");
                  setPending([]);
                  setBanner(null);
                  setGuestBlocked(false);
                  setSearchOpen(false);
                  setSearchQ("");
                  navigation.replace("Chat", { mode: "chat" });
                }}
                style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}
              >
                <Icon name="create-outline" color={colors.ink} />
              </Pressable>
            </View>
          }
        />
        {searchOpen ? (
          <View style={{ marginBottom: 8, flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderColor: colors.accent, backgroundColor: colors.card, borderRadius: 12, paddingHorizontal: 12 }}>
            <Icon name="search-outline" color={colors.muted} size={18} />
            <TextInput
              value={searchQ}
              onChangeText={setSearchQ}
              placeholder={text.searchInChat}
              placeholderTextColor={colors.muted}
              autoFocus
              autoCorrect={false}
              style={{ flex: 1, paddingVertical: 10, color: colors.ink }}
            />
          </View>
        ) : null}
        {searching && matchIds.length === 0 && !(thread.online && found.isFetching) ? (
          <Text style={{ color: colors.muted, fontSize: 12, textAlign: "center", marginBottom: 8 }}>{text.emptySearch}</Text>
        ) : null}
        {trialLeft !== null ? <Text style={{ color: colors.muted, fontSize: 13, marginBottom: 8, textAlign: "center" }}>{text.trialLeft(trialLeft)}</Text> : null}
        {!thread.online && conversationId ? (
          <Text style={{ color: colors.muted, fontSize: 12, textAlign: "center", marginBottom: 8 }}>{text.offlineHistory}</Text>
        ) : null}
        <QuotaBanner
          message={banner}
          action={guestBlocked ? text.completeRegistration : null}
          onAction={() => navigation.navigate("Register")}
        />
        <View style={{ flex: 1 }}>
          <MessageList
            messages={messages}
            draft={showDraft}
            text={text}
            mode={mode}
            regenerateLabel={text.regenerate}
            listenLabel={text.listen}
            highlightedId={highlightedId}
            onCard={(card) => {
              if (card === "email") navigation.navigate("Chat", { mode: "write", templateId: "email" });
              if (card === "translate") navigation.replace("Chat", { mode: "translate" });
              if (card === "image") navigation.navigate("Main", { screen: "Image" });
              if (card === "resume") navigation.goBack();
            }}
            suggestions={suggestions}
            onSuggest={setDraft}
            onRegenerate={deleted ? undefined : (id) => void regenerate(id)}
            onListen={(content) => speak(content, locale)}
            onFeedback={(id, rating) => void rate(id, rating)}
          />
        </View>
        {deleted ? (
          <View style={{ borderTopWidth: 1, borderTopColor: colors.line, paddingHorizontal: 16, paddingVertical: 12, gap: 10 }}>
            <Text style={{ color: colors.muted, fontSize: 13, textAlign: "center" }}>{text.deletedBanner}</Text>
            {conversationId ? (
              <Pressable
                onPress={() => void useHistoryStore.getState().setStatus(conversationId, ConversationStatus.ACTIVE)}
                style={{ backgroundColor: colors.accent, borderRadius: 14, paddingVertical: 12, alignItems: "center" }}
              >
                <Text style={{ color: colors.onAccent, fontSize: 16 }}>{text.restoreDeleted}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
        <KeyboardDock>
          {pending.length > 0 ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 6, paddingTop: 8 }}>
              {pending.map((item) => {
                const uri = mediaUrl(item.url);
                const pdf = isPdfMime(item.mime);
                return (
                  <View key={item.id} style={{ width: pdf ? undefined : 64, height: 64, minWidth: pdf ? 96 : 64 }}>
                    {pdf ? (
                      <View style={{ height: 64, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Icon name="document-text-outline" color={colors.ink} size={18} />
                        <Text style={{ color: colors.ink, fontSize: 12 }} numberOfLines={1}>
                          {text.pdfFile}
                        </Text>
                      </View>
                    ) : uri ? (
                      <Image source={{ uri }} style={{ width: 64, height: 64, borderRadius: 10 }} />
                    ) : null}
                    <Pressable
                      onPress={() => setPending((current) => current.filter((row) => row.id !== item.id))}
                      style={{ position: "absolute", top: -6, right: -6, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center" }}
                    >
                      <Icon name="close" color={colors.bg} size={12} />
                    </Pressable>
                  </View>
                );
              })}
            </View>
          ) : null}
          <Composer
            value={draft}
            placeholder={placeholderFor(text, action)}
            action={action}
            streaming={stream.status === "streaming"}
            stopLabel={text.stop}
            onChange={setDraft}
            onSend={() => void send(draft)}
            onStop={stop}
            onAction={selectAction}
            onAttach={(kind) => {
              setGuestBlocked(false);
              void attach(kind);
            }}
            allowPdf={flagOn(FeatureFlagKey.PDF_UPLOAD)}
          />
        </KeyboardDock>
        )}
      </View>
    </Screen>
  );
}

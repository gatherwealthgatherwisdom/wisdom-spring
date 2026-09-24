import { ApiError } from "@spring/api-client";
import { ErrorCode, type MessageView } from "@spring/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { createClientMessageId, spring } from "../../shared/lib/api";
import { copy } from "../../shared/lib/i18n";
import { usePrefs } from "../../shared/lib/prefs";
import { useStream } from "../../shared/lib/stream";
import { speak, startDictation } from "../../shared/lib/voice";
import { useColors } from "../../shared/theme";
import type { AppStackParamList } from "../../navigation/RootNavigation";
import { Composer } from "./Composer";
import { MessageList } from "./MessageList";
import { QuotaBanner } from "./QuotaBanner";

type Props = NativeStackScreenProps<AppStackParamList, "Chat">;

export function ChatScreen({ navigation, route }: Props) {
  const colors = useColors();
  const locale = usePrefs((state) => state.locale);
  const text = copy[locale];
  const queryClient = useQueryClient();
  const conversationId = route.params?.conversationId;
  const mode = route.params?.mode ?? "chat";
  const seeded = useRef(false);
  const account = usePrefs((state) => state.user);
  const [draft, setDraft] = useState("");
  const [banner, setBanner] = useState<string | null>(null);
  const [guestBlocked, setGuestBlocked] = useState(false);
  const trialLeft = account?.registered === false ? Math.max(0, account.guestLimit - account.guestUses) : null;
  const stream = useStream();
  const history = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: () => spring.messages(conversationId ?? ""),
    enabled: Boolean(conversationId),
  });

  const messages: MessageView[] = (history.data?.items ?? []).filter((item) => item.status !== "SUPERSEDED");
  const streamingHere = stream.status === "streaming" && stream.conversationId === (conversationId ?? stream.conversationId);
  const showDraft = stream.status !== "idle" && stream.conversationId === conversationId && stream.text.length > 0
    ? { content: stream.text, requestedModel: stream.requestedModel, servedModel: stream.servedModel, fallbackUsed: stream.fallbackUsed }
    : stream.status === "streaming" && !conversationId
      ? { content: stream.text, requestedModel: stream.requestedModel, servedModel: stream.servedModel, fallbackUsed: stream.fallbackUsed }
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

  async function send(content: string) {
    const trimmed = content.trim();
    if (!trimmed || stream.status === "streaming") return;
    setBanner(null);
    setGuestBlocked(false);
    const controller = new AbortController();
    stream.begin(controller);
    try {
      const params = route.params;
      await spring.sendMessage(
        {
          content: trimmed,
          attachments: [],
          clientMessageId: createClientMessageId(),
          ...(conversationId
            ? { conversationId }
            : {
                ...(params?.mode ? { mode: params.mode } : {}),
                ...(params?.templateId ? { templateId: params.templateId } : {}),
                ...(params?.sourceLang ? { sourceLang: params.sourceLang } : {}),
                ...(params?.targetLang ? { targetLang: params.targetLang } : {}),
                ...(params?.imageStyle ? { imageStyle: params.imageStyle } : {}),
              }),
        },
        {
          onMeta: (event) => {
            setDraft("");
            stream.meta(event.conversationId, event.messageId, event.requestedModel);
            if (!conversationId) navigation.setParams({ conversationId: event.conversationId });
          },
          onDelta: (event) => stream.delta(event.text),
          onDone: (event) => {
            stream.done(event.servedModel, event.fallbackUsed);
            void queryClient.invalidateQueries({ queryKey: ["messages"] });
            void queryClient.invalidateQueries({ queryKey: ["conversations"] });
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
      const message = error instanceof ApiError ? error.message : text.placeholder;
      stream.fail(message);
      setBanner(message);
      noteGuest(error instanceof ApiError ? error.code : undefined);
    }
  }

  async function regenerate(messageId: string) {
    if (stream.status === "streaming") return;
    const controller = new AbortController();
    stream.begin(controller);
    if (conversationId) stream.meta(conversationId, messageId, "");
    try {
      await spring.regenerate(
        messageId,
        {
          onMeta: (event) => stream.meta(event.conversationId, event.messageId, event.requestedModel),
          onDelta: (event) => stream.delta(event.text),
          onDone: (event) => {
            stream.done(event.servedModel, event.fallbackUsed);
            void queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
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
      const message = error instanceof ApiError ? error.message : "智泉暫時回應唔到，請稍後再試。";
      stream.fail(message);
      setBanner(message);
      noteGuest(error instanceof ApiError ? error.code : undefined);
    }
  }

  useEffect(() => {
    const seed = route.params?.seed;
    if (!seed || seeded.current || conversationId) return;
    seeded.current = true;
    void send(seed);
  }, [conversationId, route.params?.seed]);

  function stop() {
    const messageId = stream.messageId;
    stream.controller?.abort();
    if (messageId) void spring.abort(messageId).catch(() => undefined);
    stream.fail(locale === "en" ? "Generation stopped." : "已停止生成。");
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1, padding: 16 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
          <Pressable onPress={() => navigation.goBack()}><Text style={{ color: colors.ink }}>{text.inbox}</Text></Pressable>
          <Text style={{ color: colors.ink, fontSize: 18 }}>{text.app}</Text>
          <View style={{ width: 48 }} />
        </View>
        {trialLeft !== null ? <Text style={{ color: colors.muted, marginBottom: 8 }}>{text.trialLeft(trialLeft)}</Text> : null}
        <QuotaBanner
          message={banner}
          action={guestBlocked ? text.completeRegistration : null}
          onAction={() => navigation.navigate("Register")}
        />
        <View style={{ flex: 1 }}>
          <MessageList
            messages={messages}
            draft={streamingHere || showDraft ? showDraft : null}
            text={text}
            mode={mode}
            regenerateLabel={text.regenerate}
            listenLabel={text.listen}
            onCard={(card) => {
              if (card === "email") navigation.navigate("Chat", { mode: "write", templateId: "email" });
              if (card === "translate") navigation.navigate("Main", { screen: "Translate" });
              if (card === "image") navigation.navigate("Main", { screen: "Image" });
              if (card === "resume") navigation.goBack();
            }}
            onRegenerate={(id) => void regenerate(id)}
            onListen={(content) => speak(content, locale)}
          />
        </View>
        <Composer
          value={draft}
          placeholder={text.placeholder}
          streaming={stream.status === "streaming"}
          stopLabel={text.stop}
          onChange={setDraft}
          onSend={() => void send(draft)}
          onStop={stop}
          onAttach={() => {
            setGuestBlocked(false);
            setBanner(text.attachLater);
          }}
          onMic={() => {
            const heard = startDictation(locale, (value) => setDraft((current) => `${current}${value}`));
            if (!heard) setBanner(text.voiceMissing);
          }}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

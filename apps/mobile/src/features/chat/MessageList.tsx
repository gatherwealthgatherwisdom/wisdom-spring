import type { MessageView } from "@spring/shared";
import { useEffect, useRef } from "react";
import { FlatList, type NativeScrollEvent, type NativeSyntheticEvent, Text, View } from "react-native";
import type { Copy } from "../../shared/lib/i18n";
import { usePrefs } from "../../shared/lib/prefs";
import { formatWhen } from "../../shared/lib/time";
import { useColors } from "../../shared/theme";
import { AssistantBubble, ThinkingBlock } from "./AssistantBubble";
import { EmptyHero } from "./EmptyHero";
import { MarkdownBody } from "./MarkdownBody";
import { StreamingCursor } from "./StreamingCursor";
import { UserBubble } from "./UserBubble";

export function MessageList({
  messages,
  draft,
  text,
  mode,
  regenerateLabel,
  listenLabel,
  emptyLabel,
  highlightedId,
  onCard,
  suggestions,
  onSuggest,
  onRegenerate,
  onListen,
  onFeedback,
}: {
  messages: MessageView[];
  draft: { content: string; thinking?: string | null; generationKind: string | null } | null;
  text: Copy;
  mode: "chat" | "write" | "translate" | "image";
  regenerateLabel: string;
  listenLabel: string;
  emptyLabel?: string;
  highlightedId?: string;
  onCard: (card: "email" | "translate" | "image" | "resume") => void;
  suggestions?: string[];
  onSuggest?: (sentence: string) => void;
  onRegenerate?: (messageId: string) => void;
  onListen: (content: string) => void;
  onFeedback?: (messageId: string, rating: "up" | "down") => void;
}) {
  const locale = usePrefs((state) => state.locale);
  const colors = useColors();
  const listRef = useRef<FlatList<MessageView>>(null);
  const stickToEnd = useRef(true);
  const data = draft
    ? [...messages, { ...draft, id: "draft", role: "ASSISTANT" as const, status: "STREAMING" as const } as MessageView]
    : messages;
  const streamLen = draft ? draft.content.length + (draft.thinking?.length ?? 0) : 0;

  useEffect(() => {
    if (!highlightedId || messages.length === 0) return;
    stickToEnd.current = false;
    const index = messages.findIndex((item) => item.id === highlightedId);
    if (index < 0) return;
    const timer = setTimeout(() => {
      listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.35 });
    }, 50);
    return () => clearTimeout(timer);
  }, [highlightedId, messages]);

  useEffect(() => {
    if (highlightedId) return;
    stickToEnd.current = true;
  }, [data.length, highlightedId]);

  function followEnd() {
    if (highlightedId || !stickToEnd.current) return;
    listRef.current?.scrollToEnd({ animated: false });
  }

  function onScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    stickToEnd.current = contentOffset.y + layoutMeasurement.height >= contentSize.height - 72;
  }

  if (data.length === 0) {
    if (emptyLabel) return <Text style={{ color: colors.muted, paddingVertical: 24, textAlign: "center" }}>{emptyLabel}</Text>;
    return (
      <View style={{ flex: 1 }}>
        <EmptyHero text={text} onCard={onCard} suggestions={suggestions} onSuggest={onSuggest} />
      </View>
    );
  }
  return (
    <FlatList
      ref={listRef}
      data={data}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ paddingBottom: 20 }}
      onScroll={onScroll}
      scrollEventThrottle={16}
      onContentSizeChange={() => followEnd()}
      extraData={streamLen}
      onScrollToIndexFailed={({ index, averageItemLength }) => {
        listRef.current?.scrollToOffset({ offset: Math.max(0, averageItemLength * index), animated: false });
        setTimeout(() => {
          listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.35 });
        }, 80);
      }}
      renderItem={({ item, index }) => {
        if (item.role === "USER") {
          if (mode === "translate") return null;
          return (
            <UserBubble
              content={item.content}
              timeLabel={"createdAt" in item ? formatWhen(item.createdAt, locale) : undefined}
              attachments={"attachments" in item ? item.attachments : []}
              highlighted={item.id === highlightedId}
            />
          );
        }
        if (item.role !== "ASSISTANT") return null;
        const streaming = item.id === "draft";
        const previous = data[index - 1];
        const original = previous && "content" in previous ? previous.content : "";
        const imageUrl = "imageUrl" in item ? item.imageUrl : null;
        if (mode === "translate" && !imageUrl) {
          return (
            <TranslatePair
              original={original}
              translation={item.content}
              originalLabel={text.original}
              translatedLabel={text.translated}
              streaming={streaming}
              highlighted={item.id === highlightedId}
              thinking={"thinking" in item ? item.thinking : null}
              thinkingLabel={text.thinking}
              thinkingNowLabel={text.thinkingNow}
            />
          );
        }
        return (
          <AssistantBubble
            content={item.content}
            imageUrl={imageUrl}
            generationKind={("generationKind" in item ? item.generationKind : null) || (streaming && mode === "image" ? "text-to-image" : null)}
            thinking={"thinking" in item ? item.thinking : null}
            thinkingLabel={text.thinking}
            thinkingNowLabel={text.thinkingNow}
            streaming={streaming}
            regenerateLabel={regenerateLabel}
            listenLabel={listenLabel}
            copyLabel={text.copy}
            timeLabel={"createdAt" in item ? formatWhen(item.createdAt, locale) : undefined}
            feedback={"feedback" in item ? item.feedback : null}
            thumbsUpLabel={text.thumbsUp}
            thumbsDownLabel={text.thumbsDown}
            highlighted={item.id === highlightedId}
            onListen={streaming ? undefined : () => onListen(item.content)}
            onRegenerate={streaming || mode === "image" || Boolean(imageUrl) || !onRegenerate ? undefined : () => onRegenerate(item.id)}
            onFeedback={streaming || !onFeedback ? undefined : (rating) => onFeedback(item.id, rating)}
          />
        );
      }}
    />
  );
}

function TranslatePair({
  original,
  translation,
  originalLabel,
  translatedLabel,
  streaming,
  highlighted,
  thinking,
  thinkingLabel,
  thinkingNowLabel,
}: {
  original: string;
  translation: string;
  originalLabel: string;
  translatedLabel: string;
  streaming: boolean;
  highlighted?: boolean;
  thinking?: string | null;
  thinkingLabel: string;
  thinkingNowLabel: string;
}) {
  const colors = useColors();
  return (
    <View style={{ borderWidth: 1, borderColor: highlighted ? colors.accent : colors.line, borderRadius: 14, overflow: "hidden", marginVertical: 8 }}>
      <View style={{ paddingHorizontal: 12, paddingTop: 10 }}>
        <ThinkingBlock
          thinking={thinking}
          streaming={streaming}
          hasAnswer={translation.length > 0}
          label={thinkingLabel}
          nowLabel={thinkingNowLabel}
        />
      </View>
      <View style={{ padding: 12, backgroundColor: colors.card }}>
        <Text style={{ color: colors.muted, marginBottom: 4 }}>{originalLabel}</Text>
        <Text style={{ color: colors.ink, lineHeight: 22 }}>{original}</Text>
      </View>
      <View style={{ height: 1, backgroundColor: colors.line }} />
      <View style={{ padding: 12 }}>
        <Text style={{ color: colors.muted, marginBottom: 4 }}>{translatedLabel}</Text>
        <MarkdownBody source={translation} color={colors.ink} size={16} lineHeight={22} />
        {streaming ? <StreamingCursor /> : null}
      </View>
    </View>
  );
}

import type { MessageView } from "@spring/shared";
import { FlatList, Text, View } from "react-native";
import type { Copy } from "../../shared/lib/i18n";
import { useColors } from "../../shared/theme";
import { AssistantBubble } from "./AssistantBubble";
import { EmptyHero } from "./EmptyHero";
import { UserBubble } from "./UserBubble";

export function MessageList({
  messages,
  draft,
  text,
  mode,
  regenerateLabel,
  listenLabel,
  onCard,
  onRegenerate,
  onListen,
}: {
  messages: MessageView[];
  draft: { content: string; requestedModel: string | null; servedModel: string | null; fallbackUsed: boolean } | null;
  text: Copy;
  mode: "chat" | "write" | "translate" | "image";
  regenerateLabel: string;
  listenLabel: string;
  onCard: (card: "email" | "translate" | "image" | "resume") => void;
  onRegenerate: (messageId: string) => void;
  onListen: (content: string) => void;
}) {
  const data = draft ? [...messages, { ...draft, id: "draft", role: "ASSISTANT" as const, status: "STREAMING" }] : messages;
  if (data.length === 0) return <EmptyHero text={text} onCard={onCard} />;
  return (
    <FlatList
      data={data}
      keyExtractor={(item) => item.id}
      renderItem={({ item, index }) => {
        if (item.role === "USER") {
          if (mode === "translate") return null;
          return <UserBubble content={item.content} />;
        }
        if (item.role !== "ASSISTANT") return null;
        const streaming = item.id === "draft";
        const previous = data[index - 1];
        const original = previous && "content" in previous ? previous.content : "";
        if (mode === "translate") {
          return (
            <TranslatePair
              original={original}
              translation={item.content}
              originalLabel={text.original}
              translatedLabel={text.translated}
              streaming={streaming}
            />
          );
        }
        return (
          <AssistantBubble
            content={item.content}
            requestedModel={"requestedModel" in item ? item.requestedModel : null}
            servedModel={"servedModel" in item ? item.servedModel : null}
            fallbackUsed={"fallbackUsed" in item ? item.fallbackUsed : false}
            streaming={streaming}
            regenerateLabel={regenerateLabel}
            listenLabel={listenLabel}
            copyLabel={text.copy}
            onListen={streaming ? undefined : () => onListen(item.content)}
            onRegenerate={streaming || mode === "image" ? undefined : () => onRegenerate(item.id)}
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
}: {
  original: string;
  translation: string;
  originalLabel: string;
  translatedLabel: string;
  streaming: boolean;
}) {
  const colors = useColors();
  return (
    <View style={{ borderWidth: 1, borderColor: colors.line, borderRadius: 14, overflow: "hidden", marginVertical: 8 }}>
      <View style={{ padding: 12, backgroundColor: colors.card }}>
        <Text style={{ color: colors.muted, marginBottom: 4 }}>{originalLabel}</Text>
        <Text style={{ color: colors.ink, lineHeight: 22 }}>{original}</Text>
      </View>
      <View style={{ height: 1, backgroundColor: colors.line }} />
      <View style={{ padding: 12 }}>
        <Text style={{ color: colors.muted, marginBottom: 4 }}>{translatedLabel}</Text>
        <Text style={{ color: colors.ink, lineHeight: 22 }}>{translation}{streaming ? " ▍" : ""}</Text>
      </View>
    </View>
  );
}

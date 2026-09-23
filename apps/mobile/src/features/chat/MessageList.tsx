import type { MessageView } from "@spring/shared";
import { FlatList } from "react-native";
import { AssistantBubble } from "./AssistantBubble";
import { EmptyHero } from "./EmptyHero";
import { UserBubble } from "./UserBubble";

export function MessageList({
  messages,
  draft,
  locale,
  regenerateLabel,
  onPickPrompt,
  onRegenerate,
}: {
  messages: MessageView[];
  draft: { content: string; requestedModel: string | null; servedModel: string | null; fallbackUsed: boolean } | null;
  locale: "zh-HK" | "en";
  regenerateLabel: string;
  onPickPrompt: (prompt: string) => void;
  onRegenerate: (messageId: string) => void;
}) {
  const data = draft ? [...messages, { ...draft, id: "draft", role: "ASSISTANT" as const, status: "STREAMING" }] : messages;
  if (data.length === 0) return <EmptyHero locale={locale} onPick={onPickPrompt} />;
  return (
    <FlatList
      data={data}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => {
        if (item.role === "USER") return <UserBubble content={item.content} />;
        if (item.role !== "ASSISTANT") return null;
        const streaming = item.id === "draft";
        return (
          <AssistantBubble
            content={item.content}
            requestedModel={"requestedModel" in item ? item.requestedModel : null}
            servedModel={"servedModel" in item ? item.servedModel : null}
            fallbackUsed={"fallbackUsed" in item ? item.fallbackUsed : false}
            streaming={streaming}
            regenerateLabel={regenerateLabel}
            onRegenerate={streaming ? undefined : () => onRegenerate(item.id)}
          />
        );
      }}
    />
  );
}

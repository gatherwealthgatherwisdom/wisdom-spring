import { Image, Pressable, Text, View } from "react-native";
import { useColors } from "../../shared/theme";
import { ModelBadge } from "./ModelBadge";
import { StreamingCursor } from "./StreamingCursor";

function splitImage(content: string): { text: string; uri: string | null } {
  const match = content.match(/!\[[^\]]*\]\(([^)]+)\)/);
  if (!match?.[1]) return { text: content, uri: null };
  return { text: content.replace(match[0], "").trim(), uri: match[1] };
}

export function AssistantBubble({
  content,
  requestedModel,
  servedModel,
  fallbackUsed,
  streaming,
  onRegenerate,
  regenerateLabel,
  listenLabel,
  onListen,
}: {
  content: string;
  requestedModel: string | null;
  servedModel: string | null;
  fallbackUsed: boolean;
  streaming?: boolean;
  onRegenerate?: () => void;
  regenerateLabel: string;
  listenLabel?: string;
  onListen?: () => void;
}) {
  const colors = useColors();
  const image = splitImage(content);
  return (
    <View style={{ marginVertical: 8, maxWidth: "92%" }}>
      <ModelBadge requestedModel={requestedModel} servedModel={servedModel} fallbackUsed={fallbackUsed} />
      {image.uri ? (
        <Image source={{ uri: image.uri }} style={{ width: 260, height: 260, borderRadius: 12, marginBottom: 8, backgroundColor: colors.card }} />
      ) : null}
      {image.text ? (
        <Text style={{ color: colors.ink, fontSize: 16, lineHeight: 26 }}>
          {image.text}
          {streaming ? <StreamingCursor /> : null}
        </Text>
      ) : streaming ? (
        <StreamingCursor />
      ) : null}
      {!streaming ? (
        <View style={{ flexDirection: "row", gap: 16, marginTop: 8 }}>
          {onListen ? (
            <Pressable onPress={onListen}>
              <Text style={{ color: colors.gold, fontSize: 13 }}>{listenLabel}</Text>
            </Pressable>
          ) : null}
          {onRegenerate ? (
            <Pressable onPress={onRegenerate}>
              <Text style={{ color: colors.ink, fontSize: 13 }}>{regenerateLabel}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

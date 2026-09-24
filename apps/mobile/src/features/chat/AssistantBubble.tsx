import * as Clipboard from "expo-clipboard";
import { Image, Pressable, Text, View } from "react-native";
import { useColors } from "../../shared/theme";
import { Icon } from "../../shared/ui/Icon";
import { ModelBadge } from "./ModelBadge";
import { StreamingCursor } from "./StreamingCursor";

function action(colors: { card: string; line: string }) {
  return {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  };
}

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
  copyLabel,
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
  copyLabel?: string;
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
      {!streaming && image.text ? (
        <View style={{ flexDirection: "row", gap: 4, marginTop: 8 }}>
          <Pressable accessibilityLabel={copyLabel} onPress={() => void Clipboard.setStringAsync(image.text)} style={action(colors)}>
            <Icon name="copy-outline" color={colors.muted} size={18} />
          </Pressable>
          {onListen ? (
            <Pressable accessibilityLabel={listenLabel} onPress={onListen} style={action(colors)}>
              <Icon name="volume-medium-outline" color={colors.muted} size={18} />
            </Pressable>
          ) : null}
          {onRegenerate ? (
            <Pressable accessibilityLabel={regenerateLabel} onPress={onRegenerate} style={action(colors)}>
              <Icon name="refresh-outline" color={colors.muted} size={18} />
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

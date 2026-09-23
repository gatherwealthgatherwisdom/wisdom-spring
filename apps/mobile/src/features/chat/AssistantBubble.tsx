import { Pressable, Text, View } from "react-native";
import { useColors } from "../../shared/theme";
import { ModelBadge } from "./ModelBadge";
import { StreamingCursor } from "./StreamingCursor";

export function AssistantBubble({
  content,
  requestedModel,
  servedModel,
  fallbackUsed,
  streaming,
  onRegenerate,
  regenerateLabel,
}: {
  content: string;
  requestedModel: string | null;
  servedModel: string | null;
  fallbackUsed: boolean;
  streaming?: boolean;
  onRegenerate?: () => void;
  regenerateLabel: string;
}) {
  const colors = useColors();
  return (
    <View style={{ marginVertical: 8, maxWidth: "92%" }}>
      <ModelBadge requestedModel={requestedModel} servedModel={servedModel} fallbackUsed={fallbackUsed} />
      <Text style={{ color: colors.ink, fontSize: 16, lineHeight: 26 }}>
        {content}
        {streaming ? <StreamingCursor /> : null}
      </Text>
      {!streaming && onRegenerate ? (
        <Pressable onPress={onRegenerate} style={{ marginTop: 8 }}>
          <Text style={{ color: colors.violet, fontSize: 13 }}>{regenerateLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

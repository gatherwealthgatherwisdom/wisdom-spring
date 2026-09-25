import { Text, View } from "react-native";
import { useColors } from "../../shared/theme";

export function UserBubble({ content, timeLabel }: { content: string; timeLabel?: string }) {
  const colors = useColors();
  return (
    <View style={{ alignItems: "flex-end", marginVertical: 6 }}>
      <View style={{ maxWidth: "86%", backgroundColor: colors.user, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 }}>
        <Text style={{ color: colors.userText, fontSize: 16, lineHeight: 24 }}>{content}</Text>
      </View>
      {timeLabel ? <Text style={{ color: colors.muted, fontSize: 11, marginTop: 4 }}>{timeLabel}</Text> : null}
    </View>
  );
}

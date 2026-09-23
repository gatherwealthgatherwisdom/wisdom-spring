import { Text, View } from "react-native";
import { useColors } from "../../shared/theme";

export function UserBubble({ content }: { content: string }) {
  const colors = useColors();
  return (
    <View style={{ alignItems: "flex-end", marginVertical: 6 }}>
      <View style={{ maxWidth: "86%", backgroundColor: colors.user, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 }}>
        <Text style={{ color: colors.userText, fontSize: 16, lineHeight: 24 }}>{content}</Text>
      </View>
    </View>
  );
}

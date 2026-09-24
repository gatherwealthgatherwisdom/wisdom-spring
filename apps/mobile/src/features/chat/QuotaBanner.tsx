import { Pressable, Text, View } from "react-native";
import { useColors } from "../../shared/theme";

export function QuotaBanner({
  message,
  action,
  onAction,
}: {
  message: string | null;
  action?: string | null;
  onAction?: () => void;
}) {
  const colors = useColors();
  if (!message) return null;
  return (
    <View style={{ backgroundColor: colors.card, borderColor: colors.gold, borderWidth: 1, borderRadius: 12, padding: 10, marginBottom: 8 }}>
      <Text style={{ color: colors.ink }}>{message}</Text>
      {action ? (
        <Pressable onPress={onAction} style={{ marginTop: 8 }}>
          <Text style={{ color: colors.violet }}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

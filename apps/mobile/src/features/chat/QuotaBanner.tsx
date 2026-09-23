import { Text, View } from "react-native";
import { useColors } from "../../shared/theme";

export function QuotaBanner({ message }: { message: string | null }) {
  const colors = useColors();
  if (!message) return null;
  return (
    <View style={{ backgroundColor: colors.card, borderColor: colors.gold, borderWidth: 1, borderRadius: 12, padding: 10, marginBottom: 8 }}>
      <Text style={{ color: colors.ink }}>{message}</Text>
    </View>
  );
}

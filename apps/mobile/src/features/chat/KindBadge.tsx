import { Text, View } from "react-native";
import { useColors } from "../../shared/theme";

export function KindBadge({ kind }: { kind: string | null | undefined }) {
  const colors = useColors();
  if (!kind) return null;
  return (
    <View style={{ marginBottom: 6 }}>
      <Text style={{ color: colors.gold, fontSize: 12 }}>智泉 · {kind}</Text>
    </View>
  );
}

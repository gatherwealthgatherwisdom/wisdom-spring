import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { useColors } from "../theme";

export function ScreenHeader({ title, trailing }: { title: string; trailing?: ReactNode }) {
  const colors = useColors();
  return (
    <View style={{ minHeight: 40, marginBottom: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      <Text style={{ color: colors.ink, fontFamily: "Palatino", fontSize: 22 }}>{title}</Text>
      {trailing ?? <View style={{ width: 28 }} />}
    </View>
  );
}

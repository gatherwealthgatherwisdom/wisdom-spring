import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { useColors } from "../theme";
import { Icon } from "./Icon";

export function ScreenHeader({
  title,
  onBack,
  trailing,
  accessibilityBack,
}: {
  title: string;
  onBack?: () => void;
  trailing?: ReactNode;
  accessibilityBack?: string;
}) {
  const colors = useColors();
  if (onBack) {
    return (
      <View style={{ flexDirection: "row", alignItems: "center", minHeight: 40, paddingHorizontal: 8 }}>
        <Pressable accessibilityLabel={accessibilityBack} onPress={onBack} style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
          <Icon name="chevron-back" color={colors.ink} />
        </Pressable>
        <Text style={{ flex: 1, textAlign: "center", color: colors.ink, fontFamily: "Palatino", fontSize: 22 }} numberOfLines={1}>
          {title}
        </Text>
        {trailing ?? <View style={{ width: 40 }} />}
      </View>
    );
  }
  return (
    <View style={{ minHeight: 40, marginBottom: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 4 }}>
      <Text style={{ color: colors.ink, fontFamily: "Palatino", fontSize: 22 }}>{title}</Text>
      {trailing ?? <View style={{ width: 28 }} />}
    </View>
  );
}

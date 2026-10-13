import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps } from "react";
import { View } from "react-native";

export type IconName = ComponentProps<typeof Ionicons>["name"];

export function Icon({ name, color, size = 22 }: { name: IconName; color: string; size?: number }) {
  return (
    <View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
    >
      <Ionicons name={name} color={color} size={size} />
    </View>
  );
}

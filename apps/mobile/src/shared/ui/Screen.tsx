import type { ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { useColors } from "../theme";
import { useHostInsets } from "./hostInsets";

export type ScreenEdge = "top" | "bottom";

export function Screen({
  children,
  edges = ["top", "bottom"],
  style,
}: {
  children: ReactNode;
  edges?: ScreenEdge[];
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useColors();
  const insets = useHostInsets();
  const padTop = edges.includes("top") ? insets.top : 0;
  const padBottom = edges.includes("bottom") ? insets.bottom : 0;
  return (
    <View style={[{ flex: 1, backgroundColor: colors.bg, paddingTop: padTop, paddingBottom: padBottom }, style]}>
      {children}
    </View>
  );
}

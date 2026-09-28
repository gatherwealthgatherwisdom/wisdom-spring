import type { ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "../theme";

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
  const insets = useSafeAreaInsets();
  const padTop = edges.includes("top") ? Math.max(insets.top, 8) : 0;
  const padBottom = edges.includes("bottom") ? Math.max(insets.bottom, 8) : 0;
  return (
    <View style={[{ flex: 1, backgroundColor: colors.bg, paddingTop: padTop, paddingBottom: padBottom }, style]}>
      {children}
    </View>
  );
}

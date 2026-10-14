import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Keyboard, Platform, View, type StyleProp, type ViewStyle } from "react-native";
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
  const [keyboardUp, setKeyboardUp] = useState(false);
  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const show = Keyboard.addListener(showEvent, () => setKeyboardUp(true));
    const hide = Keyboard.addListener(hideEvent, () => setKeyboardUp(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  const padTop = edges.includes("top") ? insets.top : 0;
  // KeyboardDock / KeyboardAvoidingView own the bottom offset while the IME is up.
  const padBottom = edges.includes("bottom") && !keyboardUp ? insets.bottom : 0;
  return (
    <View style={[{ flex: 1, backgroundColor: colors.bg, paddingTop: padTop, paddingBottom: padBottom }, style]}>
      {children}
    </View>
  );
}

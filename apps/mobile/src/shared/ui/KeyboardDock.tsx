import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Dimensions, Keyboard, type KeyboardEvent, Platform, View } from "react-native";

export function KeyboardDock({
  children,
  tabBar: _tabBar = false,
}: {
  children: ReactNode;
  tabBar?: boolean;
}) {
  const [keyboard, setKeyboard] = useState(0);

  useEffect(() => {
    function overlap(event: KeyboardEvent): number {
      const screenH = Dimensions.get("screen").height;
      const top = event.endCoordinates.screenY;
      const fromScreen = Number.isFinite(top) ? Math.max(0, screenH - top) : 0;
      return Math.max(fromScreen, event.endCoordinates.height, 0);
    }
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const show = Keyboard.addListener(showEvent, (event) => setKeyboard(overlap(event)));
    const change = Platform.OS === "ios" ? Keyboard.addListener("keyboardWillChangeFrame", (event) => setKeyboard(overlap(event))) : null;
    const hide = Keyboard.addListener(hideEvent, () => setKeyboard(0));
    return () => {
      show.remove();
      change?.remove();
      hide.remove();
    };
  }, []);

  // Tab bar hides while the keyboard is up. Android uses adjustNothing so this
  // lift is the only offset; adjustPan would clip the composer card on the IME.
  return <View style={{ marginBottom: keyboard }}>{children}</View>;
}

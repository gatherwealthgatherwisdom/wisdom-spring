import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Dimensions, Keyboard, type KeyboardEvent, Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** Paper showing between the rounded composer and Gboard's toolbar. */
const ANDROID_GAP = 12;

export function KeyboardDock({
  children,
  tabBar: _tabBar = false,
}: {
  children: ReactNode;
  tabBar?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const [keyboard, setKeyboard] = useState({ overlap: 0, height: 0 });

  useEffect(() => {
    function frame(event: KeyboardEvent) {
      const height = Math.max(event.endCoordinates.height, 0);
      const top = event.endCoordinates.screenY;
      const fromScreen = Number.isFinite(top) ? Math.max(0, Dimensions.get("screen").height - top) : 0;
      const fromWindow = Number.isFinite(top) ? Math.max(0, Dimensions.get("window").height - top) : 0;
      setKeyboard({ overlap: Math.max(fromScreen, fromWindow, height, 0), height });
    }
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const show = Keyboard.addListener(showEvent, frame);
    const change = Platform.OS === "ios" ? Keyboard.addListener("keyboardWillChangeFrame", frame) : null;
    const hide = Keyboard.addListener(hideEvent, () => setKeyboard({ overlap: 0, height: 0 }));
    return () => {
      show.remove();
      change?.remove();
      hide.remove();
    };
  }, []);

  // Tab bar hides while the keyboard is up. Android uses adjustNothing so this
  // lift is the only offset. keyboard.height often omits the nav/gesture strip
  // that Gboard still covers; add that inset plus a paper gap so the rounded
  // composer sits fully above the IME toolbar.
  const lift =
    keyboard.overlap === 0
      ? 0
      : Platform.OS === "android"
        ? Math.max(keyboard.overlap, keyboard.height + Math.max(insets.bottom, 0)) + ANDROID_GAP
        : keyboard.overlap;

  return <View style={{ marginBottom: lift }}>{children}</View>;
}

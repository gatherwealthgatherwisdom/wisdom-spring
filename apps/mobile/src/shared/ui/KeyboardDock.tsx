import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Keyboard, Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function KeyboardDock({
  children,
  tabBar = false,
}: {
  children: ReactNode;
  tabBar?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const [keyboard, setKeyboard] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const show = Keyboard.addListener(showEvent, (event) => {
      setKeyboard(event.endCoordinates.height);
    });
    const hide = Keyboard.addListener(hideEvent, () => setKeyboard(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const reserved = tabBar ? 50 + Math.max(insets.bottom, 8) : Math.max(insets.bottom, 0);
  const lift = Platform.OS === "ios" && keyboard > 0 ? Math.max(0, keyboard - reserved) : 0;
  return <View style={{ marginBottom: lift }}>{children}</View>;
}

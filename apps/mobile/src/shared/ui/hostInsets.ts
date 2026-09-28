import { useRef } from "react";
import { initialWindowMetrics, useSafeAreaInsets, type EdgeInsets } from "react-native-safe-area-context";

const BOOT: EdgeInsets = {
  top: initialWindowMetrics?.insets.top ?? 0,
  bottom: initialWindowMetrics?.insets.bottom ?? 0,
  left: initialWindowMetrics?.insets.left ?? 0,
  right: initialWindowMetrics?.insets.right ?? 0,
};

export function useHostInsets(hold = false): EdgeInsets {
  const live = useSafeAreaInsets();
  const held = useRef<EdgeInsets>(merge(live));
  if (!hold) held.current = merge(live);
  return held.current;
}

function merge(live: EdgeInsets): EdgeInsets {
  return {
    top: Math.max(live.top, BOOT.top, 12),
    bottom: Math.max(live.bottom, BOOT.bottom, 8),
    left: Math.max(live.left, BOOT.left),
    right: Math.max(live.right, BOOT.right),
  };
}

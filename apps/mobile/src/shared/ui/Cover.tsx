import type { ReactNode } from "react";
import { Image, View, type ImageSourcePropType, type StyleProp, type ViewStyle } from "react-native";

export function Cover({
  source,
  children,
  style,
  dim = 0.38,
}: {
  source: ImageSourcePropType;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  dim?: number;
}) {
  return (
    <View style={[{ overflow: "hidden" }, style]}>
      <Image source={source} resizeMode="cover" style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }} />
      <View style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: `rgba(28,27,25,${dim})` }} />
      {children}
    </View>
  );
}

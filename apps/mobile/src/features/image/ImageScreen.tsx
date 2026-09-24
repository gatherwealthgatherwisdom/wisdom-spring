import { IMAGE_STYLES } from "@spring/shared";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { openChat, type MainTabParamList } from "../../navigation/MainTabs";
import { spring } from "../../shared/lib/api";
import { copy } from "../../shared/lib/i18n";
import { usePrefs } from "../../shared/lib/prefs";
import { useColors } from "../../shared/theme";
import { ScreenHeader } from "../../shared/ui/ScreenHeader";

type Props = BottomTabScreenProps<MainTabParamList, "Image">;

export function ImageScreen({ navigation }: Props) {
  const colors = useColors();
  const locale = usePrefs((state) => state.locale);
  const text = copy[locale];
  const [styleId, setStyleId] = useState(IMAGE_STYLES[0]?.id ?? "ink");
  const [prompt, setPrompt] = useState("");
  const signedIn = usePrefs((state) => Boolean(state.accessToken));
  const caps = useQuery({ queryKey: ["capabilities"], queryFn: () => spring.capabilities(), enabled: signedIn });
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, padding: 20 }}>
      <ScreenHeader title={text.image} />
      {caps.data && !caps.data.image ? <Text style={{ color: colors.ink, marginBottom: 12 }}>{text.noImageModel}</Text> : null}
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
        {IMAGE_STYLES.map((style) => (
          <Pressable
            key={style.id}
            onPress={() => setStyleId(style.id)}
            style={{ borderWidth: 1, borderColor: styleId === style.id ? colors.accent : colors.line, backgroundColor: colors.card, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 }}
          >
            <Text style={{ color: colors.ink }}>{locale === "en" ? style.en : style.zh}</Text>
          </Pressable>
        ))}
      </View>
      <TextInput
        value={prompt}
        onChangeText={setPrompt}
        placeholder={text.placeholder}
        placeholderTextColor={colors.muted}
        style={{ borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, color: colors.ink, borderRadius: 14, padding: 12 }}
      />
      <Pressable
        onPress={() => {
          if (!prompt.trim() || caps.data?.image === false) return;
          openChat(navigation, { mode: "image", imageStyle: styleId, seed: prompt.trim() });
          setPrompt("");
        }}
        style={{ marginTop: 14, backgroundColor: colors.accent, borderRadius: 16, padding: 14, alignItems: "center", opacity: caps.data?.image === false ? 0.4 : 1 }}
      >
        <Text style={{ color: colors.onAccent }}>{text.start}</Text>
      </Pressable>
    </SafeAreaView>
  );
}

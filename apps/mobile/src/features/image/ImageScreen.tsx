import { IMAGE_STYLES } from "@spring/shared";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Icon } from "../../shared/ui/Icon";
import { SafeAreaView } from "react-native-safe-area-context";
import { openChat, type MainTabParamList } from "../../navigation/MainTabs";
import { spring } from "../../shared/lib/api";
import { copy } from "../../shared/lib/i18n";
import { usePrefs } from "../../shared/lib/prefs";
import { useColors } from "../../shared/theme";
import { ScreenHeader } from "../../shared/ui/ScreenHeader";

function styleNote(id: string, locale: "zh-HK" | "en") {
  const notes: Record<string, { "zh-HK": string; en: string }> = {
    ink: { "zh-HK": "留白、淡墨", en: "Blank paper and light ink" },
    paper: { "zh-HK": "暖色紙本插畫", en: "Warm illustration on paper" },
    night: { "zh-HK": "夜色裡一點暖光", en: "A night scene with one warm light" },
  };
  return notes[id]?.[locale] ?? "";
}

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
      {caps.data && !caps.data.image ? (
        <Text style={{ color: colors.ink, backgroundColor: colors.card, borderRadius: 12, padding: 12, marginBottom: 12 }}>{text.noImageModel}</Text>
      ) : null}
      <View style={{ gap: 10, flex: 1 }}>
        {IMAGE_STYLES.map((style) => (
          <Pressable
            key={style.id}
            onPress={() => setStyleId(style.id)}
            style={{ borderWidth: styleId === style.id ? 2 : 1, borderColor: styleId === style.id ? colors.accent : colors.line, backgroundColor: colors.card, borderRadius: 16, padding: 16 }}
          >
            <Text style={{ color: colors.ink, fontSize: 18 }}>{locale === "en" ? style.en : style.zh}</Text>
            <Text style={{ color: colors.muted, marginTop: 4 }}>{styleNote(style.id, locale)}</Text>
          </Pressable>
        ))}
      </View>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8, marginTop: 12, padding: 6, borderRadius: 28, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card }}>
        <TextInput
          value={prompt}
          onChangeText={setPrompt}
          placeholder={text.placeholder}
          placeholderTextColor={colors.muted}
          style={{ flex: 1, minHeight: 36, color: colors.ink, fontSize: 16, paddingHorizontal: 10 }}
        />
        <Pressable
          accessibilityLabel={text.start}
          onPress={() => {
            if (!prompt.trim() || caps.data?.image === false) return;
            openChat(navigation, { mode: "image", imageStyle: styleId, seed: prompt.trim() });
            setPrompt("");
          }}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center", opacity: caps.data?.image === false ? 0.4 : 1 }}
        >
          <Icon name="arrow-up" color={colors.onAccent} size={18} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

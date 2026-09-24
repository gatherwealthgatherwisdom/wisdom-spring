import { ApiError } from "@spring/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AppStackParamList } from "../../navigation/RootNavigation";
import { spring } from "../../shared/lib/api";
import { copy } from "../../shared/lib/i18n";
import { usePrefs } from "../../shared/lib/prefs";
import { useColors } from "../../shared/theme";

type Props = NativeStackScreenProps<AppStackParamList, "Register">;

export function CompleteRegistrationScreen({ navigation }: Props) {
  const colors = useColors();
  const locale = usePrefs((state) => state.locale);
  const text = copy[locale];
  const phone = usePrefs((state) => state.user?.phone);
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setError("");
    setBusy(true);
    try {
      const trimmed = name.trim();
      const me = await spring.completePhoneRegistration(trimmed ? { displayName: trimmed } : {});
      usePrefs.getState().setUser(me.user);
      queryClient.setQueryData(["me"], me);
      navigation.goBack();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : text.phoneInvalid);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ width: "100%", maxWidth: 420, alignSelf: "center", padding: 24 }}>
      <Pressable onPress={() => navigation.goBack()} style={{ marginBottom: 16 }}>
        <Text style={{ color: colors.ink }}>{text.mine}</Text>
      </Pressable>
      <Text style={{ fontSize: 32, color: colors.ink, fontFamily: "Palatino" }}>{text.completeRegistration}</Text>
      <View style={{ height: 2, width: 48, backgroundColor: colors.gold, marginVertical: 16 }} />
      <Text style={{ color: colors.muted, marginBottom: 16 }}>{phone}</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder={text.displayName}
        placeholderTextColor={colors.muted}
        style={{
          borderWidth: 1,
          borderColor: colors.line,
          backgroundColor: colors.card,
          color: colors.ink,
          borderRadius: 14,
          padding: 14,
          marginBottom: 12,
        }}
      />
      {error ? <Text style={{ color: colors.danger, marginBottom: 8 }}>{error}</Text> : null}
      <Pressable
        disabled={busy}
        onPress={() => void confirm()}
        style={{ backgroundColor: colors.violet, borderRadius: 16, padding: 14, alignItems: "center", opacity: busy ? 0.7 : 1 }}
      >
        <Text style={{ color: "#F6F1E8" }}>{text.confirm}</Text>
      </Pressable>
      </View>
    </SafeAreaView>
  );
}

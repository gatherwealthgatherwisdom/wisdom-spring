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
import { Icon } from "../../shared/ui/Icon";

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
      <View style={{ flexDirection: "row", alignItems: "center", minHeight: 40, marginBottom: 16 }}>
        <Pressable onPress={() => navigation.goBack()} accessibilityLabel={text.back} style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
          <Icon name="chevron-back" color={colors.ink} />
        </Pressable>
        <Text style={{ color: colors.ink, fontFamily: "Palatino", fontSize: 22 }}>{text.completeRegistration}</Text>
      </View>
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
        style={{ backgroundColor: colors.accent, borderRadius: 16, padding: 14, alignItems: "center", opacity: busy ? 0.7 : 1 }}
      >
        <Text style={{ color: colors.onAccent }}>{text.confirm}</Text>
      </Pressable>
      </View>
    </SafeAreaView>
  );
}

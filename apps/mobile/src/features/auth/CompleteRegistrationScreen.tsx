import { ApiError } from "@spring/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from "react-native";
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
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={{ flexDirection: "row", alignItems: "center", minHeight: 40, paddingHorizontal: 8 }}>
          <Pressable accessibilityLabel={text.back} onPress={() => navigation.goBack()} style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
            <Icon name="chevron-back" color={colors.ink} />
          </Pressable>
          <Text style={{ flex: 1, textAlign: "center", color: colors.ink, fontFamily: "Palatino", fontSize: 22 }}>{text.completeRegistration}</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 12 }}>
          <Text style={{ color: colors.muted, lineHeight: 22, marginBottom: 20 }}>{text.registerHint}</Text>
          <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 16 }}>
            {phone ? <Text style={{ color: colors.ink, marginBottom: 12 }}>{phone}</Text> : null}
            <Text style={{ color: colors.muted, fontSize: 13, marginBottom: 8 }}>{text.displayName}</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              autoFocus
              placeholder={text.displayName}
              placeholderTextColor={colors.muted}
              onSubmitEditing={() => void confirm()}
              style={{
                height: 48,
                borderWidth: 1,
                borderColor: colors.line,
                backgroundColor: colors.bg,
                color: colors.ink,
                borderRadius: 12,
                paddingHorizontal: 14,
              }}
            />
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, paddingBottom: 16, gap: 10 }}>
          {error ? <Text style={{ color: colors.danger, textAlign: "center" }}>{error}</Text> : null}
          <Pressable
            disabled={busy}
            onPress={() => void confirm()}
            style={{ backgroundColor: colors.accent, borderRadius: 16, paddingVertical: 16, alignItems: "center", opacity: busy ? 0.7 : 1 }}
          >
            <Text style={{ color: colors.onAccent, fontSize: 16 }}>{text.confirm}</Text>
          </Pressable>
          <Text style={{ color: colors.muted, textAlign: "center", fontSize: 12 }}>{text.company}</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

import { ApiError } from "@spring/api-client";
import { normalizeHkMobile } from "@spring/shared";
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

type Props = NativeStackScreenProps<AppStackParamList, "Auth">;

export function AuthScreen({ navigation }: Props) {
  const colors = useColors();
  const locale = usePrefs((state) => state.locale);
  const text = copy[locale];
  const setSession = usePrefs((state) => state.setSession);
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [digits, setDigits] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function requestCode() {
    setError("");
    const normalized = normalizeHkMobile(digits);
    if (!normalized) {
      setError(text.phoneInvalid);
      return;
    }
    setBusy(true);
    try {
      await spring.requestPhoneCode({ phone: normalized });
      setPhone(normalized);
      setCode("");
      setStep("code");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : text.phoneInvalid);
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    setError("");
    setBusy(true);
    try {
      const session = await spring.verifyPhone({ phone, code: code.trim() });
      setSession(session);
      if (navigation.canGoBack()) navigation.goBack();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "登入資料不正確。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, justifyContent: "center" }}>
      <View style={{ width: "100%", maxWidth: 420, alignSelf: "center", padding: 24 }}>
      {navigation.canGoBack() ? (
        <Pressable onPress={() => navigation.goBack()} accessibilityLabel={text.back} style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
          <Icon name="chevron-back" color={colors.ink} />
        </Pressable>
      ) : null}
      <Text style={{ fontSize: 40, color: colors.ink, fontFamily: "Palatino" }}>智泉</Text>
      <Text style={{ color: colors.muted, marginBottom: 8 }}>{text.splash}</Text>
      <Text style={{ color: colors.muted, marginBottom: 24 }}>中盈紫達集團</Text>
      {step === "phone" ? (
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
          <View style={{ ...field(colors), marginBottom: 0, justifyContent: "center", paddingHorizontal: 14 }}>
            <Text style={{ color: colors.ink }}>+852</Text>
          </View>
          <TextInput
            value={digits}
            onChangeText={(value) => setDigits(value.replace(/\D/g, "").slice(0, 8))}
            keyboardType="number-pad"
            placeholder={text.phone}
            placeholderTextColor={colors.muted}
            style={{ ...field(colors), flex: 1, marginBottom: 0 }}
          />
        </View>
      ) : (
        <>
          <Text style={{ color: colors.muted, marginBottom: 8 }}>{phone}</Text>
          <Text style={{ color: colors.ink, marginBottom: 8 }}>{text.codeSent}</Text>
          <TextInput
            value={code}
            onChangeText={(value) => setCode(value.replace(/\D/g, "").slice(0, 6))}
            keyboardType="number-pad"
            placeholder={text.code}
            placeholderTextColor={colors.muted}
            style={field(colors)}
          />
        </>
      )}
      {error ? <Text style={{ color: colors.danger, marginBottom: 8 }}>{error}</Text> : null}
      <Pressable
        disabled={busy}
        onPress={() => void (step === "phone" ? requestCode() : verify())}
        style={{ backgroundColor: colors.accent, borderRadius: 16, padding: 14, alignItems: "center", opacity: busy ? 0.7 : 1 }}
      >
        <Text style={{ color: colors.onAccent }}>{step === "phone" ? text.getCode : text.login}</Text>
      </Pressable>
      {step === "code" ? (
        <Pressable
          onPress={() => {
            setStep("phone");
            setError("");
          }}
          style={{ marginTop: 16 }}
        >
          <Text style={{ color: colors.accent, textAlign: "center" }}>{text.changeNumber}</Text>
        </Pressable>
      ) : null}
      </View>
    </SafeAreaView>
  );
}

function field(colors: { card: string; line: string; ink: string }) {
  return {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    color: colors.ink,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  };
}

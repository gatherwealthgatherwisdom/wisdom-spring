import { ApiError } from "@spring/api-client";
import { normalizeHkMobile } from "@spring/shared";
import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from "react-native";
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
  const [cooldown, setCooldown] = useState(0);
  const busyRef = useRef(false);
  const codeField = useRef<TextInput>(null);
  const phoneReady = Boolean(normalizeHkMobile(digits));
  const codeReady = code.length === 6;
  const canSubmit = !busy && (step === "phone" ? phoneReady : codeReady);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    if (step === "code") {
      const timer = setTimeout(() => codeField.current?.focus(), 200);
      return () => clearTimeout(timer);
    }
  }, [step]);

  async function requestCode() {
    setError("");
    const normalized = normalizeHkMobile(digits);
    if (!normalized) {
      setError(text.phoneInvalid);
      return;
    }
    busyRef.current = true;
    setBusy(true);
    try {
      await spring.requestPhoneCode({ phone: normalized });
      setPhone(normalized);
      setCode("");
      setStep("code");
      setCooldown(60);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : text.phoneInvalid);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function verify(nextCode = code) {
    if (busyRef.current || nextCode.length !== 6) return;
    setError("");
    busyRef.current = true;
    setBusy(true);
    try {
      const session = await spring.verifyPhone({ phone, code: nextCode });
      setSession(session);
      if (navigation.canGoBack()) navigation.goBack();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : text.loginWrong);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={{ flexDirection: "row", alignItems: "center", minHeight: 40, paddingHorizontal: 8 }}>
          {navigation.canGoBack() ? (
            <Pressable accessibilityLabel={text.back} onPress={() => navigation.goBack()} style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
              <Icon name="chevron-back" color={colors.ink} />
            </Pressable>
          ) : (
            <View style={{ width: 40 }} />
          )}
          <Text style={{ flex: 1, textAlign: "center", color: colors.ink, fontFamily: "Palatino", fontSize: 22 }}>{text.login}</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 12 }}>
          <Text style={{ color: colors.ink, fontFamily: "Palatino", fontSize: 28, marginBottom: 6 }}>{text.app}</Text>
          {step === "phone" ? (
            <Text style={{ color: colors.muted, lineHeight: 22, marginBottom: 20 }}>{text.phoneHint}</Text>
          ) : (
            <Text style={{ color: colors.muted, lineHeight: 22, marginBottom: 20 }}>{text.codeSent}</Text>
          )}

          <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 16 }}>
            {step === "phone" ? (
              <>
                <Text style={{ color: colors.muted, fontSize: 13, marginBottom: 8 }}>{text.phone}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <View style={{ borderWidth: 1, borderColor: colors.line, backgroundColor: colors.bg, borderRadius: 12, paddingHorizontal: 12, height: 48, justifyContent: "center" }}>
                    <Text style={{ color: colors.ink }}>+852</Text>
                  </View>
                  <TextInput
                    value={digits.length > 4 ? `${digits.slice(0, 4)} ${digits.slice(4)}` : digits}
                    onChangeText={(value) => {
                      setDigits(value.replace(/\D/g, "").slice(0, 8));
                      setError("");
                    }}
                    keyboardType="number-pad"
                    maxLength={9}
                    autoFocus
                    autoComplete="tel"
                    textContentType="telephoneNumber"
                    placeholder="9123 4567"
                    placeholderTextColor={colors.muted}
                    onSubmitEditing={() => {
                      if (phoneReady) void requestCode();
                    }}
                    style={{
                      flex: 1,
                      height: 48,
                      borderWidth: 1,
                      borderColor: colors.line,
                      backgroundColor: colors.bg,
                      color: colors.ink,
                      borderRadius: 12,
                      paddingHorizontal: 14,
                      fontSize: 18,
                    }}
                  />
                </View>
                <Text style={{ color: colors.muted, fontSize: 12, marginTop: 8 }}>{text.digitsOf(digits.length, 8)}</Text>
              </>
            ) : (
              <>
                <Text style={{ color: colors.ink, marginBottom: 12 }}>{formatHk(phone)}</Text>
                <Text style={{ color: colors.muted, fontSize: 13, marginBottom: 8 }}>{text.code}</Text>
                <TextInput
                  ref={codeField}
                  value={code}
                  onChangeText={(value) => {
                    const next = value.replace(/\D/g, "").slice(0, 6);
                    setCode(next);
                    setError("");
                    if (next.length === 6) void verify(next);
                  }}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoComplete="one-time-code"
                  textContentType="oneTimeCode"
                  placeholder=""
                  placeholderTextColor={colors.muted}
                  onSubmitEditing={() => void verify()}
                  style={{
                    height: 56,
                    borderWidth: 1,
                    borderColor: colors.line,
                    backgroundColor: colors.bg,
                    color: colors.ink,
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    fontSize: 24,
                    letterSpacing: code ? 8 : 2,
                    textAlign: "center",
                  }}
                />
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 12 }}>
                  <Pressable
                    onPress={() => {
                      setStep("phone");
                      setCode("");
                      setError("");
                      setCooldown(0);
                    }}
                  >
                    <Text style={{ color: colors.accent }}>{text.changeNumber}</Text>
                  </Pressable>
                  {cooldown > 0 ? (
                    <Text style={{ color: colors.muted }}>{text.resendIn(cooldown)}</Text>
                  ) : (
                    <Pressable disabled={busy} onPress={() => void requestCode()}>
                      <Text style={{ color: colors.accent }}>{text.resend}</Text>
                    </Pressable>
                  )}
                </View>
              </>
            )}
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, paddingBottom: 16, gap: 10 }}>
          {error ? <Text style={{ color: colors.danger, textAlign: "center" }}>{error}</Text> : null}
          <Pressable
            disabled={!canSubmit}
            onPress={() => void (step === "phone" ? requestCode() : verify())}
            style={{
              backgroundColor: colors.accent,
              borderRadius: 16,
              paddingVertical: 16,
              alignItems: "center",
              opacity: canSubmit ? 1 : 0.4,
            }}
          >
            <Text style={{ color: colors.onAccent, fontSize: 16 }}>{step === "phone" ? text.getCode : text.login}</Text>
          </Pressable>
          <Text style={{ color: colors.muted, textAlign: "center", fontSize: 12 }}>{text.company}</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function formatHk(phone: string): string {
  const local = phone.replace(/\D/g, "").slice(-8);
  if (local.length !== 8) return phone;
  return `+852 ${local.slice(0, 4)} ${local.slice(4)}`;
}

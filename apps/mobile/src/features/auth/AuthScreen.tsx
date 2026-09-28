import { ApiError } from "@spring/api-client";
import {
  DIALS,
  formatE164,
  formatLocalDigits,
  localLength,
  normalizeMobile,
  type DialCode,
} from "@spring/shared";
import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AppStackParamList } from "../../navigation/RootNavigation";
import { spring } from "../../shared/lib/api";
import { copy, type Copy } from "../../shared/lib/i18n";
import { usePrefs } from "../../shared/lib/prefs";
import { useColors, type Palette } from "../../shared/theme";
import { Icon } from "../../shared/ui/Icon";
import { Screen } from "../../shared/ui/Screen";
import { ScreenHeader } from "../../shared/ui/ScreenHeader";

type Props = NativeStackScreenProps<AppStackParamList, "Auth">;

const PLACEHOLDER: Record<DialCode, string> = {
  "852": "9123 4567",
  "853": "6612 3456",
  "86": "138 0013 8000",
};

export function AuthScreen({ navigation }: Props) {
  const colors = useColors();
  const locale = usePrefs((state) => state.locale);
  const text = copy[locale];
  const setSession = usePrefs((state) => state.setSession);
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [dial, setDial] = useState<DialCode>("852");
  const [dialOpen, setDialOpen] = useState(false);
  const [digits, setDigits] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const busyRef = useRef(false);
  const codeField = useRef<TextInput>(null);
  const maxLocal = localLength(dial);
  const phoneReady = Boolean(normalizeMobile(digits, dial));
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
    const normalized = step === "code" && phone ? phone : normalizeMobile(digits, dial);
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
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}>
        <ScreenHeader title={text.login} onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined} accessibilityBack={text.back} />

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
                  <Pressable
                    accessibilityLabel={`+${dial}`}
                    onPress={() => setDialOpen(true)}
                    style={{ borderWidth: 1, borderColor: colors.line, backgroundColor: colors.bg, borderRadius: 12, paddingHorizontal: 10, height: 48, flexDirection: "row", alignItems: "center", gap: 4 }}
                  >
                    <Text style={{ color: colors.ink }}>+{dial}</Text>
                    <Icon name="chevron-down" color={colors.muted} size={16} />
                  </Pressable>
                  <TextInput
                    value={formatLocalDigits(dial, digits)}
                    onChangeText={(value) => {
                      setDigits(value.replace(/\D/g, "").slice(0, maxLocal));
                      setError("");
                    }}
                    keyboardType="number-pad"
                    maxLength={formatLocalDigits(dial, "0".repeat(maxLocal)).length}
                    autoFocus
                    autoComplete="tel"
                    textContentType="telephoneNumber"
                    placeholder={PLACEHOLDER[dial]}
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
              </>
            ) : (
              <>
                <Text style={{ color: colors.ink, marginBottom: 12 }}>{formatE164(phone)}</Text>
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
      <DialSheet
        open={dialOpen}
        value={dial}
        colors={colors}
        text={text}
        onClose={() => setDialOpen(false)}
        onPick={(next) => {
          setDial(next);
          setDigits("");
          setError("");
          setDialOpen(false);
        }}
      />
    </Screen>
  );
}

function DialSheet({
  open,
  value,
  colors,
  text,
  onClose,
  onPick,
}: {
  open: boolean;
  value: DialCode;
  colors: Palette;
  text: Copy;
  onClose: () => void;
  onPick: (dial: DialCode) => void;
}) {
  const labels: Record<DialCode, string> = { "852": text.regionHk, "853": text.regionMo, "86": text.regionCn };
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={open} animationType="slide" transparent statusBarTranslucent onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: "#00000066", justifyContent: "flex-end" }}>
        <Pressable onPress={() => undefined} style={{ backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: Math.max(insets.bottom, 20) }}>
          <Text style={{ color: colors.ink, fontFamily: "Palatino", fontSize: 20, marginBottom: 12 }}>{text.phone}</Text>
          {DIALS.map((item, index) => (
            <Pressable
              key={item.code}
              onPress={() => onPick(item.code)}
              style={{ flexDirection: "row", alignItems: "center", paddingVertical: 14, borderBottomWidth: index === DIALS.length - 1 ? 0 : 1, borderBottomColor: colors.line }}
            >
              <Text style={{ color: colors.ink, fontSize: 16, width: 64 }}>+{item.code}</Text>
              <Text style={{ color: colors.ink, fontSize: 16, flex: 1 }}>{labels[item.code]}</Text>
              {value === item.code ? <Icon name="checkmark" color={colors.accent} size={20} /> : null}
            </Pressable>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

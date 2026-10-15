import * as Clipboard from "expo-clipboard";
import { useEffect, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { fillOtp, markOtpSeen, useOtpPrompt } from "../../shared/lib/otp-prompt";
import { copy } from "../../shared/lib/i18n";
import { usePrefs } from "../../shared/lib/prefs";
import { useColors } from "../../shared/theme";
import { useHostInsets } from "../../shared/ui/hostInsets";

export function OtpPrompt() {
  const colors = useColors();
  const insets = useHostInsets();
  const locale = usePrefs((state) => state.locale);
  const text = copy[locale];
  const code = useOtpPrompt((state) => state.code);
  const noticeId = useOtpPrompt((state) => state.noticeId);
  const canFill = useOtpPrompt((state) => state.canFill);
  const dismiss = useOtpPrompt((state) => state.dismiss);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    setCopied(false);
  }, [code]);
  if (!code) return null;

  function close() {
    markOtpSeen(noticeId);
    dismiss();
  }

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={close}>
      <View
        style={{
          flex: 1,
          backgroundColor: "#00000066",
          justifyContent: "center",
          paddingHorizontal: 24,
          paddingTop: Math.max(insets.top, 12),
          paddingBottom: Math.max(insets.bottom, 8),
        }}
      >
        <Pressable onPress={close} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} />
        <View
          accessibilityViewIsModal
          style={{
            backgroundColor: colors.card,
            borderRadius: 16,
            padding: 20,
            borderWidth: 1,
            borderColor: colors.line,
          }}
        >
          <Text style={{ color: colors.ink, fontFamily: "Palatino", fontSize: 22, marginBottom: 8 }}>{text.code}</Text>
          <Text
            testID="otp-code"
            accessibilityLabel={code}
            style={{
              color: colors.ink,
              fontSize: 32,
              letterSpacing: 8,
              textAlign: "center",
              paddingVertical: 12,
            }}
          >
            {code}
          </Text>
          <Text style={{ color: colors.muted, textAlign: "center", marginBottom: 16 }}>
            {copied ? text.otpCopied : text.codeSent}
          </Text>
          <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" }}>
            <Pressable onPress={close} style={{ paddingHorizontal: 12, paddingVertical: 10 }}>
              <Text style={{ color: colors.muted }}>{text.close}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={text.copy}
              onPress={() => {
                void Clipboard.setStringAsync(code).then(() => setCopied(true));
              }}
              style={{
                borderWidth: 1,
                borderColor: colors.line,
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 10,
              }}
            >
              <Text style={{ color: colors.ink }}>{text.copy}</Text>
            </Pressable>
            {canFill ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={text.otpFill}
                onPress={() => {
                  fillOtp(code);
                  close();
                }}
                style={{ backgroundColor: colors.accent, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 }}
              >
                <Text style={{ color: colors.onAccent }}>{text.otpFill}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

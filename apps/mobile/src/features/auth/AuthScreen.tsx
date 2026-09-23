import { ApiError } from "@spring/api-client";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { spring } from "../../shared/lib/api";
import { copy } from "../../shared/lib/i18n";
import { usePrefs } from "../../shared/lib/prefs";
import { useColors } from "../../shared/theme";

export function AuthScreen() {
  const colors = useColors();
  const locale = usePrefs((state) => state.locale);
  const text = copy[locale];
  const setSession = usePrefs((state) => state.setSession);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function submit() {
    setError("");
    try {
      const session = mode === "login"
        ? await spring.login({ email, password })
        : await spring.register({ email, password });
      setSession(session);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "登入資料不正確。");
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, padding: 24, justifyContent: "center" }}>
      <Text style={{ fontSize: 48, color: colors.ink }}>智泉</Text>
      <Text style={{ color: colors.gold, marginBottom: 8 }}>{text.splash}</Text>
      <Text style={{ color: colors.muted, marginBottom: 24 }}>中盈紫達集團</Text>
      <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder={text.email} placeholderTextColor={colors.muted} style={field(colors)} />
      <TextInput value={password} onChangeText={setPassword} secureTextEntry placeholder={text.password} placeholderTextColor={colors.muted} style={field(colors)} />
      {error ? <Text style={{ color: colors.danger, marginBottom: 8 }}>{error}</Text> : null}
      <Pressable onPress={() => void submit()} style={{ backgroundColor: colors.violet, borderRadius: 16, padding: 14, alignItems: "center" }}>
        <Text style={{ color: "#F6F1E8" }}>{mode === "login" ? text.login : text.register}</Text>
      </Pressable>
      <Pressable onPress={() => setMode(mode === "login" ? "register" : "login")} style={{ marginTop: 16 }}>
        <Text style={{ color: colors.violet, textAlign: "center" }}>{mode === "login" ? text.register : text.login}</Text>
      </Pressable>
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

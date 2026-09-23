import { Pressable, Text, TextInput, View } from "react-native";
import { useColors } from "../../shared/theme";

export function Composer({
  value,
  placeholder,
  streaming,
  stopLabel,
  onChange,
  onSend,
  onStop,
}: {
  value: string;
  placeholder: string;
  streaming: boolean;
  stopLabel: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
}) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-end", paddingTop: 8 }}>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        multiline
        style={{
          flex: 1,
          minHeight: 46,
          maxHeight: 140,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.line,
          backgroundColor: colors.card,
          color: colors.ink,
          paddingHorizontal: 14,
          paddingVertical: 10,
          fontSize: 16,
        }}
      />
      {streaming ? (
        <Pressable onPress={onStop} style={{ backgroundColor: colors.ink, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12 }}>
          <Text style={{ color: colors.bg }}>{stopLabel}</Text>
        </Pressable>
      ) : (
        <Pressable onPress={onSend} style={{ backgroundColor: colors.violet, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12 }}>
          <Text style={{ color: "#F6F1E8" }}>↑</Text>
        </Pressable>
      )}
    </View>
  );
}

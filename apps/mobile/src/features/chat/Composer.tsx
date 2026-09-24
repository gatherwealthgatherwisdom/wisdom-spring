import { Pressable, TextInput, View } from "react-native";
import { useColors } from "../../shared/theme";
import { Icon } from "../../shared/ui/Icon";

export function Composer({
  value,
  placeholder,
  streaming,
  stopLabel,
  onChange,
  onSend,
  onStop,
  onAttach,
  onMic,
}: {
  value: string;
  placeholder: string;
  streaming: boolean;
  stopLabel: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  onAttach: () => void;
  onMic: () => void;
}) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 4, marginTop: 8, paddingLeft: 6, paddingRight: 6, paddingVertical: 6, borderRadius: 28, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card }}>
      <Pressable onPress={onAttach} accessibilityLabel="+" style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center" }}>
        <Icon name="add" color={colors.ink} size={22} />
      </Pressable>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        multiline
        style={{ flex: 1, minHeight: 36, maxHeight: 120, color: colors.ink, fontSize: 16, paddingVertical: 6 }}
      />
      {streaming ? (
        <Pressable onPress={onStop} accessibilityLabel={stopLabel} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center" }}>
          <Icon name="stop" color={colors.bg} size={14} />
        </Pressable>
      ) : (
        <>
          <Pressable onPress={onMic} style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center" }}>
            <Icon name="mic-outline" color={colors.ink} size={20} />
          </Pressable>
          <Pressable onPress={onSend} accessibilityLabel="send" style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" }}>
            <Icon name="arrow-up" color={colors.onAccent} size={18} />
          </Pressable>
        </>
      )}
    </View>
  );
}

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
    <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-end", paddingTop: 8 }}>
      <Pressable onPress={onAttach} accessibilityLabel="+" style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
        <Icon name="attach-outline" color={colors.ink} />
      </Pressable>
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
          borderRadius: 22,
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
        <Pressable onPress={onStop} accessibilityLabel={stopLabel} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center" }}>
          <Icon name="stop" color={colors.bg} size={16} />
        </Pressable>
      ) : (
        <>
          <Pressable onPress={onMic} style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
            <Icon name="mic-outline" color={colors.ink} />
          </Pressable>
          <Pressable onPress={onSend} accessibilityLabel="send" style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" }}>
            <Icon name="arrow-up" color={colors.onAccent} size={20} />
          </Pressable>
        </>
      )}
    </View>
  );
}

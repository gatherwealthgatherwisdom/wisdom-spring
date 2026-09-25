import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { useColors } from "../../shared/theme";
import { Icon, type IconName } from "../../shared/ui/Icon";

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
  onCall,
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
  onCall?: () => void;
}) {
  const colors = useColors();
  const [attachOpen, setAttachOpen] = useState(false);
  const extras: IconName[] = ["camera-outline", "image-outline", "document-text-outline"];
  return (
    <View style={{ marginTop: 8, gap: 8 }}>
      {attachOpen ? (
        <View style={{ flexDirection: "row", gap: 10, paddingLeft: 4 }}>
          {extras.map((name) => (
            <Pressable key={name} onPress={onAttach} style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" }}>
              <Icon name={name} color={colors.ink} size={18} />
            </Pressable>
          ))}
        </View>
      ) : null}
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 4, paddingLeft: 6, paddingRight: 6, paddingVertical: 6, borderRadius: 28, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card }}>
        <Pressable accessibilityLabel="+" onPress={() => setAttachOpen((open) => !open)} style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center" }}>
          <Icon name={attachOpen ? "close" : "add"} color={colors.ink} size={22} />
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
            <Pressable onPress={onCall ?? onMic} style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center" }}>
              <Icon name="call-outline" color={colors.ink} size={18} />
            </Pressable>
            <Pressable onPress={onSend} accessibilityLabel="send" style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" }}>
              <Icon name="arrow-up" color={colors.onAccent} size={18} />
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

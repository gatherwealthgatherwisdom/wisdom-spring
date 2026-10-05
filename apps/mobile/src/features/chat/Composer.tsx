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
  voice = true,
  allowPdf = true,
}: {
  value: string;
  placeholder: string;
  streaming: boolean;
  stopLabel: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  onAttach: (kind: "camera" | "library" | "file") => void;
  onMic: () => void;
  onCall?: () => void;
  voice?: boolean;
  allowPdf?: boolean;
}) {
  const colors = useColors();
  const [attachOpen, setAttachOpen] = useState(false);
  const extras: { name: IconName; kind: "camera" | "library" | "file"; label: string }[] = [
    { name: "camera-outline", kind: "camera", label: "camera" },
    { name: "image-outline", kind: "library", label: "library" },
    ...(allowPdf ? [{ name: "document-text-outline" as const, kind: "file" as const, label: "file" }] : []),
  ];
  return (
    <View style={{ marginTop: 8, gap: 8 }}>
      {attachOpen ? (
        <View style={{ flexDirection: "row", gap: 10, paddingLeft: 4 }}>
          {extras.map((item) => (
            <Pressable
              key={item.name}
              accessibilityLabel={item.label}
              onPress={() => {
                setAttachOpen(false);
                onAttach(item.kind);
              }}
              style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" }}
            >
              <Icon name={item.name} color={colors.ink} size={18} />
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
            {voice ? (
              <>
                <Pressable onPress={onMic} style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center" }}>
                  <Icon name="mic-outline" color={colors.ink} size={20} />
                </Pressable>
                <Pressable onPress={onCall ?? onMic} style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center" }}>
                  <Icon name="call-outline" color={colors.ink} size={18} />
                </Pressable>
              </>
            ) : null}
            <Pressable onPress={onSend} accessibilityLabel="send" style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" }}>
              <Icon name="arrow-up" color={colors.onAccent} size={18} />
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

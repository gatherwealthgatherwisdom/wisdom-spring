import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { copy } from "../../shared/lib/i18n";
import { usePrefs } from "../../shared/lib/prefs";
import { useColors } from "../../shared/theme";
import { Icon, type IconName } from "../../shared/ui/Icon";
import type { ComposerAction } from "./composer-action";

export function Composer({
  value,
  placeholder,
  action,
  streaming,
  stopLabel,
  onChange,
  onSend,
  onStop,
  onAction,
  onAttach,
  allowPdf = true,
}: {
  value: string;
  placeholder: string;
  action: ComposerAction;
  streaming: boolean;
  stopLabel: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  onAction: (action: ComposerAction) => void;
  onAttach: (kind: "camera" | "library" | "file") => void;
  allowPdf?: boolean;
}) {
  const colors = useColors();
  const locale = usePrefs((state) => state.locale);
  const text = copy[locale];
  const [open, setOpen] = useState(false);
  const tools: { id: ComposerAction; name: IconName; label: string }[] = [
    { id: "ask", name: "chatbubble-ellipses-outline", label: text.toolAsk },
    { id: "draw", name: "color-palette-outline", label: text.toolDraw },
    { id: "look", name: "eye-outline", label: text.toolLook },
    ...(allowPdf ? [{ id: "file" as const, name: "document-text-outline" as const, label: text.toolFile }] : []),
  ];
  const lookSources: { kind: "camera" | "library"; name: IconName; label: string }[] = [
    { kind: "camera", name: "camera-outline", label: text.camera },
    { kind: "library", name: "image-outline", label: text.library },
  ];

  return (
    <View style={{ gap: 8 }}>
      {open ? (
        <View style={{ gap: 8, paddingLeft: 4 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, flexDirection: "row", alignItems: "center" }}>
            {tools.map((item) => {
              const selected = action === item.id;
              return (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                  onPress={() => {
                    onAction(item.id);
                    if (item.id === "file") onAttach("file");
                  }}
                  style={chip(colors, selected)}
                >
                  <Icon name={item.name} color={selected ? colors.accent : colors.ink} size={16} />
                  <Text style={{ color: selected ? colors.accent : colors.ink, fontSize: 14 }}>{item.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          {action === "look" ? (
            <View style={{ flexDirection: "row", gap: 8 }}>
              {lookSources.map((item) => (
                <Pressable
                  key={item.kind}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                  onPress={() => onAttach(item.kind)}
                  style={chip(colors, false)}
                >
                  <Icon name={item.name} color={colors.ink} size={16} />
                  <Text style={{ color: colors.ink, fontSize: 14 }}>{item.label}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 4, paddingLeft: 6, paddingRight: 6, paddingVertical: 6, borderRadius: 28, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card }}>
        <Pressable accessibilityLabel="+" onPress={() => setOpen((current) => !current)} style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center" }}>
          <Icon name={open ? "close" : "add"} color={colors.ink} size={22} />
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
          <Pressable onPress={onSend} accessibilityLabel="send" style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" }}>
            <Icon name="arrow-up" color={colors.onAccent} size={18} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

function chip(colors: { card: string; line: string; accent: string }, selected: boolean) {
  return {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: selected ? 1.5 : 1,
    borderColor: selected ? colors.accent : colors.line,
    backgroundColor: colors.card,
  };
}

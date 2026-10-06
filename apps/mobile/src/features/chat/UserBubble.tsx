import { useState } from "react";
import { isPdfMime, type MessageView } from "@spring/shared";
import { Image, Pressable, Text, View } from "react-native";
import { mediaUrl } from "../../shared/lib/api";
import { copy } from "../../shared/lib/i18n";
import { usePrefs } from "../../shared/lib/prefs";
import { useColors } from "../../shared/theme";
import { Icon } from "../../shared/ui/Icon";
import { MediaLightbox } from "./MediaLightbox";

export function UserBubble({
  content,
  timeLabel,
  attachments,
  highlighted,
}: {
  content: string;
  timeLabel?: string;
  attachments?: MessageView["attachments"];
  highlighted?: boolean;
}) {
  const colors = useColors();
  const locale = usePrefs((state) => state.locale);
  const labels = copy[locale];
  const [open, setOpen] = useState<{ uri: string; mime?: string } | null>(null);
  return (
    <View style={{ alignItems: "flex-end", marginVertical: 6 }}>
      <View
        style={{
          maxWidth: "86%",
          backgroundColor: colors.user,
          borderRadius: 18,
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderWidth: highlighted ? 2 : 0,
          borderColor: highlighted ? colors.onAccent : "transparent",
        }}
      >
        {attachments && attachments.length > 0 ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: content ? 8 : 0 }}>
            {attachments.map((item) => {
              const uri = mediaUrl(item.url);
              if (!uri) return null;
              if (isPdfMime(item.mime)) {
                return (
                  <Pressable
                    key={item.id}
                    accessibilityRole="button"
                    accessibilityLabel={labels.openFile}
                    onPress={() => setOpen({ uri, mime: item.mime })}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      backgroundColor: "rgba(247,246,243,0.16)",
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      borderRadius: 12,
                    }}
                  >
                    <Icon name="document-text-outline" color={colors.userText} size={16} />
                    <Text style={{ color: colors.userText, fontSize: 13 }}>{labels.pdfFile}</Text>
                  </Pressable>
                );
              }
              return (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  accessibilityLabel={labels.enlarge}
                  onPress={() => setOpen({ uri, mime: item.mime })}
                >
                  <Image source={{ uri }} style={{ width: 96, height: 96, borderRadius: 12 }} />
                </Pressable>
              );
            })}
          </View>
        ) : null}
        {content ? <Text style={{ color: colors.userText, fontSize: 16, lineHeight: 24 }}>{content}</Text> : null}
      </View>
      {timeLabel ? <Text style={{ color: colors.muted, fontSize: 11, marginTop: 4 }}>{timeLabel}</Text> : null}
      <MediaLightbox
        uri={open?.uri ?? null}
        mime={open?.mime}
        visible={Boolean(open)}
        onClose={() => setOpen(null)}
        saveLabel={labels.saveAs}
        savedLabel={labels.saved}
        saveFailedLabel={labels.saveFailed}
        closeLabel={labels.close}
        openLabel={labels.openFile}
      />
    </View>
  );
}

import { isPdfMime, type MessageView } from "@spring/shared";
import { Image, Text, View } from "react-native";
import { mediaUrl } from "../../shared/lib/api";
import { copy } from "../../shared/lib/i18n";
import { usePrefs } from "../../shared/lib/prefs";
import { useColors } from "../../shared/theme";
import { Icon } from "../../shared/ui/Icon";

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
  const pdfLabel = copy[locale].pdfFile;
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
              if (isPdfMime(item.mime)) {
                return (
                  <View
                    key={item.id}
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
                    <Text style={{ color: colors.userText, fontSize: 13 }}>{pdfLabel}</Text>
                  </View>
                );
              }
              const uri = mediaUrl(item.url);
              if (!uri) return null;
              return <Image key={item.id} source={{ uri }} style={{ width: 96, height: 96, borderRadius: 12 }} />;
            })}
          </View>
        ) : null}
        {content ? <Text style={{ color: colors.userText, fontSize: 16, lineHeight: 24 }}>{content}</Text> : null}
      </View>
      {timeLabel ? <Text style={{ color: colors.muted, fontSize: 11, marginTop: 4 }}>{timeLabel}</Text> : null}
    </View>
  );
}

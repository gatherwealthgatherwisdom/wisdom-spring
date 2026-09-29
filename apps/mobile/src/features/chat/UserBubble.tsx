import type { MessageView } from "@spring/shared";
import { Image, Text, View } from "react-native";
import { mediaUrl } from "../../shared/lib/api";
import { useColors } from "../../shared/theme";

export function UserBubble({
  content,
  timeLabel,
  attachments,
}: {
  content: string;
  timeLabel?: string;
  attachments?: MessageView["attachments"];
}) {
  const colors = useColors();
  return (
    <View style={{ alignItems: "flex-end", marginVertical: 6 }}>
      <View style={{ maxWidth: "86%", backgroundColor: colors.user, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 }}>
        {attachments && attachments.length > 0 ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: content ? 8 : 0 }}>
            {attachments.map((item) => {
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

import * as Clipboard from "expo-clipboard";
import { useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { mediaUrl } from "../../shared/lib/api";
import { copy } from "../../shared/lib/i18n";
import { usePrefs } from "../../shared/lib/prefs";
import { saveMedia } from "../../shared/lib/save-media";
import { useColors } from "../../shared/theme";
import { Icon } from "../../shared/ui/Icon";
import { MediaLightbox } from "./MediaLightbox";
import { StreamingCursor } from "./StreamingCursor";

function action(colors: { card: string; line: string }) {
  return {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  };
}

export function ThinkingBlock({
  thinking,
  streaming,
  hasAnswer,
  label,
  nowLabel,
}: {
  thinking: string | null | undefined;
  streaming?: boolean;
  hasAnswer: boolean;
  label: string;
  nowLabel: string;
}) {
  const colors = useColors();
  const [userOpen, setUserOpen] = useState<boolean | null>(null);
  if (!thinking) return null;
  const autoOpen = Boolean(streaming) && !hasAnswer;
  const open = userOpen ?? autoOpen;
  const title = autoOpen ? nowLabel : label;
  return (
    <View style={{ marginBottom: 8 }}>
      <Pressable
        onPress={() => setUserOpen(!open)}
        accessibilityRole="button"
        accessibilityLabel={title}
        style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 4 }}
      >
        <Icon name={open ? "chevron-down-outline" : "chevron-forward-outline"} color={colors.muted} size={14} />
        <Text style={{ color: colors.muted, fontSize: 12 }}>{title}</Text>
      </Pressable>
      {open ? (
        <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 20 }}>
          {thinking}
          {streaming && !hasAnswer ? <StreamingCursor /> : null}
        </Text>
      ) : null}
    </View>
  );
}

function splitImage(content: string): { text: string; uri: string | null } {
  const match = content.match(/!\[[^\]]*\]\(([^)]+)\)/);
  if (!match?.[1]) return { text: content, uri: null };
  return { text: content.replace(match[0], "").trim(), uri: match[1] };
}

export function AssistantBubble({
  content,
  imageUrl,
  thinking,
  thinkingLabel,
  thinkingNowLabel,
  streaming,
  onRegenerate,
  regenerateLabel,
  listenLabel,
  onListen,
  copyLabel,
  timeLabel,
  feedback,
  thumbsUpLabel,
  thumbsDownLabel,
  onFeedback,
  highlighted,
}: {
  content: string;
  imageUrl?: string | null;
  thinking?: string | null;
  thinkingLabel?: string;
  thinkingNowLabel?: string;
  streaming?: boolean;
  onRegenerate?: () => void;
  regenerateLabel: string;
  listenLabel?: string;
  onListen?: () => void;
  copyLabel?: string;
  createdAt?: string;
  timeLabel?: string;
  feedback?: "up" | "down" | null;
  thumbsUpLabel?: string;
  thumbsDownLabel?: string;
  onFeedback?: (rating: "up" | "down") => void;
  highlighted?: boolean;
}) {
  const colors = useColors();
  const locale = usePrefs((state) => state.locale);
  const labels = copy[locale];
  const image = splitImage(content);
  const uri = mediaUrl(imageUrl ?? image.uri);
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function save(): Promise<void> {
    if (!uri) return;
    try {
      await saveMedia(uri);
      setNotice(labels.saved);
    } catch {
      setNotice(labels.saveFailed);
    }
  }

  return (
    <View
      style={{
        marginVertical: 8,
        maxWidth: "92%",
        borderWidth: highlighted ? 1 : 0,
        borderColor: highlighted ? colors.accent : "transparent",
        borderRadius: 16,
        padding: highlighted ? 10 : 0,
        backgroundColor: highlighted ? colors.card : "transparent",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <View style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: colors.accent, alignItems: "center", justifyContent: "center" }}>
          <Icon name="water-outline" color={colors.accent} size={16} />
        </View>
        <Text style={{ color: colors.ink, fontFamily: "Palatino", fontSize: 16 }}>智泉</Text>
        {timeLabel ? <Text style={{ color: colors.muted, fontSize: 12 }}>{timeLabel}</Text> : null}
      </View>
      <ThinkingBlock
        thinking={thinking}
        streaming={streaming}
        hasAnswer={Boolean(image.text) || Boolean(uri)}
        label={thinkingLabel ?? "思考"}
        nowLabel={thinkingNowLabel ?? "思考中"}
      />
      {uri ? (
        <Pressable accessibilityRole="button" accessibilityLabel={labels.enlarge} onPress={() => setOpen(true)}>
          <Image source={{ uri }} style={{ width: 260, height: 260, borderRadius: 12, marginBottom: 8, backgroundColor: colors.card }} />
        </Pressable>
      ) : null}
      {image.text ? (
        <Text style={{ color: colors.ink, fontSize: 16, lineHeight: 26 }}>
          {image.text}
          {streaming ? <StreamingCursor /> : null}
        </Text>
      ) : streaming && !thinking ? (
        <StreamingCursor />
      ) : null}
      {!streaming && (image.text || uri) ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 }}>
          {uri ? (
            <Pressable accessibilityLabel={labels.saveAs} onPress={() => void save()} style={action(colors)}>
              <Icon name="download-outline" color={colors.muted} size={18} />
            </Pressable>
          ) : null}
          {image.text ? (
            <Pressable accessibilityLabel={copyLabel} onPress={() => void Clipboard.setStringAsync(image.text)} style={action(colors)}>
              <Icon name="copy-outline" color={colors.muted} size={18} />
            </Pressable>
          ) : null}
          {onListen && image.text ? (
            <Pressable accessibilityLabel={listenLabel} onPress={onListen} style={action(colors)}>
              <Icon name="volume-medium-outline" color={colors.muted} size={18} />
            </Pressable>
          ) : null}
          {onRegenerate ? (
            <Pressable accessibilityLabel={regenerateLabel} onPress={onRegenerate} style={action(colors)}>
              <Icon name="refresh-outline" color={colors.muted} size={18} />
            </Pressable>
          ) : null}
          {onFeedback ? (
            <Pressable accessibilityLabel={thumbsUpLabel} onPress={() => onFeedback("up")} style={action(colors)}>
              <Icon name={feedback === "up" ? "thumbs-up" : "thumbs-up-outline"} color={feedback === "up" ? colors.accent : colors.muted} size={18} />
            </Pressable>
          ) : null}
          {onFeedback ? (
            <Pressable accessibilityLabel={thumbsDownLabel} onPress={() => onFeedback("down")} style={action(colors)}>
              <Icon name={feedback === "down" ? "thumbs-down" : "thumbs-down-outline"} color={feedback === "down" ? colors.accent : colors.muted} size={18} />
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {notice ? <Text style={{ color: colors.muted, fontSize: 12, marginTop: 6 }}>{notice}</Text> : null}
      <MediaLightbox
        uri={open ? uri : null}
        visible={open}
        onClose={() => setOpen(false)}
        saveLabel={labels.saveAs}
        savedLabel={labels.saved}
        saveFailedLabel={labels.saveFailed}
        closeLabel={labels.close}
        openLabel={labels.openFile}
      />
    </View>
  );
}

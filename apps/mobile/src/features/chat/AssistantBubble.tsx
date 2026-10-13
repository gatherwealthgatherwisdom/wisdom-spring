import { sanitizeThinking } from "@spring/shared";
import * as Clipboard from "expo-clipboard";
import { useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { mediaUrl } from "../../shared/lib/api";
import { copy } from "../../shared/lib/i18n";
import { usePrefs } from "../../shared/lib/prefs";
import { saveMedia } from "../../shared/lib/save-media";
import { useColors } from "../../shared/theme";
import { Icon, type IconName } from "../../shared/ui/Icon";
import { MarkdownBody } from "./MarkdownBody";
import { MediaLightbox } from "./MediaLightbox";
import { StreamingCursor } from "./StreamingCursor";

function ActionChip({
  label,
  icon,
  color,
  colors,
  onPress,
}: {
  label: string;
  icon: IconName;
  color: string;
  colors: { card: string; line: string };
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.line,
        backgroundColor: colors.card,
      }}
    >
      <Icon name={icon} color={color} size={16} />
      <Text style={{ color, fontSize: 12 }}>{label}</Text>
    </Pressable>
  );
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
  const cleaned = sanitizeThinking(thinking ?? "");
  if (!cleaned) return null;
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
        <View>
          <MarkdownBody source={cleaned} color={colors.muted} size={13} lineHeight={20} />
          {streaming && !hasAnswer ? <StreamingCursor /> : null}
        </View>
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
  generationKind,
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
  generationKind?: string | null;
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
        {generationKind ? <Text style={{ color: colors.accent, fontSize: 12 }}>· {generationKind}</Text> : null}
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
        <View>
          <MarkdownBody source={image.text} color={colors.ink} />
          {streaming ? <StreamingCursor /> : null}
        </View>
      ) : streaming && generationKind === "text-to-image" && !uri ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={{ color: colors.muted }}>{labels.drawingNow}</Text>
          <StreamingCursor />
        </View>
      ) : streaming && !thinking ? (
        <StreamingCursor />
      ) : null}
      {!streaming && (image.text || uri) ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6, marginTop: 10 }}>
          {uri ? (
            <ActionChip label={labels.saveAs} icon="download-outline" color={colors.muted} colors={colors} onPress={() => void save()} />
          ) : null}
          {image.text ? (
            <ActionChip label={copyLabel ?? labels.copy} icon="copy-outline" color={colors.muted} colors={colors} onPress={() => void Clipboard.setStringAsync(image.text)} />
          ) : null}
          {onListen && image.text ? (
            <ActionChip label={listenLabel ?? labels.listen} icon="volume-medium-outline" color={colors.muted} colors={colors} onPress={onListen} />
          ) : null}
          {onRegenerate ? (
            <ActionChip label={regenerateLabel} icon="refresh-outline" color={colors.muted} colors={colors} onPress={onRegenerate} />
          ) : null}
          {onFeedback ? (
            <ActionChip
              label={thumbsUpLabel ?? labels.thumbsUp}
              icon={feedback === "up" ? "thumbs-up" : "thumbs-up-outline"}
              color={feedback === "up" ? colors.accent : colors.muted}
              colors={colors}
              onPress={() => onFeedback("up")}
            />
          ) : null}
          {onFeedback ? (
            <ActionChip
              label={thumbsDownLabel ?? labels.thumbsDown}
              icon={feedback === "down" ? "thumbs-down" : "thumbs-down-outline"}
              color={feedback === "down" ? colors.accent : colors.muted}
              colors={colors}
              onPress={() => onFeedback("down")}
            />
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

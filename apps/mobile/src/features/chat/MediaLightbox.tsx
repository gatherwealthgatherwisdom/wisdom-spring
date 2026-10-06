import { useEffect, useState } from "react";
import { Image, Modal, Pressable, Text, View } from "react-native";
import { isPdfMime } from "@spring/shared";
import { openMedia, saveMedia } from "../../shared/lib/save-media";
import { useColors } from "../../shared/theme";
import { Icon } from "../../shared/ui/Icon";
import { useHostInsets } from "../../shared/ui/hostInsets";

export function MediaLightbox({
  uri,
  mime,
  visible,
  onClose,
  saveLabel,
  savedLabel,
  saveFailedLabel,
  closeLabel,
  openLabel,
}: {
  uri: string | null;
  mime?: string;
  visible: boolean;
  onClose: () => void;
  saveLabel: string;
  savedLabel: string;
  saveFailedLabel: string;
  closeLabel: string;
  openLabel: string;
}) {
  const colors = useColors();
  const insets = useHostInsets();
  const [notice, setNotice] = useState<string | null>(null);
  const pdf = Boolean((mime && isPdfMime(mime)) || /\.pdf(?:\?|$)/i.test(uri ?? ""));

  useEffect(() => {
    if (!visible) setNotice(null);
  }, [visible, uri]);

  async function save(): Promise<void> {
    if (!uri) return;
    try {
      await saveMedia(uri, mime);
      setNotice(savedLabel);
    } catch {
      setNotice(saveFailedLabel);
    }
  }

  async function open(): Promise<void> {
    if (!uri) return;
    try {
      await openMedia(uri);
    } catch {
      setNotice(saveFailedLabel);
    }
  }

  return (
    <Modal visible={visible && Boolean(uri)} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: "rgba(28,27,25,0.88)" }}>
        <View
          style={{
            position: "absolute",
            top: insets.top,
            left: 12,
            right: 12,
            zIndex: 2,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 8,
          }}
        >
          {pdf ? (
            <Pressable
              accessibilityLabel={openLabel}
              onPress={() => void open()}
              style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" }}
            >
              <Icon name="open-outline" color={colors.ink} size={20} />
            </Pressable>
          ) : null}
          <Pressable
            accessibilityLabel={saveLabel}
            onPress={() => void save()}
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" }}
          >
            <Icon name="download-outline" color={colors.ink} size={20} />
          </Pressable>
          <Pressable
            accessibilityLabel={closeLabel}
            onPress={onClose}
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" }}
          >
            <Icon name="close-outline" color={colors.ink} size={22} />
          </Pressable>
        </View>
        <Pressable style={{ flex: 1, justifyContent: "center", paddingHorizontal: 12, paddingTop: insets.top + 48, paddingBottom: insets.bottom + 24 }} onPress={onClose}>
          {pdf ? (
            <Pressable
              onPress={() => void open()}
              style={{ alignSelf: "center", backgroundColor: colors.card, borderRadius: 16, padding: 24, alignItems: "center", gap: 10 }}
            >
              <Icon name="document-text-outline" color={colors.ink} size={40} />
              <Text style={{ color: colors.ink }}>{openLabel}</Text>
            </Pressable>
          ) : uri ? (
            <Pressable onPress={(event) => event.stopPropagation()} style={{ flex: 1 }}>
              <Image source={{ uri }} style={{ width: "100%", height: "100%" }} resizeMode="contain" />
            </Pressable>
          ) : null}
        </Pressable>
        {notice ? (
          <Text style={{ position: "absolute", bottom: insets.bottom + 16, alignSelf: "center", color: colors.bg, fontSize: 13 }}>{notice}</Text>
        ) : null}
      </View>
    </Modal>
  );
}

import { useQuery } from "@tanstack/react-query";
import { Pressable, Text, View } from "react-native";
import { navigationRef } from "../../navigation/ref";
import { spring } from "../../shared/lib/api";
import { copy } from "../../shared/lib/i18n";
import { INBOX_QUERY } from "../../shared/lib/otp-prompt";
import { usePrefs } from "../../shared/lib/prefs";
import { useColors } from "../../shared/theme";
import { Icon } from "../../shared/ui/Icon";

export function NoticesBell() {
  const colors = useColors();
  const locale = usePrefs((state) => state.locale);
  const text = copy[locale];
  const signedIn = usePrefs((state) => Boolean(state.accessToken));
  const inbox = useQuery({
    queryKey: INBOX_QUERY,
    queryFn: () => spring.inbox(),
    enabled: signedIn,
    staleTime: 15_000,
  });
  const unread = signedIn ? (inbox.data?.unreadCount ?? 0) : 0;
  const badge = unread > 9 ? "9+" : String(unread);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={text.messages}
      onPress={() => {
        if (navigationRef.isReady()) navigationRef.navigate("Notices");
      }}
      style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}
    >
      <Icon name={unread > 0 ? "notifications" : "notifications-outline"} color={colors.ink} size={24} />
      {unread > 0 ? (
        <View
          style={{
            position: "absolute",
            top: 6,
            right: 6,
            minWidth: 16,
            height: 16,
            borderRadius: 8,
            backgroundColor: colors.danger,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 3,
          }}
        >
          <Text style={{ color: "#F7F6F3", fontSize: 9, fontWeight: "700" }}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

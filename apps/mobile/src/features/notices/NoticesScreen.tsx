import type { InboxNoticeView } from "@spring/shared";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import type { AppStackParamList } from "../../navigation/types";
import { spring } from "../../shared/lib/api";
import { copy } from "../../shared/lib/i18n";
import { INBOX_QUERY, otpCodeOf, useOtpPrompt } from "../../shared/lib/otp-prompt";
import { usePrefs } from "../../shared/lib/prefs";
import { formatWhen } from "../../shared/lib/time";
import { useColors } from "../../shared/theme";
import { Screen } from "../../shared/ui/Screen";
import { ScreenHeader } from "../../shared/ui/ScreenHeader";

type Props = NativeStackScreenProps<AppStackParamList, "Notices">;

export function NoticesScreen({ navigation }: Props) {
  const colors = useColors();
  const locale = usePrefs((state) => state.locale);
  const text = copy[locale];
  const signedIn = usePrefs((state) => Boolean(state.accessToken));
  const queryClient = useQueryClient();
  const inbox = useQuery({
    queryKey: INBOX_QUERY,
    queryFn: () => spring.inbox({ limit: "50" }),
    enabled: signedIn,
  });

  const openItem = useCallback(
    async (item: InboxNoticeView) => {
      const code = otpCodeOf(item);
      if (signedIn) {
        try {
          await spring.readInbox(item.id);
          await queryClient.invalidateQueries({ queryKey: INBOX_QUERY });
        } catch {
          // Keep the row tappable even if mark-read fails.
        }
      }
      if (item.kind === "otp" && code) {
        useOtpPrompt.getState().show(code, item.id);
        return;
      }
      const conversationId =
        typeof item.data?.conversationId === "string" ? item.data.conversationId : undefined;
      if (item.kind === "generation_done" && conversationId) {
        navigation.navigate("Chat", { conversationId });
        return;
      }
      if (item.kind === "quota_low" || item.kind === "quota_exhausted" || item.kind === "monthly_cost") {
        navigation.navigate("Main", { screen: "Settings" });
      }
    },
    [navigation, queryClient, signedIn],
  );

  return (
    <Screen>
      <ScreenHeader title={text.messages} onBack={() => navigation.goBack()} />
      {!signedIn ? (
        <View style={{ padding: 20 }}>
          <Text style={{ color: colors.muted, lineHeight: 22 }}>{text.signInForNotices}</Text>
        </View>
      ) : (
        <FlatList
          data={inbox.data?.items ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32, flexGrow: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={inbox.isRefetching && !inbox.isLoading}
              onRefresh={() => void inbox.refetch()}
              tintColor={colors.accent}
            />
          }
          ListEmptyComponent={
            <Text style={{ color: colors.muted, paddingTop: 24 }}>{inbox.isLoading ? "" : text.emptyNotices}</Text>
          }
          renderItem={({ item }) => {
            const unread = item.readAt == null;
            return (
              <Pressable
                onPress={() => void openItem(item)}
                style={{
                  backgroundColor: colors.card,
                  borderWidth: 1,
                  borderColor: unread ? colors.accent : colors.line,
                  borderRadius: 14,
                  padding: 14,
                  marginBottom: 10,
                  flexDirection: "row",
                  gap: 10,
                }}
              >
                {unread ? (
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.danger, marginTop: 6 }} />
                ) : (
                  <View style={{ width: 8 }} />
                )}
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.ink, fontSize: 16, fontWeight: unread ? "600" : "400" }}>{item.title}</Text>
                  <Text style={{ color: colors.muted, marginTop: 4, lineHeight: 20 }} numberOfLines={2}>
                    {item.body}
                  </Text>
                  <Text style={{ color: colors.muted, marginTop: 8, fontSize: 12 }}>{formatWhen(item.createdAt, locale)}</Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </Screen>
  );
}

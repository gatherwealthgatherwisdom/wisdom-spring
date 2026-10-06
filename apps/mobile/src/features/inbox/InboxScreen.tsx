import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { KeyboardDock } from "../../shared/ui/KeyboardDock";
import { Screen } from "../../shared/ui/Screen";
import { aidesFromCatalog, cardsFromDiscover, toolsFromCatalog } from "../discover/catalog";
import { PoolSheet } from "../discover/PoolSheet";
import { DrawerMenu } from "./DrawerMenu";
import { openAuth, openChat, type MainTabParamList } from "../../navigation/MainTabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { AppStackParamList } from "../../navigation/RootNavigation";
import { spring } from "../../shared/lib/api";
import { useHistory } from "../../shared/lib/history";
import { copy } from "../../shared/lib/i18n";
import { usePrefs } from "../../shared/lib/prefs";
import { useColors } from "../../shared/theme";
import { Cover } from "../../shared/ui/Cover";
import { Icon } from "../../shared/ui/Icon";
import { Composer } from "../chat/Composer";
import { placeholderFor, turnModeFor, type ComposerAction } from "../chat/composer-action";

type Props = BottomTabScreenProps<MainTabParamList, "Inbox">;

export function InboxScreen({ navigation }: Props) {
  const colors = useColors();
  const locale = usePrefs((state) => state.locale);
  const text = copy[locale];
  const signedIn = usePrefs((state) => Boolean(state.accessToken));
  const user = usePrefs((state) => state.user);
  const stack = navigation.getParent<NativeStackNavigationProp<AppStackParamList>>();
  const { lastActive: last } = useHistory();
  useQuery({ queryKey: ["flags"], queryFn: () => spring.flags() });
  const notices = useQuery({ queryKey: ["announcements"], queryFn: () => spring.announcements() });
  const catalogTools = useQuery({ queryKey: ["catalog-tools"], queryFn: () => spring.catalogTools() });
  const catalogAides = useQuery({ queryKey: ["catalog-aides"], queryFn: () => spring.catalogAides() });
  const catalogDiscover = useQuery({ queryKey: ["catalog-discover"], queryFn: () => spring.catalogDiscover() });
  const bots = aidesFromCatalog(catalogAides.data?.items);
  const inboxHero = cardsFromDiscover(catalogDiscover.data?.items, "hero")[0];
  const draws = cardsFromDiscover(catalogDiscover.data?.items, "draw");
  const dismissedAnnouncementId = usePrefs((state) => state.dismissedAnnouncementId);
  const setDismissedAnnouncementId = usePrefs((state) => state.setDismissedAnnouncementId);
  const initial = user?.displayName?.trim().charAt(0) ?? "";
  const latest = notices.data?.items[0];
  const banner = latest && latest.id !== dismissedAnnouncementId ? latest : undefined;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [poolOpen, setPoolOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [action, setAction] = useState<ComposerAction>("ask");
  const [hint, setHint] = useState<string | null>(null);
  const homeTools = toolsFromCatalog(catalogTools.data?.items).filter((tool) => tool.page === 0).slice(0, 4);

  function sendHome() {
    if (action === "look") {
      setHint(text.needPhoto);
      return;
    }
    if (action === "file") {
      setHint(text.needFile);
      return;
    }
    const seed = draft.trim();
    const mode = turnModeFor(action, "chat");
    setDraft("");
    setHint(null);
    openChat(navigation, {
      mode,
      ...(seed ? { seed } : {}),
      ...(mode === "image" ? { imageStyle: "ink" } : {}),
    });
  }

  return (
    <Screen edges={["top"]}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 4 }}>
        <Pressable accessibilityLabel={text.chatsMenu} onPress={() => setDrawerOpen(true)} style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
          <Icon name="menu-outline" color={colors.ink} size={26} />
        </Pressable>
        <Pressable
          accessibilityLabel={signedIn ? text.mine : text.login}
          onPress={() => {
            if (signedIn) navigation.navigate("Settings");
            else openAuth(navigation);
          }}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: signedIn ? colors.accent : colors.line, alignItems: "center", justifyContent: "center" }}
        >
          {signedIn && initial ? (
            <Text style={{ color: colors.ink, fontSize: 15 }}>{initial}</Text>
          ) : (
            <Icon name="person-outline" color={colors.ink} size={18} />
          )}
        </Pressable>
      </View>
      <View style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16 }}>
        {banner ? (
          <View style={{ flexDirection: "row", alignItems: "stretch", backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 14, marginBottom: 14, overflow: "hidden" }}>
            <View style={{ width: 4, backgroundColor: colors.accent }} />
            <Text style={{ flex: 1, color: colors.ink, paddingVertical: 12, paddingHorizontal: 12, lineHeight: 22 }}>
              {locale === "en" ? banner.bodyEn : banner.bodyZh}
            </Text>
            <Pressable
              accessibilityLabel={text.dismissBanner}
              onPress={() => setDismissedAnnouncementId(banner.id)}
              style={{ width: 40, alignItems: "center", justifyContent: "center" }}
            >
              <Icon name="close" color={colors.muted} size={18} />
            </Pressable>
          </View>
        ) : null}
        {inboxHero ? (
        <Cover source={inboxHero.art} style={{ borderRadius: 16, minHeight: 124, marginBottom: 14 }} dim={0.42}>
          <Pressable
            onPress={() => {
              if (inboxHero.toolId) stack?.navigate("Tool", { id: inboxHero.toolId });
              else navigation.navigate("Discover");
            }}
            style={{ minHeight: 124, padding: 16, justifyContent: "space-between" }}
          >
            <Text style={{ color: colors.bg, fontSize: 18, lineHeight: 26 }}>{locale === "en" ? inboxHero.en : inboxHero.zh}</Text>
            <View style={{ alignSelf: "flex-start", backgroundColor: colors.card, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, marginTop: 12 }}>
              <Text style={{ color: colors.ink }}>{text.explore}</Text>
            </View>
          </Pressable>
        </Cover>
        ) : null}
        <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 14 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 14 }}>
            <Text style={{ color: colors.ink, fontSize: 18 }}>{text.tools}</Text>
            <Pressable onPress={() => stack?.navigate("AllTools")}><Text style={{ color: colors.muted }}>{text.viewAll}</Text></Pressable>
          </View>
          <View style={{ flexDirection: "row" }}>
            {homeTools.map((tool) => (
              <Pressable key={tool.id} onPress={() => stack?.navigate("Tool", { id: tool.id })} style={{ flex: 1, alignItems: "center", gap: 8 }}>
                <Icon name={tool.icon} color={colors.accent} size={26} />
                <Text style={{ color: colors.ink, fontSize: 12, textAlign: "center" }}>{locale === "en" ? tool.en : tool.zh}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <View style={{ marginBottom: 14 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
            <Text style={{ color: colors.ink, fontSize: 18 }}>{text.image}</Text>
            <Pressable onPress={() => navigation.navigate("Image")}><Text style={{ color: colors.muted }}>{text.viewAll}</Text></Pressable>
          </View>
          <View style={{ flexDirection: "row", gap: 10 }}>
            {draws.map((card) => (
              <Cover key={card.id} source={card.art} style={{ flex: 1, minHeight: 132, borderRadius: 16 }} dim={0.18}>
                <Pressable onPress={() => openChat(navigation, { mode: card.mode ?? "image", imageStyle: card.imageStyle ?? "ink" })} style={{ minHeight: 132, padding: 12, justifyContent: "flex-end" }}>
                  <View style={{ alignSelf: "flex-end", backgroundColor: colors.accent, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, marginBottom: 8 }}>
                    <Text style={{ color: colors.onAccent, fontSize: 11 }}>New</Text>
                  </View>
                  <Text style={{ color: "#F7F6F3" }}>{locale === "en" ? card.en : card.zh}</Text>
                </Pressable>
              </Cover>
            ))}
          </View>
        </View>
        <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 4 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
            <Text style={{ color: colors.ink, fontSize: 18 }}>{text.bots}</Text>
            <Pressable onPress={() => stack?.navigate("AllBots")}><Text style={{ color: colors.muted }}>{text.viewAll}</Text></Pressable>
          </View>
          {bots.map((bot) => (
            <Pressable
              key={bot.id}
              onPress={() =>
                stack?.navigate("Chat", {
                  mode: "chat",
                  templateId: bot.id,
                  seed: locale === "en" ? bot.blurbEn : bot.blurbZh,
                })
              }
              style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 }}
            >
              <Cover source={bot.art} style={{ width: 48, height: 48, borderRadius: 24 }} dim={0} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.ink }}>{locale === "en" ? bot.en : bot.zh}</Text>
                <Text style={{ color: colors.muted, marginTop: 2 }} numberOfLines={2}>{locale === "en" ? bot.blurbEn : bot.blurbZh}</Text>
              </View>
              <Icon name="chevron-forward" color={colors.line} size={18} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
      <KeyboardDock tabBar>
      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 6, gap: 8, backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.line }}>
        {hint ? <Text style={{ color: colors.ink }}>{hint}</Text> : null}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {last ? (
            <Pressable onPress={() => openChat(navigation, { conversationId: last.id, mode: last.mode })} style={chip(colors)}>
              <Icon name="time-outline" color={colors.ink} size={16} />
              <Text style={{ color: colors.ink }} numberOfLines={1}>{last.title || text.lastChat}</Text>
            </Pressable>
          ) : null}
          <Pressable onPress={() => setPoolOpen(true)} style={chip(colors)}>
            <Text style={{ color: colors.ink }}>{text.app}</Text>
          </Pressable>
        </ScrollView>
        <Composer
          value={draft}
          placeholder={placeholderFor(text, action)}
          action={action}
          streaming={false}
          stopLabel={text.stop}
          onChange={setDraft}
          onSend={sendHome}
          onStop={() => undefined}
          onAction={(next) => {
            setAction(next);
            setHint(null);
          }}
          onAttach={(kind) => {
            setHint(null);
            openChat(navigation, { mode: "chat", attach: kind });
          }}
          onMic={() => openChat(navigation, { mode: turnModeFor(action, "chat"), ...(turnModeFor(action, "chat") === "image" ? { imageStyle: "ink" } : {}) })}
          onCall={() => openChat(navigation, { mode: turnModeFor(action, "chat") })}
        />
      </View>
      </KeyboardDock>
      </View>
      <DrawerMenu open={drawerOpen} onClose={() => setDrawerOpen(false)} navigation={navigation} />
      <PoolSheet open={poolOpen} onClose={() => setPoolOpen(false)} />
    </Screen>
  );
}

function chip(colors: { card: string; line: string }) {
  return {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  };
}

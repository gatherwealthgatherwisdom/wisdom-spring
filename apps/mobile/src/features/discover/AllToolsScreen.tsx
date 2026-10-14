import { blurbFor, labelFor, toolsByGroup, type ToolGroup } from "@spring/shared";
import { useQuery } from "@tanstack/react-query";
import { Pressable, ScrollView, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AppStackParamList } from "../../navigation/RootNavigation";
import { spring } from "../../shared/lib/api";
import { copy } from "../../shared/lib/i18n";
import { usePrefs } from "../../shared/lib/prefs";
import { useColors } from "../../shared/theme";
import { Icon } from "../../shared/ui/Icon";
import { Screen } from "../../shared/ui/Screen";
import { ScreenHeader } from "../../shared/ui/ScreenHeader";
import { openCatalogTool } from "../../navigation/open";
import { toolsFromCatalog } from "./catalog";

type Props = NativeStackScreenProps<AppStackParamList, "AllTools">;

export function AllToolsScreen({ navigation }: Props) {
  const colors = useColors();
  const locale = usePrefs((state) => state.locale);
  const text = copy[locale];
  const catalog = useQuery({ queryKey: ["catalog-tools"], queryFn: () => spring.catalogTools() });
  const grouped = toolsByGroup(toolsFromCatalog(catalog.data?.items));
  const titles: Record<ToolGroup, string> = {
    write: text.toolsWrite,
    chat: text.toolsChat,
    file: text.toolsFile,
    translate: text.toolsTranslate,
  };
  return (
    <Screen>
      <ScreenHeader title={text.tools} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}>
        {grouped.map((section) => (
          <View key={section.group} style={{ marginBottom: 16 }}>
            <Text style={{ color: colors.muted, marginBottom: 8 }}>{titles[section.group]}</Text>
            <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 16, overflow: "hidden" }}>
              {section.tools.map((tool, index) => (
                <Pressable
                  key={tool.id}
                  accessibilityRole="button"
                  accessibilityLabel={labelFor(tool, locale)}
                  onPress={() => openCatalogTool(navigation, tool.id)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 14,
                    borderBottomWidth: index === section.tools.length - 1 ? 0 : 1,
                    borderBottomColor: colors.line,
                  }}
                >
                  <Icon name={tool.icon} color={colors.accent} size={22} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.ink, fontSize: 16 }}>{labelFor(tool, locale)}</Text>
                    <Text style={{ color: colors.muted, marginTop: 2, fontSize: 13 }} numberOfLines={2}>
                      {blurbFor(tool, locale)}
                    </Text>
                  </View>
                  <Icon name="chevron-forward" color={colors.line} size={18} />
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}

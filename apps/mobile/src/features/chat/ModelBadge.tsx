import { Text, View } from "react-native";
import { shortModelName } from "../../shared/lib/api";
import { useColors } from "../../shared/theme";

export function ModelBadge({
  requestedModel,
  servedModel,
  fallbackUsed,
}: {
  requestedModel: string | null;
  servedModel: string | null;
  fallbackUsed: boolean;
}) {
  const colors = useColors();
  const name = shortModelName(fallbackUsed ? servedModel : requestedModel || servedModel);
  if (!name) return null;
  return (
    <View style={{ marginBottom: 6 }}>
      <Text style={{ color: colors.gold, fontSize: 12 }}>智泉 · {name}</Text>
      {fallbackUsed && servedModel ? (
        <Text style={{ color: colors.muted, fontSize: 12 }}>改用 {shortModelName(servedModel)}</Text>
      ) : null}
    </View>
  );
}

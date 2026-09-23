import { useEffect, useState } from "react";
import { Text } from "react-native";
import { useColors } from "../../shared/theme";

export function StreamingCursor() {
  const colors = useColors();
  const [on, setOn] = useState(true);
  useEffect(() => {
    const timer = setInterval(() => setOn((value) => !value), 500);
    return () => clearInterval(timer);
  }, []);
  return <Text style={{ color: colors.gold, opacity: on ? 1 : 0.2 }}> ▍</Text>;
}

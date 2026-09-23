import { createContext, useContext } from "react";
import { useColorScheme } from "react-native";
import { usePrefs } from "../lib/prefs";

export interface Palette {
  bg: string;
  ink: string;
  card: string;
  violet: string;
  gold: string;
  line: string;
  muted: string;
  user: string;
  userText: string;
  danger: string;
}

export const light: Palette = {
  bg: "#F6F1E8",
  ink: "#1B1424",
  card: "#FFF9F1",
  violet: "#5B3A7A",
  gold: "#C4A35A",
  line: "#E4D9C8",
  muted: "#6D6278",
  user: "#5B3A7A",
  userText: "#F6F1E8",
  danger: "#8C3A3A",
};

export const dark: Palette = {
  bg: "#1B1424",
  ink: "#F6F1E8",
  card: "#2A2233",
  violet: "#C4A35A",
  gold: "#C4A35A",
  line: "#3D3348",
  muted: "#C8B8A4",
  user: "#5B3A7A",
  userText: "#F6F1E8",
  danger: "#E7B2B2",
};

const ThemeContext = createContext(light);

export function useColors(): Palette {
  return useContext(ThemeContext);
}

export function usePalette(): Palette {
  const scheme = useColorScheme();
  const appearance = usePrefs((state) => state.appearance);
  const mode = appearance === "system" ? (scheme === "dark" ? "dark" : "light") : appearance;
  return mode === "dark" ? dark : light;
}

export const ThemeProvider = ThemeContext.Provider;

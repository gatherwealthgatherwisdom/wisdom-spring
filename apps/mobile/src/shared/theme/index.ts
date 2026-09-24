import { createContext, useContext } from "react";
import { useColorScheme } from "react-native";
import { usePrefs } from "../lib/prefs";

export interface Palette {
  bg: string;
  ink: string;
  card: string;
  accent: string;
  onAccent: string;
  violet: string;
  gold: string;
  line: string;
  muted: string;
  user: string;
  userText: string;
  danger: string;
}

export const light: Palette = {
  bg: "#F7F6F3",
  ink: "#1C1B19",
  card: "#FFFFFF",
  accent: "#1F6B4A",
  onAccent: "#F7F6F3",
  violet: "#1F6B4A",
  gold: "#1F6B4A",
  line: "#E4E1DA",
  muted: "#6F6B64",
  user: "#1F6B4A",
  userText: "#F7F6F3",
  danger: "#8C3A32",
};

export const dark: Palette = {
  bg: "#141311",
  ink: "#F4F1EB",
  card: "#211F1C",
  accent: "#3D9B6E",
  onAccent: "#F7F6F3",
  violet: "#3D9B6E",
  gold: "#3D9B6E",
  line: "#34312C",
  muted: "#A39E96",
  user: "#1F6B4A",
  userText: "#F7F6F3",
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

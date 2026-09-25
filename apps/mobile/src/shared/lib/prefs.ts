import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AuthResponse, UserPublic } from "@spring/shared";
import { create } from "zustand";

const KEY = "spring.mobile.session";

export type Appearance = "light" | "dark" | "system";

interface Persisted {
  accessToken: string | null;
  refreshToken: string | null;
  user: UserPublic | null;
  appearance: Appearance;
  locale: "zh-HK" | "en";
  speakNotify: boolean;
}

interface Prefs extends Persisted {
  ready: boolean;
  hydrate: () => Promise<void>;
  setSession: (session: AuthResponse) => void;
  applyTokens: (tokens: { accessToken: string | null; refreshToken: string | null }) => void;
  setUser: (user: UserPublic) => void;
  setAppearance: (appearance: Appearance) => void;
  setLocale: (locale: "zh-HK" | "en") => void;
  setSpeakNotify: (speakNotify: boolean) => void;
  clear: () => void;
}

const empty: Persisted = {
  accessToken: null,
  refreshToken: null,
  user: null,
  appearance: "system",
  locale: "zh-HK",
  speakNotify: true,
};

async function save(state: Persisted): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(state));
}

export const usePrefs = create<Prefs>((set, get) => ({
  ...empty,
  ready: false,
  async hydrate() {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) set({ ...empty, ...(JSON.parse(raw) as Persisted), ready: true });
      else set({ ready: true });
    } catch {
      set({ ready: true });
    }
  },
  setSession(session) {
    const next = {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      user: session.user,
    };
    set(next);
    void save({ ...get(), ...next });
  },
  applyTokens(tokens) {
    set(tokens);
    void save({ ...get(), ...tokens });
  },
  setUser(user) {
    set({ user, locale: user.locale === "en" ? "en" : "zh-HK" });
    void save(get());
  },
  setAppearance(appearance) {
    set({ appearance });
    void save(get());
  },
  setLocale(locale) {
    set({ locale });
    void save(get());
  },
  setSpeakNotify(speakNotify) {
    set({ speakNotify });
    void save(get());
  },
  clear() {
    set({ ...empty, ready: true });
    void AsyncStorage.removeItem(KEY);
  },
}));

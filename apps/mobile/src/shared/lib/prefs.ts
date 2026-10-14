import AsyncStorage from "@react-native-async-storage/async-storage";
import { parseAppLocale, type AppLocale, type AuthResponse, type UserPublic } from "@spring/shared";
import { create } from "zustand";

const KEY = "spring.mobile.session";

export type Appearance = "light" | "dark" | "system";

interface Persisted {
  accessToken: string | null;
  refreshToken: string | null;
  user: UserPublic | null;
  appearance: Appearance;
  locale: AppLocale;
  speakNotify: boolean;
  dismissedAnnouncementId: string | null;
  pushToken: string | null;
}

interface Prefs extends Persisted {
  ready: boolean;
  hydrate: () => Promise<void>;
  setSession: (session: AuthResponse) => void;
  applyTokens: (tokens: { accessToken: string | null; refreshToken: string | null }) => void;
  setUser: (user: UserPublic) => void;
  setAppearance: (appearance: Appearance) => void;
  setLocale: (locale: AppLocale) => void;
  setSpeakNotify: (speakNotify: boolean) => void;
  setDismissedAnnouncementId: (id: string | null) => void;
  setPushToken: (pushToken: string | null) => void;
  clear: () => void;
}

const empty: Persisted = {
  accessToken: null,
  refreshToken: null,
  user: null,
  appearance: "system",
  locale: "zh-HK",
  speakNotify: true,
  dismissedAnnouncementId: null,
  pushToken: null,
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
      if (raw) {
        const parsed = JSON.parse(raw) as Persisted;
        set({ ...empty, ...parsed, locale: parseAppLocale(parsed.locale), ready: true });
      } else set({ ready: true });
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
    set({ user, locale: parseAppLocale(user.locale) });
    void save(get());
  },
  setAppearance(appearance) {
    set({ appearance });
    void save(get());
  },
  setLocale(locale) {
    set({ locale: parseAppLocale(locale) });
    void save(get());
  },
  setSpeakNotify(speakNotify) {
    set({ speakNotify });
    void save(get());
  },
  setPushToken(pushToken) {
    set({ pushToken });
    void save(get());
  },
  setDismissedAnnouncementId(id) {
    set({ dismissedAnnouncementId: id });
    void save(get());
  },
  clear() {
    set({ ...empty, ready: true });
    void AsyncStorage.removeItem(KEY);
  },
}));

import type { AppLocale } from "@spring/shared";
import * as Speech from "expo-speech";

interface Recognition {
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
}

type RecognitionCtor = new () => Recognition;

function recognitionCtor(): RecognitionCtor | null {
  const host = globalThis as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return host.SpeechRecognition ?? host.webkitSpeechRecognition ?? null;
}

function speechLang(locale: AppLocale): string {
  if (locale === "en") return "en-US";
  if (locale === "zh-CN") return "zh-CN";
  return "zh-HK";
}

export function speak(text: string, locale: AppLocale): void {
  const spoken = text.replace(/!\[[^\]]*\]\([^)]+\)/g, "").trim();
  if (!spoken) return;
  Speech.stop();
  Speech.speak(spoken, { language: speechLang(locale) });
}

export function startDictation(
  locale: AppLocale,
  onText: (value: string) => void,
): { stop: () => void } | null {
  const Ctor = recognitionCtor();
  if (!Ctor) return null;
  const recognition = new Ctor();
  recognition.lang = speechLang(locale);
  recognition.onresult = (event) => {
    const transcript = event.results[0]?.[0]?.transcript;
    if (transcript) onText(transcript);
  };
  recognition.onerror = () => undefined;
  recognition.start();
  return { stop: () => recognition.stop() };
}

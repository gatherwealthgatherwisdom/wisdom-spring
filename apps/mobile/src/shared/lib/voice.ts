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

export function speak(text: string, locale: "zh-HK" | "en"): void {
  const spoken = text.replace(/!\[[^\]]*\]\([^)]+\)/g, "").trim();
  if (!spoken) return;
  Speech.stop();
  Speech.speak(spoken, { language: locale === "en" ? "en-US" : "zh-HK" });
}

export function startDictation(
  locale: "zh-HK" | "en",
  onText: (value: string) => void,
): { stop: () => void } | null {
  const Ctor = recognitionCtor();
  if (!Ctor) return null;
  const recognition = new Ctor();
  recognition.lang = locale === "en" ? "en-US" : "zh-HK";
  recognition.onresult = (event) => {
    const transcript = event.results[0]?.[0]?.transcript;
    if (transcript) onText(transcript);
  };
  recognition.onerror = () => undefined;
  recognition.start();
  return { stop: () => recognition.stop() };
}

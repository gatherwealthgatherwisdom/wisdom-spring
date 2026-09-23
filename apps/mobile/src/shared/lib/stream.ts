import { create } from "zustand";

interface StreamState {
  conversationId: string | null;
  messageId: string | null;
  text: string;
  requestedModel: string | null;
  servedModel: string | null;
  fallbackUsed: boolean;
  status: "idle" | "streaming" | "error";
  error: string | null;
  controller: AbortController | null;
  begin: (controller: AbortController) => void;
  meta: (conversationId: string, messageId: string, requestedModel: string) => void;
  delta: (text: string) => void;
  done: (servedModel: string, fallbackUsed: boolean) => void;
  fail: (message: string) => void;
  reset: () => void;
}

export const useStream = create<StreamState>((set, get) => ({
  conversationId: null,
  messageId: null,
  text: "",
  requestedModel: null,
  servedModel: null,
  fallbackUsed: false,
  status: "idle",
  error: null,
  controller: null,
  begin(controller) {
    get().controller?.abort();
    set({
      controller,
      text: "",
      requestedModel: null,
      servedModel: null,
      fallbackUsed: false,
      status: "streaming",
      error: null,
      messageId: null,
    });
  },
  meta(conversationId, messageId, requestedModel) {
    set({ conversationId, messageId, requestedModel });
  },
  delta(text) {
    set({ text: get().text + text });
  },
  done(servedModel, fallbackUsed) {
    set({ servedModel, fallbackUsed, status: "idle", controller: null });
  },
  fail(message) {
    set({ status: "error", error: message, controller: null });
  },
  reset() {
    get().controller?.abort();
    set({
      conversationId: null,
      messageId: null,
      text: "",
      requestedModel: null,
      servedModel: null,
      fallbackUsed: false,
      status: "idle",
      error: null,
      controller: null,
    });
  },
}));

export interface ChatTurn {
  role: "system" | "user" | "assistant";
  content: string;
}

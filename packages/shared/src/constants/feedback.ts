export const FEEDBACK_RATINGS = ["up", "down"] as const;
export type FeedbackRating = (typeof FEEDBACK_RATINGS)[number];

export const FEEDBACK_ONLY_ASSISTANT_COPY = "只有助手回覆可以讚或踩。";

export function ratingOf(value: unknown): FeedbackRating | null {
  return value === "up" || value === "down" ? value : null;
}

export const FEEDBACK_RATINGS = ["up", "down"] as const;
export type FeedbackRating = (typeof FEEDBACK_RATINGS)[number];

export const FEEDBACK_ONLY_ASSISTANT_COPY = "只有助手回覆可以讚或踩。";
export const POOL_WEIGHT_MIN = 1;
export const POOL_WEIGHT_MAX = 10_000;

export function ratingOf(value: unknown): FeedbackRating | null {
  return value === "up" || value === "down" ? value : null;
}

export function feedbackScore(rating: FeedbackRating | null): number {
  if (rating === "up") return 1;
  if (rating === "down") return -1;
  return 0;
}

export function feedbackWeightDelta(from: FeedbackRating | null, to: FeedbackRating | null): number {
  return feedbackScore(to) - feedbackScore(from);
}

export function clampPoolWeight(weight: number): number {
  return Math.min(POOL_WEIGHT_MAX, Math.max(POOL_WEIGHT_MIN, Math.trunc(weight)));
}

import type { ModelPick, PickerCandidate, PickInput } from "@spring/domain";
import {
  AppError,
  ErrorCode,
  LIMITS,
  ModelCapability,
  ModelHealthStatus,
  ModelRegionStatus,
  limitsFor,
  planRank,
} from "@spring/shared";

export function isEligible(row: PickerCandidate, input: PickInput): boolean {
  if (!row.enabled) return false;
  if (row.regionStatus !== ModelRegionStatus.HK_SAFE) return false;
  if (row.healthStatus !== ModelHealthStatus.HEALTHY && row.healthStatus !== ModelHealthStatus.DEGRADED) {
    return false;
  }
  if (planRank(row.minPlanTier) > planRank(input.planTier)) return false;
  if (input.capability === ModelCapability.VISION && !row.supportsVision) return false;
  if (input.capability === ModelCapability.TEXT && !row.supportsText) return false;

  const limits = limitsFor(input.planTier);
  if (limits.maxPromptUsdMicrosPerMillion !== null && limits.maxCompletionUsdMicrosPerMillion !== null) {
    const free = row.isFreeRoute || row.slug.endsWith(":free");
    const cheap =
      row.promptUsdMicrosPerMillion <= limits.maxPromptUsdMicrosPerMillion &&
      row.completionUsdMicrosPerMillion <= limits.maxCompletionUsdMicrosPerMillion;
    if (!free && !cheap) return false;
  }
  return true;
}

function drawWeights(rows: PickerCandidate[]): number[] {
  const positive = rows
    .map((row) => row.completionUsdMicrosPerMillion)
    .filter((price) => price > 0n);
  const minPositive = positive.reduce((min, price) => (price < min ? price : min), positive[0] ?? 1n);
  const freshness = rows.map((row) => 1 / (1 + row.success24h + row.fail24h));
  const maxFresh = freshness.reduce((max, value) => (value > max ? value : max), 0);

  return rows.map((row, index) => {
    const trials = row.success24h + row.fail24h;
    const quality = Math.min(100, Math.max(0, row.qualityScore)) / 100;
    const success = trials === 0 ? 1 : row.success24h / trials;
    const inverseCost =
      row.completionUsdMicrosPerMillion === 0n
        ? 1
        : Number(minPositive) / Number(row.completionUsdMicrosPerMillion);
    const fresh = maxFresh === 0 ? 0 : (freshness[index] ?? 0) / maxFresh;
    const score = 0.4 * quality + 0.3 * success + 0.2 * inverseCost + 0.1 * fresh;
    return Math.max(row.weight, 1) * Math.max(score, 0.01);
  });
}

export function weightedDraw(rows: PickerCandidate[], rng: () => number): PickerCandidate {
  const first = rows[0];
  if (!first) throw new AppError(ErrorCode.MODEL_POOL_EMPTY);
  const weights = drawWeights(rows);
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let threshold = rng() * total;
  for (let index = 0; index < rows.length; index += 1) {
    threshold -= weights[index] ?? 0;
    const row = rows[index];
    if (threshold <= 0 && row) return row;
  }
  return rows[rows.length - 1] ?? first;
}

function pickFallbacks(
  pool: PickerCandidate[],
  primary: PickerCandidate,
  count: number,
  rng: () => number,
): PickerCandidate[] {
  const chosen: PickerCandidate[] = [];
  let remaining = pool.filter((row) => row.slug !== primary.slug);
  const authors = new Set<string>([primary.author]);
  for (let index = 0; index < count; index += 1) {
    const different = remaining.filter((row) => !authors.has(row.author));
    const choices = different.length > 0 ? different : remaining;
    if (choices.length === 0) break;
    const next = weightedDraw(choices, rng);
    chosen.push(next);
    authors.add(next.author);
    remaining = remaining.filter((row) => row.slug !== next.slug);
  }
  return chosen;
}

export function drawModel(
  rows: PickerCandidate[],
  input: PickInput,
  rng: () => number = Math.random,
): ModelPick {
  const eligible = rows.filter((row) => isEligible(row, input));
  let pool = eligible.filter((row) => !input.excludeSlugs.includes(row.slug));
  if (pool.length === 0) pool = eligible;
  if (pool.length === 0) throw new AppError(ErrorCode.MODEL_POOL_EMPTY);
  const primary = weightedDraw(pool, rng);
  const fallbacks = pickFallbacks(pool, primary, LIMITS.fallbacksMax, rng);
  return {
    primary: primary.slug,
    fallbacks: fallbacks.map((row) => row.slug),
    reason: "weighted",
  };
}

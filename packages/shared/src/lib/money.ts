export function usdToMicros(usd: number): bigint {
  if (!Number.isFinite(usd)) return 0n;
  const sign = usd < 0 ? -1n : 1n;
  const abs = BigInt(Math.round(Math.abs(usd) * 1_000_000));
  return sign * abs;
}

export function microsToString(micros: bigint): string {
  return micros.toString();
}

/** OpenRouter per-token USD string → USD micros per 1,000,000 tokens. */
export function usdPerTokenToMicrosPerMillion(decimal: string | undefined | null): bigint {
  if (!decimal) return 0n;
  const trimmed = decimal.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return 0n;
  return decimalToScaled(trimmed, 12);
}

export function decimalToScaled(value: string, scale: number): bigint {
  const [whole, frac = ""] = value.split(".");
  const padded = (frac + "0".repeat(scale)).slice(0, scale);
  const digits = `${whole}${padded}`.replace(/^0+(?=\d)/, "");
  return BigInt(digits.length > 0 ? digits : "0");
}

export function estimateCostMicros(
  promptTokens: number,
  completionTokens: number,
  promptUsdMicrosPerMillion: bigint,
  completionUsdMicrosPerMillion: bigint,
): bigint {
  const prompt = BigInt(Math.max(0, promptTokens));
  const completion = BigInt(Math.max(0, completionTokens));
  return (
    (prompt * promptUsdMicrosPerMillion + completion * completionUsdMicrosPerMillion) / 1_000_000n
  );
}

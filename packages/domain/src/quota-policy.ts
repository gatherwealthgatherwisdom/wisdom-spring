import type { PlanTier } from "@spring/shared";

export interface QuotaPolicy {
  assertCanSend(input: { userId: string; planTier: PlanTier; now: Date }): Promise<void>;
}

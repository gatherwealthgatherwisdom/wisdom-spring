import type { ModelCapability, ModelHealthStatus, ModelRegionStatus, PlanTier } from "@spring/shared";

export interface ModelPick {
  primary: string;
  fallbacks: string[];
  reason: string;
}

export interface PickerCandidate {
  slug: string;
  author: string;
  enabled: boolean;
  regionStatus: ModelRegionStatus;
  healthStatus: ModelHealthStatus;
  weight: number;
  qualityScore: number;
  minPlanTier: PlanTier;
  success24h: number;
  fail24h: number;
  isFreeRoute: boolean;
  promptUsdMicrosPerMillion: bigint;
  completionUsdMicrosPerMillion: bigint;
  contextLength: number;
  supportsText: boolean;
  supportsVision: boolean;
  supportsImageOutput: boolean;
}

export interface PickInput {
  planTier: PlanTier;
  capability: ModelCapability;
  excludeSlugs: string[];
  requireImageOutput?: boolean;
}

export interface ModelPicker {
  pick(input: PickInput): Promise<ModelPick>;
}

export interface ModelPoolReader {
  listPickerCandidates(): Promise<PickerCandidate[]>;
}

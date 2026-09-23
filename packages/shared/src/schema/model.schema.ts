import { z } from "zod";
import { ModelCapability } from "../enums/model-capability";
import { ModelHealthStatus } from "../enums/model-health-status";
import { ModelRegionStatus } from "../enums/model-region-status";
import { PlanTier } from "../enums/plan-tier";

export const ModelPoolViewSchema = z.object({
  slug: z.string(),
  name: z.string(),
  author: z.string(),
  enabled: z.boolean(),
  regionStatus: z.nativeEnum(ModelRegionStatus),
  healthStatus: z.nativeEnum(ModelHealthStatus),
  weight: z.number().int(),
  qualityScore: z.number().int(),
  minPlanTier: z.nativeEnum(PlanTier),
  promptUsdMicrosPerMillion: z.string(),
  completionUsdMicrosPerMillion: z.string(),
  isFreeRoute: z.boolean(),
  success24h: z.number().int(),
  fail24h: z.number().int(),
  lastProbeAt: z.string().nullable(),
  lastErrorCode: z.string().nullable(),
  contextLength: z.number().int(),
});

export const UpdateModelPoolSchema = z
  .object({
    enabled: z.boolean().optional(),
    weight: z.number().int().min(0).max(10_000).optional(),
    qualityScore: z.number().int().min(0).max(100).optional(),
    minPlanTier: z.nativeEnum(PlanTier).optional(),
    regionStatus: z.nativeEnum(ModelRegionStatus).optional(),
  })
  .refine((value) => Object.values(value).some((item) => item !== undefined), { message: "empty" });

export const SimulateDrawRequestSchema = z.object({
  planTier: z.nativeEnum(PlanTier).default(PlanTier.PLUS),
  capability: z.nativeEnum(ModelCapability).default(ModelCapability.TEXT),
  draws: z.number().int().min(1).max(1_000).default(100),
});

export const SimulateDrawResponseSchema = z.object({
  draws: z.number().int(),
  histogram: z.array(z.object({ slug: z.string(), count: z.number().int() })),
});

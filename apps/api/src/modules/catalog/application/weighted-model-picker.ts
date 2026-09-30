import type { ModelPicker, ModelPoolReader, ModelPick, PickInput } from "@spring/domain";
import type { PlanLimits, PlanTier } from "@spring/shared";
import { drawModel } from "./draw-model";

export class WeightedModelPicker implements ModelPicker {
  constructor(
    private readonly reader: ModelPoolReader,
    private readonly rng: () => number = Math.random,
    private readonly planLimits?: (plan: PlanTier) => Promise<PlanLimits>,
  ) {}

  async pick(input: PickInput): Promise<ModelPick> {
    const rows = await this.reader.listPickerCandidates();
    const limits = this.planLimits ? await this.planLimits(input.planTier) : undefined;
    return drawModel(rows, input, this.rng, limits);
  }
}

import type { ModelPicker, ModelPoolReader, ModelPick, PickInput } from "@spring/domain";
import { drawModel } from "./draw-model";

export class WeightedModelPicker implements ModelPicker {
  constructor(
    private readonly reader: ModelPoolReader,
    private readonly rng: () => number = Math.random,
  ) {}

  async pick(input: PickInput): Promise<ModelPick> {
    const rows = await this.reader.listPickerCandidates();
    return drawModel(rows, input, this.rng);
  }
}

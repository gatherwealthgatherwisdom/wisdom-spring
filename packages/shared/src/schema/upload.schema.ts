import { z } from "zod";

export const UploadRequestSchema = z.object({
  mime: z.string().min(1).max(64),
  data: z.string().min(1),
});

export const AssetViewSchema = z.object({
  id: z.string().ulid(),
  url: z.string(),
  mime: z.string(),
  byteSize: z.number().int().nonnegative(),
});

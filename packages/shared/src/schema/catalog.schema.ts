import { z } from "zod";
import { ConversationModeSchema } from "./conversation.schema";

export const CatalogToolViewSchema = z.object({
  id: z.string(),
  zh: z.string(),
  en: z.string(),
  blurbZh: z.string(),
  blurbEn: z.string(),
  live: z.boolean(),
  mode: ConversationModeSchema.optional(),
  templateId: z.string().optional(),
  imageStyle: z.string().optional(),
});

export const CatalogAideViewSchema = z.object({
  id: z.string(),
  zh: z.string(),
  en: z.string(),
  blurbZh: z.string(),
  blurbEn: z.string(),
});

export const CatalogToolsResponseSchema = z.object({
  items: z.array(CatalogToolViewSchema),
});

export const CatalogAidesResponseSchema = z.object({
  items: z.array(CatalogAideViewSchema),
});

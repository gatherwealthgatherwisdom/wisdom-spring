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
  icon: z.string().optional(),
  page: z.number().int().optional(),
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

export const CatalogWriteViewSchema = z.object({
  id: z.string(),
  zh: z.string(),
  en: z.string(),
  blurbZh: z.string(),
  blurbEn: z.string(),
});

export const CatalogStyleViewSchema = CatalogWriteViewSchema;

export const CatalogLanguageViewSchema = z.object({
  id: z.string(),
  zh: z.string(),
  en: z.string(),
});

export const CatalogWriteResponseSchema = z.object({
  items: z.array(CatalogWriteViewSchema),
});

export const CatalogStylesResponseSchema = z.object({
  items: z.array(CatalogStyleViewSchema),
});

export const CatalogLanguagesResponseSchema = z.object({
  items: z.array(CatalogLanguageViewSchema),
});

export const CatalogDiscoverViewSchema = z.object({
  id: z.string(),
  zh: z.string(),
  en: z.string(),
  blurbZh: z.string(),
  blurbEn: z.string(),
  section: z.string(),
  tone: z.string(),
  art: z.string(),
  sort: z.number().int(),
  toolId: z.string().optional(),
  mode: ConversationModeSchema.optional(),
  imageStyle: z.string().optional(),
});

export const CatalogDiscoverResponseSchema = z.object({
  items: z.array(CatalogDiscoverViewSchema),
});

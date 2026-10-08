import type { CatalogKind as PrismaCatalogKind, Prisma, PrismaClient } from "@prisma/client";
import {
  AppError,
  ErrorCode,
  DISCOVER_TONE_RE,
  IMAGE_STYLES,
  SPRING_AIDES,
  SPRING_DISCOVER_CARDS,
  SPRING_TOOLS,
  TRANSLATE_LANGUAGES,
  WRITE_TEMPLATES,
  imageStyle,
  isDiscoverArtId,
  isDiscoverSection,
  toolInstruction,
  usesWebSearch,
  writeTemplate,
  type AdminCatalogItem,
  type CatalogAideView,
  type CatalogDiscoverView,
  type CatalogKind,
  type CatalogLanguageView,
  type CatalogStyleView,
  type CatalogToolView,
  type CatalogWriteView,
  type ConversationMode,
  type CreateCatalogEntryRequest,
  type ImageStyle,
  type SpringAide,
  type SpringDiscoverCard,
  type SpringTool,
  type TranslateLanguage,
  type UpdateCatalogEntryRequest,
  type WriteTemplate,
} from "@spring/shared";

const PRISMA_KIND: Record<CatalogKind, PrismaCatalogKind> = {
  tool: "TOOL",
  aide: "AIDE",
  write: "WRITE",
  image: "IMAGE",
  translate: "TRANSLATE",
  discover: "DISCOVER",
};

const API_KIND: Record<PrismaCatalogKind, CatalogKind> = {
  TOOL: "tool",
  AIDE: "aide",
  WRITE: "write",
  IMAGE: "image",
  TRANSLATE: "translate",
  DISCOVER: "discover",
};

function toPrismaKind(kind: CatalogKind): PrismaCatalogKind {
  return PRISMA_KIND[kind];
}

function fromPrismaKind(kind: PrismaCatalogKind): CatalogKind {
  return API_KIND[kind];
}

function asMode(value: string | null | undefined): ConversationMode | undefined {
  if (value === "chat" || value === "write" || value === "translate" || value === "image") return value;
  return undefined;
}

function toolFromConstant(item: SpringTool, index: number): AdminCatalogItem {
  return {
    kind: "tool",
    id: item.id,
    zh: item.zh,
    en: item.en,
    blurbZh: item.blurbZh,
    blurbEn: item.blurbEn,
    live: item.live,
    sort: index,
    ...(item.mode ? { mode: item.mode } : {}),
    ...(item.templateId ? { templateId: item.templateId } : {}),
    ...(item.imageStyle ? { imageStyle: item.imageStyle } : {}),
    ...(item.instruction ? { instruction: item.instruction } : {}),
    ...(item.icon ? { icon: item.icon } : {}),
    ...(item.page !== undefined ? { page: item.page } : {}),
  };
}

function aideFromConstant(item: SpringAide, index: number): AdminCatalogItem {
  return {
    kind: "aide",
    id: item.id,
    zh: item.zh,
    en: item.en,
    blurbZh: item.blurbZh,
    blurbEn: item.blurbEn,
    live: true,
    sort: index,
    mode: "chat",
    templateId: item.id,
    instruction: item.instruction,
  };
}

function writeFromConstant(item: WriteTemplate, index: number): AdminCatalogItem {
  return {
    kind: "write",
    id: item.id,
    zh: item.zh,
    en: item.en,
    blurbZh: item.blurbZh,
    blurbEn: item.blurbEn,
    live: true,
    sort: index,
    mode: "write",
    templateId: item.id,
    instruction: item.instruction,
  };
}

function styleFromConstant(item: ImageStyle, index: number): AdminCatalogItem {
  return {
    kind: "image",
    id: item.id,
    zh: item.zh,
    en: item.en,
    blurbZh: item.blurbZh,
    blurbEn: item.blurbEn,
    live: true,
    sort: index,
    mode: "image",
    imageStyle: item.id,
    instruction: item.hint,
  };
}

function langFromConstant(item: TranslateLanguage, index: number): AdminCatalogItem {
  return {
    kind: "translate",
    id: item.id,
    zh: item.zh,
    en: item.en,
    blurbZh: item.zh,
    blurbEn: item.en,
    live: true,
    sort: index,
    mode: "translate",
  };
}

function discoverFromConstant(item: SpringDiscoverCard, index: number): AdminCatalogItem {
  return {
    kind: "discover",
    id: item.id,
    zh: item.zh,
    en: item.en,
    blurbZh: item.blurbZh,
    blurbEn: item.blurbEn,
    live: true,
    sort: index,
    section: item.section,
    tone: item.tone,
    art: item.art,
    ...(item.toolId ? { templateId: item.toolId } : {}),
    ...(item.mode ? { mode: item.mode } : {}),
    ...(item.imageStyle ? { imageStyle: item.imageStyle } : {}),
  };
}

function assertDiscover(item: AdminCatalogItem): void {
  if (item.kind !== "discover") return;
  if (!item.section || !isDiscoverSection(item.section)) throw new AppError(ErrorCode.VALIDATION);
  if (!item.art || !isDiscoverArtId(item.art)) throw new AppError(ErrorCode.VALIDATION);
  if (!item.tone || !DISCOVER_TONE_RE.test(item.tone)) throw new AppError(ErrorCode.VALIDATION);
}

function fromRow(row: {
  kind: PrismaCatalogKind;
  id: string;
  zh: string;
  en: string;
  blurbZh: string;
  blurbEn: string;
  live: boolean;
  sort: number;
  mode: string | null;
  templateId: string | null;
  imageStyle: string | null;
  instruction: string | null;
  icon: string | null;
  page: number | null;
  section: string | null;
  tone: string | null;
  art: string | null;
}): AdminCatalogItem {
  return {
    kind: fromPrismaKind(row.kind),
    id: row.id,
    zh: row.zh,
    en: row.en,
    blurbZh: row.blurbZh,
    blurbEn: row.blurbEn,
    live: row.live,
    sort: row.sort,
    ...(asMode(row.mode) ? { mode: asMode(row.mode) } : {}),
    ...(row.templateId ? { templateId: row.templateId } : {}),
    ...(row.imageStyle ? { imageStyle: row.imageStyle } : {}),
    ...(row.instruction ? { instruction: row.instruction } : {}),
    ...(row.icon ? { icon: row.icon } : {}),
    ...(row.page !== null ? { page: row.page } : {}),
    ...(row.section && isDiscoverSection(row.section) ? { section: row.section } : {}),
    ...(row.tone && DISCOVER_TONE_RE.test(row.tone) ? { tone: row.tone } : {}),
    ...(row.art && isDiscoverArtId(row.art) ? { art: row.art } : {}),
  };
}

function overlay(base: AdminCatalogItem, row: AdminCatalogItem): AdminCatalogItem {
  return {
    ...base,
    ...row,
    kind: base.kind,
    id: base.id,
  };
}

export function toPublicTool(item: AdminCatalogItem): CatalogToolView {
  return {
    id: item.id,
    zh: item.zh,
    en: item.en,
    blurbZh: item.blurbZh,
    blurbEn: item.blurbEn,
    live: item.live,
    ...(item.mode ? { mode: item.mode } : {}),
    ...(item.templateId ? { templateId: item.templateId } : {}),
    ...(item.imageStyle ? { imageStyle: item.imageStyle } : {}),
    ...(item.icon ? { icon: item.icon } : {}),
    ...(item.page !== undefined ? { page: item.page } : {}),
  };
}

export function toPublicAide(item: AdminCatalogItem): CatalogAideView {
  return {
    id: item.id,
    zh: item.zh,
    en: item.en,
    blurbZh: item.blurbZh,
    blurbEn: item.blurbEn,
  };
}

export function toPublicWrite(item: AdminCatalogItem): CatalogWriteView {
  return {
    id: item.id,
    zh: item.zh,
    en: item.en,
    blurbZh: item.blurbZh,
    blurbEn: item.blurbEn,
  };
}

export function toPublicStyle(item: AdminCatalogItem): CatalogStyleView {
  return toPublicWrite(item);
}

export function toPublicLanguage(item: AdminCatalogItem): CatalogLanguageView {
  return {
    id: item.id,
    zh: item.zh,
    en: item.en,
  };
}

export async function listCatalog(prisma: PrismaClient, kind?: CatalogKind): Promise<AdminCatalogItem[]> {
  const rows = await prisma.catalogEntry.findMany({
    where: kind ? { kind: toPrismaKind(kind) } : undefined,
  });
  const byKey = new Map(rows.map((row) => [`${fromPrismaKind(row.kind)}:${row.id}`, fromRow(row)]));
  const tools = SPRING_TOOLS.map((item, index) => {
    const base = toolFromConstant(item, index);
    const row = byKey.get(`tool:${item.id}`);
    return row ? overlay(base, row) : base;
  });
  const aides = SPRING_AIDES.map((item, index) => {
    const base = aideFromConstant(item, index);
    const row = byKey.get(`aide:${item.id}`);
    return row ? overlay(base, row) : base;
  });
  const writes = WRITE_TEMPLATES.map((item, index) => {
    const base = writeFromConstant(item, index);
    const row = byKey.get(`write:${item.id}`);
    return row ? overlay(base, row) : base;
  });
  const styles = IMAGE_STYLES.map((item, index) => {
    const base = styleFromConstant(item, index);
    const row = byKey.get(`image:${item.id}`);
    return row ? overlay(base, row) : base;
  });
  const langs = TRANSLATE_LANGUAGES.map((item, index) => {
    const base = langFromConstant(item, index);
    const row = byKey.get(`translate:${item.id}`);
    return row ? overlay(base, row) : base;
  });
  const discover = SPRING_DISCOVER_CARDS.map((item, index) => {
    const base = discoverFromConstant(item, index);
    const row = byKey.get(`discover:${item.id}`);
    return row ? overlay(base, row) : base;
  });
  const known = new Set(
    [...tools, ...aides, ...writes, ...styles, ...langs, ...discover].map((item) => `${item.kind}:${item.id}`),
  );
  const extras = rows
    .filter((row) => !known.has(`${fromPrismaKind(row.kind)}:${row.id}`))
    .map((row) => fromRow(row));
  const all = [...tools, ...aides, ...writes, ...styles, ...langs, ...discover, ...extras].filter(
    (item) => !kind || item.kind === kind,
  );
  all.sort((a, b) => a.sort - b.sort || a.id.localeCompare(b.id));
  return all;
}

export async function publicTools(prisma: PrismaClient): Promise<CatalogToolView[]> {
  return (await listCatalog(prisma, "tool")).filter((item) => item.live).map(toPublicTool);
}

export async function publicAides(prisma: PrismaClient): Promise<CatalogAideView[]> {
  return (await listCatalog(prisma, "aide")).filter((item) => item.live).map(toPublicAide);
}

export async function publicWrite(prisma: PrismaClient): Promise<CatalogWriteView[]> {
  return (await listCatalog(prisma, "write")).filter((item) => item.live).map(toPublicWrite);
}

export async function publicStyles(prisma: PrismaClient): Promise<CatalogStyleView[]> {
  return (await listCatalog(prisma, "image")).filter((item) => item.live).map(toPublicStyle);
}

export async function publicLanguages(prisma: PrismaClient): Promise<CatalogLanguageView[]> {
  return (await listCatalog(prisma, "translate")).filter((item) => item.live).map(toPublicLanguage);
}

export function toPublicDiscover(item: AdminCatalogItem): CatalogDiscoverView {
  return {
    id: item.id,
    zh: item.zh,
    en: item.en,
    blurbZh: item.blurbZh,
    blurbEn: item.blurbEn,
    section: item.section ?? "reco",
    tone: item.tone ?? "#1F6B4A",
    art: item.art ?? "devices",
    sort: item.sort,
    ...(item.templateId ? { toolId: item.templateId } : {}),
    ...(item.mode ? { mode: item.mode } : {}),
    ...(item.imageStyle ? { imageStyle: item.imageStyle } : {}),
  };
}

export async function publicDiscover(prisma: PrismaClient): Promise<CatalogDiscoverView[]> {
  return (await listCatalog(prisma, "discover")).filter((item) => item.live).map(toPublicDiscover);
}

export async function catalogInstruction(
  prisma: PrismaClient,
  templateId: string | null | undefined,
): Promise<string | undefined> {
  if (!templateId) return undefined;
  const rows = await prisma.catalogEntry.findMany({
    where: {
      OR: [
        { kind: "AIDE", id: templateId },
        { kind: "TOOL", id: templateId },
        { kind: "TOOL", templateId },
        { kind: "WRITE", id: templateId },
      ],
    },
  });
  const aide = rows.find((row) => row.kind === "AIDE" && row.id === templateId);
  if (aide?.instruction) return aide.instruction;
  const toolById = rows.find((row) => row.kind === "TOOL" && row.id === templateId && row.instruction);
  if (toolById?.instruction) return toolById.instruction;
  const toolByTemplate = rows.find((row) => row.kind === "TOOL" && row.templateId === templateId && row.instruction);
  if (toolByTemplate?.instruction) return toolByTemplate.instruction;
  const write = rows.find((row) => row.kind === "WRITE" && row.id === templateId && row.instruction);
  if (write?.instruction) return write.instruction;
  return toolInstruction(templateId) ?? writeTemplate(templateId)?.instruction;
}

export async function catalogImageHint(
  prisma: PrismaClient,
  styleId: string | null | undefined,
): Promise<string | undefined> {
  if (!styleId) return undefined;
  const row = await prisma.catalogEntry.findUnique({
    where: { kind_id: { kind: "IMAGE", id: styleId } },
  });
  if (row?.instruction) return row.instruction;
  return imageStyle(styleId)?.hint;
}

export async function isWebToolLive(prisma: PrismaClient, templateId: string | null | undefined): Promise<boolean> {
  if (!usesWebSearch(templateId)) return false;
  const items = await listCatalog(prisma, "tool");
  return items.some(
    (item) => item.live && (item.id === templateId || item.templateId === templateId),
  );
}

function toData(item: AdminCatalogItem): Prisma.CatalogEntryUncheckedCreateInput {
  return {
    kind: toPrismaKind(item.kind),
    id: item.id,
    zh: item.zh,
    en: item.en,
    blurbZh: item.blurbZh,
    blurbEn: item.blurbEn,
    live: item.live,
    sort: item.sort,
    mode: item.mode ?? null,
    templateId: item.templateId ?? null,
    imageStyle: item.imageStyle ?? null,
    instruction: item.instruction ?? null,
    icon: item.icon ?? null,
    page: item.page ?? null,
    section: item.section ?? null,
    tone: item.tone ?? null,
    art: item.art ?? null,
  };
}

async function persist(prisma: PrismaClient, item: AdminCatalogItem): Promise<AdminCatalogItem> {
  const data = toData(item);
  await prisma.catalogEntry.upsert({
    where: { kind_id: { kind: data.kind, id: data.id } },
    create: data,
    update: {
      zh: data.zh,
      en: data.en,
      blurbZh: data.blurbZh,
      blurbEn: data.blurbEn,
      live: data.live,
      sort: data.sort,
      mode: data.mode,
      templateId: data.templateId,
      imageStyle: data.imageStyle,
      instruction: data.instruction,
      icon: data.icon,
      page: data.page,
      section: data.section,
      tone: data.tone,
      art: data.art,
    },
  });
  return item;
}

export async function patchCatalogEntry(
  prisma: PrismaClient,
  kind: CatalogKind,
  id: string,
  body: UpdateCatalogEntryRequest,
): Promise<AdminCatalogItem> {
  const current = (await listCatalog(prisma, kind)).find((item) => item.id === id);
  if (!current) throw new AppError(ErrorCode.NOT_FOUND);
  const next: AdminCatalogItem = {
    ...current,
    ...(body.zh !== undefined ? { zh: body.zh } : {}),
    ...(body.en !== undefined ? { en: body.en } : {}),
    ...(body.blurbZh !== undefined ? { blurbZh: body.blurbZh } : {}),
    ...(body.blurbEn !== undefined ? { blurbEn: body.blurbEn } : {}),
    ...(body.live !== undefined ? { live: body.live } : {}),
    ...(body.sort !== undefined ? { sort: body.sort } : {}),
    ...(body.mode !== undefined ? (body.mode ? { mode: body.mode } : { mode: undefined }) : {}),
    ...(body.templateId !== undefined
      ? body.templateId
        ? { templateId: body.templateId }
        : { templateId: undefined }
      : {}),
    ...(body.imageStyle !== undefined
      ? body.imageStyle
        ? { imageStyle: body.imageStyle }
        : { imageStyle: undefined }
      : {}),
    ...(body.instruction !== undefined
      ? body.instruction
        ? { instruction: body.instruction }
        : { instruction: undefined }
      : {}),
    ...(body.icon !== undefined ? (body.icon ? { icon: body.icon } : { icon: undefined }) : {}),
    ...(body.page !== undefined ? (body.page !== null ? { page: body.page } : { page: undefined }) : {}),
    ...(body.section !== undefined ? (body.section ? { section: body.section } : { section: undefined }) : {}),
    ...(body.tone !== undefined ? (body.tone ? { tone: body.tone } : { tone: undefined }) : {}),
    ...(body.art !== undefined ? (body.art ? { art: body.art } : { art: undefined }) : {}),
  };
  if (body.mode === null) delete next.mode;
  if (body.templateId === null) delete next.templateId;
  if (body.imageStyle === null) delete next.imageStyle;
  if (body.instruction === null) delete next.instruction;
  if (body.icon === null) delete next.icon;
  if (body.page === null) delete next.page;
  if (body.section === null) delete next.section;
  if (body.tone === null) delete next.tone;
  if (body.art === null) delete next.art;
  assertDiscover(next);
  return persist(prisma, next);
}

export async function createCatalogEntry(
  prisma: PrismaClient,
  body: CreateCatalogEntryRequest,
): Promise<AdminCatalogItem> {
  const existing = (await listCatalog(prisma, body.kind)).find((item) => item.id === body.id);
  if (existing) throw new AppError(ErrorCode.CONFLICT);
  const item: AdminCatalogItem = {
    kind: body.kind,
    id: body.id,
    zh: body.zh,
    en: body.en,
    blurbZh: body.blurbZh,
    blurbEn: body.blurbEn,
    live: body.live,
    sort: body.sort,
    ...(body.mode ? { mode: body.mode } : {}),
    ...(body.templateId ? { templateId: body.templateId } : {}),
    ...(body.imageStyle ? { imageStyle: body.imageStyle } : {}),
    ...(body.instruction ? { instruction: body.instruction } : {}),
    ...(body.icon ? { icon: body.icon } : {}),
    ...(body.page !== undefined ? { page: body.page } : {}),
    ...(body.section ? { section: body.section } : {}),
    ...(body.tone ? { tone: body.tone } : {}),
    ...(body.art ? { art: body.art } : {}),
  };
  assertDiscover(item);
  return persist(prisma, item);
}

export async function seedCatalog(prisma: PrismaClient): Promise<void> {
  const data = [
    ...SPRING_TOOLS.map((item, index) => toData(toolFromConstant(item, index))),
    ...SPRING_AIDES.map((item, index) => toData(aideFromConstant(item, index))),
    ...WRITE_TEMPLATES.map((item, index) => toData(writeFromConstant(item, index))),
    ...IMAGE_STYLES.map((item, index) => toData(styleFromConstant(item, index))),
    ...TRANSLATE_LANGUAGES.map((item, index) => toData(langFromConstant(item, index))),
    ...SPRING_DISCOVER_CARDS.map((item, index) => toData(discoverFromConstant(item, index))),
  ];
  await prisma.catalogEntry.createMany({ data, skipDuplicates: true });
  for (const item of SPRING_TOOLS) {
    await prisma.catalogEntry.updateMany({
      where: { kind: "TOOL", id: item.id },
      data: { live: item.live },
    });
  }
  for (const item of SPRING_DISCOVER_CARDS) {
    await prisma.catalogEntry.updateMany({
      where: { kind: "DISCOVER", id: item.id },
      data: {
        zh: item.zh,
        en: item.en,
        blurbZh: item.blurbZh,
        blurbEn: item.blurbEn,
        art: item.art,
        templateId: item.toolId ?? null,
      },
    });
  }
}

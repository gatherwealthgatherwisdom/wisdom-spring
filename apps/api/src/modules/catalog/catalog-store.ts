import type { CatalogKind as PrismaCatalogKind, Prisma, PrismaClient } from "@prisma/client";
import {
  AppError,
  ErrorCode,
  SPRING_AIDES,
  SPRING_TOOLS,
  toolInstruction,
  usesWebSearch,
  type AdminCatalogItem,
  type CatalogAideView,
  type CatalogKind,
  type CatalogToolView,
  type ConversationMode,
  type CreateCatalogEntryRequest,
  type SpringAide,
  type SpringTool,
  type UpdateCatalogEntryRequest,
} from "@spring/shared";

function toPrismaKind(kind: CatalogKind): PrismaCatalogKind {
  return kind === "aide" ? "AIDE" : "TOOL";
}

function fromPrismaKind(kind: PrismaCatalogKind): CatalogKind {
  return kind === "AIDE" ? "aide" : "tool";
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
  const known = new Set([...tools, ...aides].map((item) => `${item.kind}:${item.id}`));
  const extras = rows
    .filter((row) => !known.has(`${fromPrismaKind(row.kind)}:${row.id}`))
    .map((row) => fromRow(row));
  const all = [...tools, ...aides, ...extras].filter((item) => !kind || item.kind === kind);
  all.sort((a, b) => a.sort - b.sort || a.id.localeCompare(b.id));
  return all;
}

export async function publicTools(prisma: PrismaClient): Promise<CatalogToolView[]> {
  return (await listCatalog(prisma, "tool")).filter((item) => item.live).map(toPublicTool);
}

export async function publicAides(prisma: PrismaClient): Promise<CatalogAideView[]> {
  return (await listCatalog(prisma, "aide")).filter((item) => item.live).map(toPublicAide);
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
      ],
    },
  });
  const aide = rows.find((row) => row.kind === "AIDE" && row.id === templateId);
  if (aide?.instruction) return aide.instruction;
  const toolById = rows.find((row) => row.kind === "TOOL" && row.id === templateId && row.instruction);
  if (toolById?.instruction) return toolById.instruction;
  const toolByTemplate = rows.find((row) => row.kind === "TOOL" && row.templateId === templateId && row.instruction);
  if (toolByTemplate?.instruction) return toolByTemplate.instruction;
  return toolInstruction(templateId);
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
  };
  if (body.mode === null) delete next.mode;
  if (body.templateId === null) delete next.templateId;
  if (body.imageStyle === null) delete next.imageStyle;
  if (body.instruction === null) delete next.instruction;
  if (body.icon === null) delete next.icon;
  if (body.page === null) delete next.page;
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
  };
  return persist(prisma, item);
}

export async function seedCatalog(prisma: PrismaClient): Promise<void> {
  const data = [
    ...SPRING_TOOLS.map((item, index) => toData(toolFromConstant(item, index))),
    ...SPRING_AIDES.map((item, index) => toData(aideFromConstant(item, index))),
  ];
  await prisma.catalogEntry.createMany({ data, skipDuplicates: true });
}

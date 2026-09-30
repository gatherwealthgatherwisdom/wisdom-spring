import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@prisma/client";
import {
  AdminAuditQuerySchema,
  AdminCatalogQuerySchema,
  AdminUpdateUserSchema,
  AdminUsageQuerySchema,
  AdminUserQuerySchema,
  AppError,
  CatalogKindSchema,
  CreateCatalogEntrySchema,
  ErrorCode,
  PlanTier,
  SimulateDrawRequestSchema,
  UpdateCatalogEntrySchema,
  UpdateFeatureFlagSchema,
  UpdateCopySchema,
  UpdateLimitsSchema,
  UpdateModelPoolSchema,
  UpsertAnnouncementSchema,
  UserRole,
  createId,
  hkMonthRange,
  hkMonthRangeFromKey,
  isAllowlisted,
  isFeatureFlagKey,
  limitsFor,
  usdPerTokenToMicrosPerMillion,
} from "@spring/shared";
import { requireAdmin } from "../../http/auth-guard";
import { toActingUser, toPublic } from "../auth/acting-user";
import { drawModel } from "../catalog/application/draw-model";
import { createCatalogEntry, listCatalog, patchCatalogEntry } from "../catalog/catalog-store";
import { loadAppLimits, patchAppLimits } from "./app-limits";
import { writeAudit } from "./audit";
import { adminCopyOf, loadPromptDocs, patchPromptDocs } from "./prompt-docs";
import { mergeFlagViews } from "./feature-flags";

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function pricingOf(value: unknown): { prompt: string; completion: string } {
  if (!value || typeof value !== "object") return { prompt: "0", completion: "0" };
  const record = value as Record<string, unknown>;
  return {
    prompt: usdPerTokenToMicrosPerMillion(typeof record.prompt === "string" ? record.prompt : "0").toString(),
    completion: usdPerTokenToMicrosPerMillion(typeof record.completion === "string" ? record.completion : "0").toString(),
  };
}

async function usageReport(
  prisma: PrismaClient,
  range: { start: Date; end: Date },
): Promise<{
  from: string;
  to: string;
  totals: {
    costUsdMicros: string;
    promptTokens: number;
    completionTokens: number;
    requests: number;
    regionBlockRate: number;
    fallbackRate: number;
  };
  byModel: Array<{
    model: string;
    costUsdMicros: string;
    promptTokens: number;
    completionTokens: number;
    requests: number;
  }>;
  byPlan: Array<{
    planTier: PlanTier;
    costUsdMicros: string;
    promptTokens: number;
    completionTokens: number;
    requests: number;
  }>;
}> {
  const ledger = await prisma.usageLedger.findMany({
    where: { occurredAt: { gte: range.start, lt: range.end } },
  });
  const users = await prisma.user.findMany({ select: { id: true, planTier: true } });
  const planOf = new Map(users.map((user) => [user.id, user.planTier]));
  const byModel = new Map<string, { cost: bigint; prompt: number; completion: number; requests: number }>();
  const byPlan = new Map<string, { cost: bigint; prompt: number; completion: number; requests: number }>();
  let cost = 0n;
  let prompt = 0;
  let completion = 0;
  for (const row of ledger) {
    cost += row.costUsdMicros;
    prompt += row.promptTokens;
    completion += row.completionTokens;
    const model = byModel.get(row.model) ?? { cost: 0n, prompt: 0, completion: 0, requests: 0 };
    model.cost += row.costUsdMicros;
    model.prompt += row.promptTokens;
    model.completion += row.completionTokens;
    model.requests += 1;
    byModel.set(row.model, model);
    const plan = planOf.get(row.userId) ?? PlanTier.FREE;
    const bucket = byPlan.get(plan) ?? { cost: 0n, prompt: 0, completion: 0, requests: 0 };
    bucket.cost += row.costUsdMicros;
    bucket.prompt += row.promptTokens;
    bucket.completion += row.completionTokens;
    bucket.requests += 1;
    byPlan.set(plan, bucket);
  }
  const assistants = await prisma.message.count({
    where: {
      role: "ASSISTANT",
      createdAt: { gte: range.start, lt: range.end },
      status: { in: ["COMPLETED", "FAILED", "CANCELLED"] },
    },
  });
  const blocked = await prisma.message.count({
    where: { errorCode: ErrorCode.UPSTREAM_REGION_BLOCKED, createdAt: { gte: range.start, lt: range.end } },
  });
  const completed = await prisma.message.count({
    where: { role: "ASSISTANT", status: "COMPLETED", createdAt: { gte: range.start, lt: range.end } },
  });
  const fallbacks = await prisma.message.count({
    where: { fallbackUsed: true, status: "COMPLETED", createdAt: { gte: range.start, lt: range.end } },
  });
  return {
    from: range.start.toISOString(),
    to: range.end.toISOString(),
    totals: {
      costUsdMicros: cost.toString(),
      promptTokens: prompt,
      completionTokens: completion,
      requests: ledger.length,
      regionBlockRate: assistants === 0 ? 0 : blocked / assistants,
      fallbackRate: completed === 0 ? 0 : fallbacks / completed,
    },
    byModel: [...byModel.entries()].map(([model, bucket]) => ({
      model,
      costUsdMicros: bucket.cost.toString(),
      promptTokens: bucket.prompt,
      completionTokens: bucket.completion,
      requests: bucket.requests,
    })),
    byPlan: [...byPlan.entries()].map(([planTier, bucket]) => ({
      planTier: planTier as PlanTier,
      costUsdMicros: bucket.cost.toString(),
      promptTokens: bucket.prompt,
      completionTokens: bucket.completion,
      requests: bucket.requests,
    })),
  };
}

export async function adminRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", async (request) => {
    await requireAdmin(request, app.ctx.auth);
  });

  app.get("/admin/users", async (request) => {
    const query = AdminUserQuerySchema.parse(request.query);
    const rows = await app.ctx.prisma.user.findMany({
      where: query.q
        ? {
            OR: [
              { email: { contains: query.q } },
              { displayName: { contains: query.q } },
              { phone: { contains: query.q } },
            ],
          }
        : {},
      orderBy: { createdAt: "desc" },
      take: query.limit,
    });
    const range = hkMonthRange(new Date());
    const ids = rows.map((row) => row.id);
    const usage =
      ids.length === 0
        ? []
        : await app.ctx.prisma.usageLedger.groupBy({
            by: ["userId"],
            where: { userId: { in: ids }, occurredAt: { gte: range.start, lt: range.end } },
            _count: { _all: true },
            _sum: { costUsdMicros: true },
          });
    const usageOf = new Map(usage.map((row) => [row.userId, row]));
    const guestLimit = (await loadAppLimits(app.ctx.prisma)).guestTrialMessages;
    return {
      items: rows.map((row) => {
        const bucket = usageOf.get(row.id);
        return {
          ...toPublic(toActingUser(row), guestLimit),
          monthRequests: bucket?._count._all ?? 0,
          monthCostUsdMicros: (bucket?._sum.costUsdMicros ?? 0n).toString(),
        };
      }),
      nextCursor: null,
    };
  });

  app.patch("/admin/users/:id", async (request) => {
    const actor = await requireAdmin(request, app.ctx.auth);
    const { id } = request.params as { id: string };
    const body = AdminUpdateUserSchema.parse(request.body ?? {});
    const existing = await app.ctx.prisma.user.findUnique({ where: { id } });
    if (!existing) throw new AppError(ErrorCode.NOT_FOUND);
    if (existing.role === UserRole.ADMIN && body.role === UserRole.USER) {
      const remaining = await app.ctx.prisma.user.count({
        where: { role: UserRole.ADMIN, id: { not: id }, status: { not: "DELETED" } },
      });
      if (remaining === 0) throw new AppError(ErrorCode.FORBIDDEN, "最後一個管理員唔可以降級。");
    }
    const updated = await app.ctx.prisma.user.update({
      where: { id },
      data: {
        ...(body.planTier !== undefined ? { planTier: body.planTier } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.role !== undefined ? { role: body.role } : {}),
        ...(body.resetGuestUses ? { guestUses: 0 } : {}),
      },
    });
    await writeAudit(app.ctx.prisma, actor.id, "user.update", { id, ...body });
    return toPublic(toActingUser(updated), (await loadAppLimits(app.ctx.prisma)).guestTrialMessages);
  });

  app.get("/admin/models", async () => {
    const [pools, catalogs] = await Promise.all([
      app.ctx.prisma.modelPoolEntry.findMany({ orderBy: { slug: "asc" } }),
      app.ctx.prisma.modelCatalog.findMany(),
    ]);
    const bySlug = new Map(catalogs.map((row) => [row.slug, row]));
    return {
      items: pools.map((pool) => {
        const catalog = bySlug.get(pool.slug);
        const pricing = pricingOf(catalog?.pricing);
        return {
          slug: pool.slug,
          name: catalog?.name ?? pool.slug,
          author: catalog?.author ?? "",
          enabled: pool.enabled,
          regionStatus: pool.regionStatus,
          healthStatus: pool.healthStatus,
          weight: pool.weight,
          qualityScore: pool.qualityScore,
          minPlanTier: pool.minPlanTier,
          promptUsdMicrosPerMillion: pricing.prompt,
          completionUsdMicrosPerMillion: pricing.completion,
          isFreeRoute: catalog?.isFreeRoute ?? pool.slug.endsWith(":free"),
          success24h: pool.success24h,
          fail24h: pool.fail24h,
          lastProbeAt: pool.lastProbeAt?.toISOString() ?? null,
          lastErrorCode: pool.lastErrorCode,
          contextLength: catalog?.contextLength ?? 0,
          supportsImageOutput: stringList(catalog?.outputModalities).includes("image"),
          supportsVision: stringList(catalog?.inputModalities).includes("image"),
        };
      }),
    };
  });

  app.patch("/admin/models/:author/:name", async (request) => {
    const actor = await requireAdmin(request, app.ctx.auth);
    const params = request.params as { author: string; name: string };
    const slug = `${decodeURIComponent(params.author)}/${decodeURIComponent(params.name)}`;
    const body = UpdateModelPoolSchema.parse(request.body ?? {});
    const existing = await app.ctx.prisma.modelPoolEntry.findUnique({ where: { slug } });
    if (!existing) throw new AppError(ErrorCode.NOT_FOUND);
    if (body.enabled === true && !isAllowlisted(slug)) {
      await writeAudit(app.ctx.prisma, actor.id, "model.enable.denied", { slug });
      throw new AppError(ErrorCode.FORBIDDEN, "呢個模型唔喺香港可用名單。");
    }
    await app.ctx.prisma.modelPoolEntry.update({
      where: { slug },
      data: {
        ...(body.enabled !== undefined ? { enabled: body.enabled } : {}),
        ...(body.weight !== undefined ? { weight: body.weight } : {}),
        ...(body.qualityScore !== undefined ? { qualityScore: body.qualityScore } : {}),
        ...(body.minPlanTier !== undefined ? { minPlanTier: body.minPlanTier } : {}),
        ...(body.regionStatus !== undefined ? { regionStatus: body.regionStatus } : {}),
      },
    });
    await writeAudit(app.ctx.prisma, actor.id, "model.update", { slug, ...body });
    return { ok: true };
  });

  app.post("/admin/models/:author/:name/probe", async (request) => {
    const actor = await requireAdmin(request, app.ctx.auth);
    const params = request.params as { author: string; name: string };
    const slug = `${decodeURIComponent(params.author)}/${decodeURIComponent(params.name)}`;
    await app.ctx.probe.probeSlug(slug);
    await writeAudit(app.ctx.prisma, actor.id, "model.probe", { slug });
    const row = await app.ctx.prisma.modelPoolEntry.findUnique({ where: { slug } });
    return row;
  });

  app.post("/admin/models/simulate-draw", async (request) => {
    const body = SimulateDrawRequestSchema.parse(request.body ?? {});
    const rows = await app.ctx.reader.listPickerCandidates();
    const limits = limitsFor(body.planTier, await loadAppLimits(app.ctx.prisma));
    const counts = new Map<string, number>();
    for (let index = 0; index < body.draws; index += 1) {
      const pick = drawModel(
        rows,
        { planTier: body.planTier, capability: body.capability, excludeSlugs: [] },
        Math.random,
        limits,
      );
      counts.set(pick.primary, (counts.get(pick.primary) ?? 0) + 1);
    }
    return {
      draws: body.draws,
      histogram: [...counts.entries()]
        .map(([slug, count]) => ({ slug, count }))
        .sort((left, right) => right.count - left.count),
    };
  });

  app.post("/admin/jobs/catalog-sync", async (request) => {
    const actor = await requireAdmin(request, app.ctx.auth);
    const result = await app.ctx.sync.run();
    await writeAudit(app.ctx.prisma, actor.id, "catalog.sync", result);
    return result;
  });

  app.post("/admin/jobs/catalog-probe", async (request) => {
    const actor = await requireAdmin(request, app.ctx.auth);
    const result = await app.ctx.probe.run();
    await writeAudit(app.ctx.prisma, actor.id, "catalog.probe", result);
    return result;
  });

  app.get("/admin/usage", async (request) => {
    const query = AdminUsageQuerySchema.parse(request.query);
    const range = query.month ? hkMonthRangeFromKey(query.month) : hkMonthRange(new Date());
    return usageReport(app.ctx.prisma, range);
  });

  app.get("/admin/audit", async (request) => {
    const query = AdminAuditQuerySchema.parse(request.query);
    const rows = await app.ctx.prisma.adminAuditLog.findMany({
      where: query.action ? { action: query.action } : {},
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return {
      items: rows.map((row) => ({
        id: row.id,
        actorId: row.actorId,
        action: row.action,
        payload: row.payload,
        createdAt: row.createdAt.toISOString(),
      })),
    };
  });

  app.get("/admin/flags", async () => {
    const rows = await app.ctx.prisma.featureFlag.findMany({ orderBy: { key: "asc" } });
    return { items: mergeFlagViews(rows) };
  });

  app.get("/admin/limits", async () => loadAppLimits(app.ctx.prisma));

  app.patch("/admin/limits", async (request) => {
    const actor = await requireAdmin(request, app.ctx.auth);
    const body = UpdateLimitsSchema.parse(request.body ?? {});
    const settings = await patchAppLimits(app.ctx.prisma, body);
    await writeAudit(app.ctx.prisma, actor.id, "limits.update", body);
    return settings;
  });

  app.get("/admin/copy", async () => adminCopyOf(await loadPromptDocs(app.ctx.prisma)));

  app.patch("/admin/copy", async (request) => {
    const actor = await requireAdmin(request, app.ctx.auth);
    const body = UpdateCopySchema.parse(request.body ?? {});
    const before = adminCopyOf(await loadPromptDocs(app.ctx.prisma));
    const after = adminCopyOf(await patchPromptDocs(app.ctx.prisma, body));
    await writeAudit(app.ctx.prisma, actor.id, "copy.update", { before, after });
    return after;
  });

  app.patch("/admin/flags/:key", async (request) => {
    const actor = await requireAdmin(request, app.ctx.auth);
    const key = (request.params as { key: string }).key;
    if (!isFeatureFlagKey(key)) throw new AppError(ErrorCode.VALIDATION);
    const body = UpdateFeatureFlagSchema.parse(request.body ?? {});
    const row = await app.ctx.prisma.featureFlag.upsert({
      where: { key },
      create: {
        key,
        enabled: body.enabled,
        payload: body.payload === undefined ? undefined : (body.payload as object),
      },
      update: { enabled: body.enabled, ...(body.payload !== undefined ? { payload: body.payload as object } : {}) },
    });
    await writeAudit(app.ctx.prisma, actor.id, "flag.update", { key, enabled: body.enabled });
    return { key: row.key, enabled: row.enabled, payload: row.payload, updatedAt: row.updatedAt.toISOString() };
  });

  app.get("/admin/announcements", async () => {
    const rows = await app.ctx.prisma.announcement.findMany({ orderBy: { createdAt: "desc" } });
    return {
      items: rows.map((row) => ({
        id: row.id,
        bodyZh: row.bodyZh,
        bodyEn: row.bodyEn,
        active: row.active,
        createdAt: row.createdAt.toISOString(),
      })),
    };
  });

  app.post("/admin/announcements", async (request, reply) => {
    const actor = await requireAdmin(request, app.ctx.auth);
    const body = UpsertAnnouncementSchema.parse(request.body ?? {});
    const row = await app.ctx.prisma.announcement.create({
      data: { id: createId(), bodyZh: body.bodyZh, bodyEn: body.bodyEn, active: body.active },
    });
    await writeAudit(app.ctx.prisma, actor.id, "announcement.create", { id: row.id });
    return reply.status(201).send({
      id: row.id,
      bodyZh: row.bodyZh,
      bodyEn: row.bodyEn,
      active: row.active,
      createdAt: row.createdAt.toISOString(),
    });
  });

  app.patch("/admin/announcements/:id", async (request) => {
    const actor = await requireAdmin(request, app.ctx.auth);
    const { id } = request.params as { id: string };
    const body = UpsertAnnouncementSchema.parse(request.body ?? {});
    const existing = await app.ctx.prisma.announcement.findUnique({ where: { id } });
    if (!existing) throw new AppError(ErrorCode.NOT_FOUND);
    const row = await app.ctx.prisma.announcement.update({
      where: { id },
      data: { bodyZh: body.bodyZh, bodyEn: body.bodyEn, active: body.active },
    });
    await writeAudit(app.ctx.prisma, actor.id, "announcement.update", { id });
    return {
      id: row.id,
      bodyZh: row.bodyZh,
      bodyEn: row.bodyEn,
      active: row.active,
      createdAt: row.createdAt.toISOString(),
    };
  });

  app.delete("/admin/announcements/:id", async (request) => {
    const actor = await requireAdmin(request, app.ctx.auth);
    const { id } = request.params as { id: string };
    const existing = await app.ctx.prisma.announcement.findUnique({ where: { id } });
    if (!existing) throw new AppError(ErrorCode.NOT_FOUND);
    await app.ctx.prisma.announcement.delete({ where: { id } });
    await writeAudit(app.ctx.prisma, actor.id, "announcement.delete", { id });
    return { ok: true };
  });

  app.get("/admin/catalog", async (request) => {
    await requireAdmin(request, app.ctx.auth);
    const query = AdminCatalogQuerySchema.parse(request.query ?? {});
    const items = await listCatalog(app.ctx.prisma, query.kind);
    return { items };
  });

  app.post("/admin/catalog", async (request, reply) => {
    const actor = await requireAdmin(request, app.ctx.auth);
    const body = CreateCatalogEntrySchema.parse(request.body ?? {});
    const item = await createCatalogEntry(app.ctx.prisma, body);
    await writeAudit(app.ctx.prisma, actor.id, "catalog.create", { kind: item.kind, id: item.id });
    return reply.status(201).send(item);
  });

  app.patch("/admin/catalog/:kind/:id", async (request) => {
    const actor = await requireAdmin(request, app.ctx.auth);
    const params = request.params as { kind: string; id: string };
    const kind = CatalogKindSchema.parse(params.kind);
    const body = UpdateCatalogEntrySchema.parse(request.body ?? {});
    const item = await patchCatalogEntry(app.ctx.prisma, kind, params.id, body);
    await writeAudit(app.ctx.prisma, actor.id, "catalog.update", {
      kind: item.kind,
      id: item.id,
      live: item.live,
    });
    return item;
  });
}

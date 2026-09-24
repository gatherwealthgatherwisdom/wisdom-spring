import type { FastifyInstance } from "fastify";
import {
  AdminUpdateUserSchema,
  AdminUserQuerySchema,
  AppError,
  ErrorCode,
  PlanTier,
  SimulateDrawRequestSchema,
  UpdateFeatureFlagSchema,
  UpdateModelPoolSchema,
  UpsertAnnouncementSchema,
  createId,
  hkMonthRange,
  usdPerTokenToMicrosPerMillion,
} from "@spring/shared";
import { requireAdmin } from "../../http/auth-guard";
import { toActingUser, toPublic } from "../auth/acting-user";
import { drawModel } from "../catalog/application/draw-model";
import { writeAudit } from "./audit";

function pricingOf(value: unknown): { prompt: string; completion: string } {
  if (!value || typeof value !== "object") return { prompt: "0", completion: "0" };
  const record = value as Record<string, unknown>;
  return {
    prompt: usdPerTokenToMicrosPerMillion(typeof record.prompt === "string" ? record.prompt : "0").toString(),
    completion: usdPerTokenToMicrosPerMillion(typeof record.completion === "string" ? record.completion : "0").toString(),
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
    return { items: rows.map((row) => toPublic(toActingUser(row))), nextCursor: null };
  });

  app.patch("/admin/users/:id", async (request) => {
    const actor = await requireAdmin(request, app.ctx.auth);
    const { id } = request.params as { id: string };
    const body = AdminUpdateUserSchema.parse(request.body ?? {});
    const existing = await app.ctx.prisma.user.findUnique({ where: { id } });
    if (!existing) throw new AppError(ErrorCode.NOT_FOUND);
    const updated = await app.ctx.prisma.user.update({
      where: { id },
      data: {
        ...(body.planTier !== undefined ? { planTier: body.planTier } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
      },
    });
    await writeAudit(app.ctx.prisma, actor.id, "user.update", { id, ...body });
    return toPublic(toActingUser(updated));
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
    const counts = new Map<string, number>();
    for (let index = 0; index < body.draws; index += 1) {
      const pick = drawModel(rows, { planTier: body.planTier, capability: body.capability, excludeSlugs: [] });
      counts.set(pick.primary, (counts.get(pick.primary) ?? 0) + 1);
    }
    return {
      draws: body.draws,
      histogram: [...counts.entries()]
        .map(([slug, count]) => ({ slug, count }))
        .sort((left, right) => right.count - left.count),
    };
  });

  app.get("/admin/usage", async () => {
    const now = new Date();
    const range = hkMonthRange(now);
    const ledger = await app.ctx.prisma.usageLedger.findMany({
      where: { occurredAt: { gte: range.start, lt: range.end } },
    });
    const users = await app.ctx.prisma.user.findMany({ select: { id: true, planTier: true } });
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
    const assistants = await app.ctx.prisma.message.count({
      where: {
        role: "ASSISTANT",
        createdAt: { gte: range.start, lt: range.end },
        status: { in: ["COMPLETED", "FAILED", "CANCELLED"] },
      },
    });
    const blocked = await app.ctx.prisma.message.count({
      where: { errorCode: ErrorCode.UPSTREAM_REGION_BLOCKED, createdAt: { gte: range.start, lt: range.end } },
    });
    const completed = await app.ctx.prisma.message.count({
      where: { role: "ASSISTANT", status: "COMPLETED", createdAt: { gte: range.start, lt: range.end } },
    });
    const fallbacks = await app.ctx.prisma.message.count({
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
        planTier,
        costUsdMicros: bucket.cost.toString(),
        promptTokens: bucket.prompt,
        completionTokens: bucket.completion,
        requests: bucket.requests,
      })),
    };
  });

  app.get("/admin/audit", async () => {
    const rows = await app.ctx.prisma.adminAuditLog.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
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
    return {
      items: rows.map((row) => ({
        key: row.key,
        enabled: row.enabled,
        payload: row.payload,
        updatedAt: row.updatedAt.toISOString(),
      })),
    };
  });

  app.patch("/admin/flags/:key", async (request) => {
    const actor = await requireAdmin(request, app.ctx.auth);
    const key = (request.params as { key: string }).key;
    const body = UpdateFeatureFlagSchema.parse(request.body ?? {});
    const row = await app.ctx.prisma.featureFlag.upsert({
      where: { key },
      create: { key, enabled: body.enabled, payload: body.payload === undefined ? undefined : (body.payload as object) },
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
}

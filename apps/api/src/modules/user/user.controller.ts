import type { FastifyInstance } from "fastify";
import { FeatureFlagKey, ModelCapability, UpdateMeRequestSchema, hkMonthRange } from "@spring/shared";
import { isEligible } from "../catalog/application/draw-model";
import { requireUser } from "../../http/auth-guard";
import { toActingUser, toPublic } from "../auth/acting-user";

export async function userRoutes(app: FastifyInstance): Promise<void> {
  app.get("/v1/me", async (request) => {
    const user = await requireUser(request, app.ctx.auth);
    const quota = await app.ctx.quota.snapshot(user.id, user.planTier, new Date());
    return { user: toPublic(user), quota };
  });

  app.patch("/v1/me", async (request) => {
    const user = await requireUser(request, app.ctx.auth);
    const body = UpdateMeRequestSchema.parse(request.body ?? {});
    const updated = await app.ctx.prisma.user.update({
      where: { id: user.id },
      data: {
        ...(body.displayName !== undefined ? { displayName: body.displayName } : {}),
        ...(body.locale !== undefined ? { locale: body.locale } : {}),
      },
    });
    const acting = toActingUser(updated);
    const quota = await app.ctx.quota.snapshot(acting.id, acting.planTier, new Date());
    return { user: toPublic(acting), quota };
  });

  app.delete("/v1/me", async (request) => {
    const user = await requireUser(request, app.ctx.auth);
    await app.ctx.prisma.$transaction([
      app.ctx.prisma.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      app.ctx.prisma.user.update({
        where: { id: user.id },
        data: { status: "DELETED", email: null, passwordHash: null, displayName: null },
      }),
    ]);
    return { ok: true };
  });

  app.get("/v1/capabilities", async (request) => {
    const user = await requireUser(request, app.ctx.auth);
    const rows = await app.ctx.reader.listPickerCandidates();
    const image = rows.some((row) =>
      isEligible(row, {
        planTier: user.planTier,
        capability: ModelCapability.TEXT,
        excludeSlugs: [],
        requireImageOutput: true,
      }),
    );
    return { image };
  });

  app.get("/v1/me/usage", async (request) => {
    const user = await requireUser(request, app.ctx.auth);
    const range = hkMonthRange(new Date());
    const aggregate = await app.ctx.prisma.usageLedger.aggregate({
      where: { userId: user.id, occurredAt: { gte: range.start, lt: range.end } },
      _count: { _all: true },
      _sum: { costUsdMicros: true, promptTokens: true, completionTokens: true },
    });
    return {
      from: range.start.toISOString(),
      to: range.end.toISOString(),
      requests: aggregate._count._all,
      costUsdMicros: (aggregate._sum.costUsdMicros ?? 0n).toString(),
      promptTokens: aggregate._sum.promptTokens ?? 0,
      completionTokens: aggregate._sum.completionTokens ?? 0,
    };
  });

  app.get("/v1/flags", async () => {
    const rows = await app.ctx.prisma.featureFlag.findMany({ orderBy: { key: "asc" } });
    const items = rows.map((row) => ({ key: row.key, enabled: row.enabled }));
    if (!items.some((item) => item.key === FeatureFlagKey.USER_MODEL_PICKER)) {
      items.push({ key: FeatureFlagKey.USER_MODEL_PICKER, enabled: false });
    }
    return { items };
  });

  app.get("/v1/announcements", async () => {
    const rows = await app.ctx.prisma.announcement.findMany({
      where: { active: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    });
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
}

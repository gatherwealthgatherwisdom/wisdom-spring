import type { FastifyInstance, FastifyRequest } from "fastify";
import {
  LoginRequestSchema,
  LogoutRequestSchema,
  OAuthRequestSchema,
  PhoneCodeRequestSchema,
  PhoneRegisterRequestSchema,
  PhoneVerifyRequestSchema,
  RefreshRequestSchema,
  RegisterRequestSchema,
} from "@spring/shared";
import { env } from "../../env";
import { optionalUser, requireUser } from "../../http/auth-guard";
import { toActingUser, toPublic } from "./acting-user";

function limit(max: number, timeWindow: string) {
  return {
    config: {
      rateLimit: {
        max: env.nodeEnv === "test" ? 10_000 : max,
        timeWindow,
        keyGenerator: (request: FastifyRequest) => request.ip,
      },
    },
  };
}

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post("/v1/auth/register", limit(env.nodeEnv === "production" ? 5 : 60, "1 hour"), async (request, reply) => {
    const body = RegisterRequestSchema.parse(request.body);
    const session = await app.ctx.auth.register(body);
    return reply.status(201).send(session);
  });

  app.post("/v1/auth/login", limit(10, "15 minutes"), async (request) => {
    const body = LoginRequestSchema.parse(request.body);
    return app.ctx.auth.login(body);
  });

  app.post("/v1/auth/refresh", limit(30, "15 minutes"), async (request) => {
    const body = RefreshRequestSchema.parse(request.body);
    return app.ctx.auth.refresh(body.refreshToken);
  });

  app.post("/v1/auth/logout", async (request) => {
    const body = LogoutRequestSchema.parse(request.body);
    const actor = await optionalUser(request, app.ctx.auth);
    await app.ctx.auth.logout(body.refreshToken, body.all, actor);
    return { ok: true };
  });

  app.post("/v1/auth/oauth/google", limit(10, "15 minutes"), async (request) => {
    const body = OAuthRequestSchema.parse(request.body);
    return app.ctx.oauth.google(body.idToken);
  });

  app.post("/v1/auth/oauth/apple", limit(10, "15 minutes"), async (request) => {
    const body = OAuthRequestSchema.parse(request.body);
    return app.ctx.oauth.apple(body.idToken);
  });

  app.post("/v1/auth/phone/request", limit(env.nodeEnv === "production" ? 5 : 60, "1 hour"), async (request) => {
    const body = PhoneCodeRequestSchema.parse(request.body);
    await app.ctx.phone.requestCode(body.phone, request.log);
    return { ok: true };
  });

  app.post("/v1/auth/phone/verify", limit(10, "15 minutes"), async (request) => {
    const body = PhoneVerifyRequestSchema.parse(request.body);
    return app.ctx.phone.verify(body.phone, body.code);
  });

  app.post("/v1/auth/register/phone", limit(30, "1 hour"), async (request) => {
    const actor = await requireUser(request, app.ctx.auth);
    const body = PhoneRegisterRequestSchema.parse(request.body ?? {});
    const updated = await app.ctx.phone.complete(actor.id, body.displayName);
    const user = toPublic(toActingUser(updated));
    const quota = await app.ctx.quota.snapshot(user.id, user.planTier, new Date());
    return { user, quota };
  });
}

import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import Fastify, { type FastifyInstance } from "fastify";
import { env } from "./env";
import { errorMapper } from "./http/error-mapper";
import { LOG_REDACT } from "./log";
import { adminRoutes } from "./modules/admin/admin.controller";
import { authRoutes } from "./modules/auth/auth.controller";
import { conversationRoutes } from "./modules/chat/controllers/conversation.controller";
import { messageRoutes } from "./modules/chat/controllers/message.controller";
import { userRoutes } from "./modules/user/user.controller";
import { createContext, type AppContext } from "./context";

export async function buildApp(options?: { ctx?: AppContext }): Promise<FastifyInstance> {
  const app = Fastify({
    logger: { redact: LOG_REDACT, level: env.nodeEnv === "test" ? "silent" : "info" },
    bodyLimit: 1_048_576,
  });
  const ctx = options?.ctx ?? (await createContext());
  app.decorate("ctx", ctx);
  app.setErrorHandler(errorMapper);
  const devOrigins = [
    env.appOriginAdmin,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:8081",
    "http://127.0.0.1:8081",
    "http://localhost:19006",
  ];
  await app.register(cors, {
    origin: env.nodeEnv === "production" ? env.appOriginAdmin : devOrigins,
    methods: ["GET", "HEAD", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });
  await app.register(rateLimit, {
    global: false,
    redis: ctx.redis,
    skipOnError: true,
    nameSpace: "spring-rl:",
  });
  app.get("/health", async () => ({ ok: true }));
  await app.register(authRoutes);
  await app.register(userRoutes);
  await app.register(conversationRoutes);
  await app.register(messageRoutes);
  await app.register(adminRoutes);
  return app;
}

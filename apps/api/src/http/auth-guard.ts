import type { FastifyRequest } from "fastify";
import { AppError, ErrorCode, UserRole } from "@spring/shared";
import type { AuthService } from "../modules/auth/auth.service";
import type { ActingUser } from "../modules/auth/acting-user";

export async function requireUser(request: FastifyRequest, auth: AuthService): Promise<ActingUser> {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) throw new AppError(ErrorCode.AUTH_INVALID);
  return auth.authenticate(header.slice("Bearer ".length).trim());
}

export async function optionalUser(request: FastifyRequest, auth: AuthService): Promise<ActingUser | null> {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  return auth.authenticate(header.slice("Bearer ".length).trim());
}

export async function requireAdmin(request: FastifyRequest, auth: AuthService): Promise<ActingUser> {
  const user = await requireUser(request, auth);
  if (user.role !== UserRole.ADMIN) throw new AppError(ErrorCode.FORBIDDEN);
  return user;
}

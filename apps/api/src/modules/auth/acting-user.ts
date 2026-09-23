import type { User } from "@prisma/client";
import { PlanTier, UserRole, UserStatus, type UserPublic } from "@spring/shared";

export interface ActingUser {
  id: string;
  email: string | null;
  displayName: string | null;
  locale: string;
  planTier: PlanTier;
  role: UserRole;
  status: UserStatus;
}

function asPlan(value: string): PlanTier {
  if (value === PlanTier.PLUS || value === PlanTier.INTERNAL) return value;
  return PlanTier.FREE;
}

function asRole(value: string): UserRole {
  return value === UserRole.ADMIN ? UserRole.ADMIN : UserRole.USER;
}

function asStatus(value: string): UserStatus {
  if (value === UserStatus.SUSPENDED || value === UserStatus.DELETED) return value;
  return UserStatus.ACTIVE;
}

export function toActingUser(user: User): ActingUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    locale: user.locale,
    planTier: asPlan(user.planTier),
    role: asRole(user.role),
    status: asStatus(user.status),
  };
}

export function toPublic(user: ActingUser): UserPublic {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    locale: user.locale,
    planTier: user.planTier,
    role: user.role,
    status: user.status,
  };
}

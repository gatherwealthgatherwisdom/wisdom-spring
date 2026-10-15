export enum UserTone {
  CONCISE = "concise",
  DETAILED = "detailed",
  CANTONESE = "cantonese",
}

export function parseUserTone(value: string | null | undefined): UserTone {
  if (value === UserTone.DETAILED || value === UserTone.CANTONESE) return value;
  return UserTone.CONCISE;
}

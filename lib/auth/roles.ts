// Application-layer role mapping. The `User.role` column is stored as `Int`
// in the database (no Prisma enum), so we keep the canonical integer-values
// mapping here in TypeScript. This is the single source of truth used by
// auth helpers, the UI, and any authorization checks.

export const UserRole = {
  STUDENT: 0,
  STAFF: 1,
  REGISTRAR: 2,
  ADMIN: 3,
} as const;

export type UserRoleValue = (typeof UserRole)[keyof typeof UserRole];
export type UserRoleKey = keyof typeof UserRole;

export const USER_ROLE_KEYS = Object.keys(UserRole) as UserRoleKey[];

export const STAFF_ACCOUNT_ROLES = [
  UserRole.STAFF,
  UserRole.REGISTRAR,
  UserRole.ADMIN,
] as const;

export const REGISTRAR_MANAGEMENT_ROLES = [
  UserRole.REGISTRAR,
  UserRole.ADMIN,
] as const;

export const ASSESSMENT_MANAGEMENT_ROLES = [
  UserRole.STAFF,
  UserRole.ADMIN,
] as const;

export const UserRoleLabel: Record<UserRoleKey, string> = {
  STUDENT: "Student",
  STAFF: "Staff",
  REGISTRAR: "Registrar",
  ADMIN: "Admin",
};

export function roleKeyFromValue(value: number): UserRoleKey | null {
  const entry = (
    Object.entries(UserRole) as [UserRoleKey, UserRoleValue][]
  ).find(([, v]) => v === value);
  return entry ? entry[0] : null;
}

export function roleLabelFromValue(value: number): string {
  const key = roleKeyFromValue(value);
  return key ? UserRoleLabel[key] : "Unknown";
}

export function isStaffAccountRole(
  value: number,
): value is (typeof STAFF_ACCOUNT_ROLES)[number] {
  return STAFF_ACCOUNT_ROLES.includes(
    value as (typeof STAFF_ACCOUNT_ROLES)[number],
  );
}

export const familyRoles = ['super_admin'] as const;

export type FamilyRole = (typeof familyRoles)[number];

export function isFamilyRole(value: unknown): value is FamilyRole {
  return typeof value === 'string' && familyRoles.includes(value as FamilyRole);
}

export function canEditFamily(role: FamilyRole | null) {
  return role === 'super_admin';
}

export function canManageFamily(role: FamilyRole | null) {
  return role === 'super_admin';
}

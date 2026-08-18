/**
 * Shared admin-role check for notifications-service.
 *
 * Previously each route file inlined `['admin', 'super_admin']` and read only the single
 * `role` value. Platform admins (NIPOST panel: DOP / DIRECTOR) carry their authority in the
 * roles array or in admin-service's permission tables, never in that one claim — so every
 * notification admin endpoint returned 403 "Admin privileges required" for real admins.
 *
 * Roles accepted here mirror the DOP-tier that admin-service grants for equivalent
 * platform-management endpoints (see admin-service/src/middleware/auth.ts requireDOPOrHigher).
 */
export const ADMIN_ROLES = ['admin', 'super_admin', 'dop', 'director'] as const;

export interface RoleBearer {
  role?: string;
  roles?: string[];
}

/** Case-insensitive check across both the single `role` claim and the `roles` array. */
export const isPlatformAdmin = (user?: RoleBearer | null): boolean => {
  if (!user) return false;
  const candidates = [user.role ?? '', ...(user.roles ?? [])]
    .map(r => String(r).trim().toLowerCase())
    .filter(Boolean);
  return candidates.some(r => (ADMIN_ROLES as readonly string[]).includes(r));
};

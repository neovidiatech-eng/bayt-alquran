/**
 * RBAC Utility Methods
 */

export const ADMIN_ROLES = ["admin", "super_admin"];

/**
 * Checks if a user has an administrative role.
 *
 * @param {Object} user - The user object.
 * @returns {boolean}
 */
export const isAdmin = (user) => {
  return ADMIN_ROLES.includes(user?.role?.name);
};

/**
 * Helper to extract permission codes from a user object.
 * Assumes the user object has the role and rolePermissions populated.
 *
 * @param {Object} user - The user object from the database.
 * @returns {Set<string>} - A Set of permission codes.
 */
export const getUserPermissions = (user) => {
  if (!user?.role?.rolePermissions) return new Set();
  return new Set(
    user.role.rolePermissions.map((rp) => rp.permission?.code).filter(Boolean),
  );
};

/**
 * Checks if a user has a specific permission.
 *
 * @param {Object} user - The user object.
 * @param {string} permissionCode - The permission code to check.
 * @returns {boolean}
 */
export const hasPermission = (user, permissionCode) => {
  if (isAdmin(user)) return true;
  const permissions = getUserPermissions(user);
  return permissions.has(permissionCode);
};

/**
 * Checks if a user has at least one of the required permissions.
 *
 * @param {Object} user - The user object.
 * @param {string[]} permissionCodes - Array of permission codes.
 * @returns {boolean}
 */
export const hasAnyPermission = (user, permissionCodes) => {
  const codes = Array.isArray(permissionCodes)
    ? permissionCodes
    : [permissionCodes];
  if (!codes || codes.length === 0 || (codes.length === 1 && !codes[0]))
    return true;
  const userPermissions = getUserPermissions(user);

  return codes.some((code) => userPermissions.has(code));
};

/**
 * Checks if a user has all of the required permissions.
 *
 * @param {Object} user - The user object.
 * @param {string[]} permissionCodes - Array of permission codes.
 * @returns {boolean}
 */
export const hasAllPermissions = (user, permissionCodes) => {
  const codes = Array.isArray(permissionCodes)
    ? permissionCodes
    : [permissionCodes];
  if (!codes || codes.length === 0 || (codes.length === 1 && !codes[0]))
    return true;
  const userPermissions = getUserPermissions(user);
  return codes.every((code) => userPermissions.has(code));
};

export const ROLES = {
  STUDENT: "student",
  TEACHER: "teacher",
  PARENT: "parent",
  ADMIN: "admin",
  STAFF: "staff",
  SUPER_ADMIN: "super_admin",
};

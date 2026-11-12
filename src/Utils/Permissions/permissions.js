import * as db from "../../database/dbService.js";

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
 * Checks if a user is a moderator.
 *
 * @param {Object} user - The user object.
 * @returns {boolean}
 */
export const isModerator = (user) => {
  if (!user) return false;
  const roleName = user.role?.name?.toLowerCase();
  return (
    roleName === "moderator" || (Boolean(user.moderator) && !isAdmin(user))
  );
};

/**
 * Retrieves the assigned student IDs for a moderator.
 * Returns null if the user is not a moderator.
 * Returns an array of student IDs (possibly empty) if the user is a moderator.
 *
 * @param {Object} user - The user object.
 * @returns {Promise<string[]|null>}
 */
export const getModeratorStudentIds = async (user) => {
  if (!isModerator(user)) return null;

  if (Array.isArray(user?.moderator?.studentModerators)) {
    return user.moderator.studentModerators
      .map((sm) => sm.studentId || sm.student?.id)
      .filter(Boolean);
  }

  let moderatorId = user?.moderator?.id;
  if (!moderatorId) {
    const mod = await db.findOne({
      model: "moderator",
      where: { userId: user.id },
      select: { id: true },
    });
    if (!mod) return [];
    moderatorId = mod.id;
  }

  const relations = await db.findMany({
    model: "student_moderator",
    where: { moderatorId },
    select: { studentId: true },
  });

  return relations.map((r) => r.studentId).filter(Boolean);
};

/**
 * Helper to build a Prisma schedule filter for a moderator's assigned students.
 *
 * @param {string[]} assignedStudentIds
 * @param {string} [queryStudentId]
 * @returns {Object}
 */
export const buildStudentScheduleFilter = (
  assignedStudentIds,
  queryStudentId,
) => {
  if (queryStudentId) {
    const effectiveStudentId = assignedStudentIds.includes(queryStudentId)
      ? queryStudentId
      : "__none__";
    return {
      OR: [
        { studentId: effectiveStudentId },
        { groupStudents: { some: { studentId: effectiveStudentId } } },
      ],
    };
  }
  return {
    OR: [
      { studentId: { in: assignedStudentIds } },
      { groupStudents: { some: { studentId: { in: assignedStudentIds } } } },
    ],
  };
};

/**
 * Helper to build a Prisma exam/homework filter for a moderator's assigned students.
 *
 * @param {string[]} assignedStudentIds
 * @param {string} [queryStudentId]
 * @returns {Object}
 */
export const buildStudentExamFilter = (
  assignedStudentIds,
  queryStudentId,
) => {
  if (queryStudentId) {
    const effectiveStudentId = assignedStudentIds.includes(queryStudentId)
      ? queryStudentId
      : "__none__";
    return { studentId: effectiveStudentId };
  }
  return { studentId: { in: assignedStudentIds } };
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
  MODERATOR: "moderator",
};

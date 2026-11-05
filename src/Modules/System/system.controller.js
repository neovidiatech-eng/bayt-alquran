import {
  asyncHandler,
  errorResponse,
  successResponse,
} from "../../Utils/Response.js";
import * as db from "../../database/dbService.js";
import { getNowUTC } from "../../Utils/Date/time.js";
import { rbacCache } from "../../Utils/RBAC/cache.js";

export const getAllRoles = asyncHandler(async (req, res, next) => {
  const { search } = req.query;
  let where = {};
  if (search) {
    where.name = {
      contains: search,
    };
  }
  const include = {
    rolePermissions: {
      include: {
        permission: true,
      },
    },
  };
  const roles = await db.findMany({ model: "role", where, include });
  const mappedRoles = roles.map((role) => ({
    id: role.id,
    name: role.name,
    permissions: role.rolePermissions.map((rp) => ({
      id: rp.permission.id,
      name: rp.permission.name,
      code: rp.permission.code,
      resource: rp.permission.resource,
      method: rp.permission.method,
    })),
  }));
  return successResponse({
    res,
    req,
    status: 200,
    message: "FETCH_SUCCESS",
    data: mappedRoles,
  });
});
export const createRole = asyncHandler(async (req, res, next) => {
  const { name, permissionIds } = req.body;
  if (!name) {
    return errorResponse({
      req,
      next,
      message: "MISSING_NAME",
      status: 400,
    });
  }
  const existsRole = await db.findOne({
    model: "role",
    where: {
      name,
    },
  });
  if (existsRole) {
    return errorResponse({
      req,
      next,
      message: "ROLE_EXISTS",
      status: 400,
    });
  }

  const newRole = await db.transaction(async (tx) => {
    const role = await tx.create({
      model: "role",
      data: {
        name,
      },
    });

    if (
      permissionIds &&
      Array.isArray(permissionIds) &&
      permissionIds.length > 0
    ) {
      const rolePermissionsData = permissionIds.map((permId) => ({
        roleId: role.id,
        permissionId: permId,
      }));

      await tx.createMany({
        model: "rolePermission",
        data: rolePermissionsData,
      });
    }

    return role;
  });

  return successResponse({
    res,
    req,
    status: 200,
    message: "CREATE_SUCCESS",
    data: newRole,
  });
});

export const assignRoleToUser = asyncHandler(async (req, res, next) => {
  const { user_id } = req.params;
  const { role_id } = req.body;

  if (!role_id) {
    return errorResponse({
      req,
      next,
      message: "MISSING_ROLE_ID",
      status: 400,
    });
  }
  const existsRole = await db.findOne({
    model: "role",
    where: {
      id: role_id,
    },
  });
  if (!existsRole) {
    return errorResponse({
      req,
      next,
      message: "ROLE_NOT_FOUND",
      status: 400,
    });
  }
  const newRole = await db.updateOne({
    model: "user",
    where: {
      id: user_id,
    },
    data: {
      roleId: role_id,
    },
    include: {
      role: true,
    },
  });
  return successResponse({
    res,
    req,
    status: 200,
    message: "ROLE_ASSIGNED_SUCCESS",
    data: {
      newRole,
    },
  });
});

export const updateRole = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { name } = req.body;
  if (!name) {
    return errorResponse({ req, next, message: "MISSING_NAME", status: 400 });
  }

  const role = await db.findOne({
    model: "role",
    where: { id },
  });

  if (!role) {
    return errorResponse({
      req,
      next,
      message: "ROLE_NOT_FOUND",
      status: 404,
    });
  }

  if (name) {
    const existsRole = await db.findOne({
      model: "role",
      where: { name },
    });

    if (existsRole && existsRole.id !== id) {
      return errorResponse({
        req,
        next,
        message: "ROLE_EXISTS",
        status: 400,
      });
    }
  }

  const updatedRole = await db.updateOne({
    model: "role",
    where: { id },
    data: { name },
  });

  // Invalidate permissions cache on role update
  await rbacCache.invalidateRoleCache(id);

  return successResponse({
    res,
    req,
    status: 200,
    message: "UPDATE_SUCCESS",
    data: updatedRole,
  });
});

export const deleteRole = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const role = await db.findOne({
    model: "role",
    where: { id },
  });

  if (!role) {
    return errorResponse({
      req,
      next,
      message: "ROLE_NOT_FOUND",
      status: 404,
    });
  }

  await db.deleteOne({
    model: "role",
    where: { id },
  });

  // Invalidate permissions cache on role deletion
  await rbacCache.invalidateRoleCache(id);

  return successResponse({
    res,
    req,
    status: 200,
    message: "DELETE_SUCCESS",
  });
});

export const getDashboard = asyncHandler(async (req, res, next) => {
  const now = getNowUTC();
  const startOfDay = now.startOf("day").toDate();
  const endOfDay = now.endOf("day").toDate();
  const sevenDaysAgo = now.subtract(7, "day").startOf("day").toDate();

  const [
    studentsCount,
    teachersCount,
    pendingRequestsCount,
    todaySessionsCount,
    upcomingSessions,
    lastSevenDaysSessions,
    recentRequests,
    recentReviews,
    newTeachers,
  ] = await Promise.all([
    db.count({ model: "student" }),
    db.count({ model: "teacher" }),
    db.count({ model: "session_request", where: { status: "pending" } }),
    db.count({
      model: "schedule",
      where: { start_time: { gte: startOfDay, lte: endOfDay } },
    }),

    // Upcoming Sessions
    db.findMany({
      model: "schedule",
      where: {
        start_time: { gte: now.toDate() },
      },
      take: 5,
      orderBy: { start_time: "asc" },
      include: {
        subject: true,
        teacher: { include: { user: true } },
        student: { include: { user: true } },
      },
    }),
    

    // Sessions for last 7 days
    db.findMany({
      model: "schedule",
      where: { start_time: { gte: sevenDaysAgo } },
      select: { start_time: true },
    }),

    // Activity Feed Sources
    db.findMany({
      model: "session_request",
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { requester: true },
    }),
    db.findMany({
      model: "Review",
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { reviewer: true, reviewee: true },
    }),
    db.findMany({
      model: "teacher",
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { user: true },
    }),
  ]);

  // Process Sessions per Day
  const sessionsPerDay = [];
  for (let i = 6; i >= 0; i--) {
    const date = now.subtract(i, "day").format("YYYY-MM-DD");
    const count = lastSevenDaysSessions.filter(
      (s) => getNowUTC(s.start_time).format("YYYY-MM-DD") === date,
    ).length;
    sessionsPerDay.push({ date, count });
  }

  // Combine Activity Feed
  const activityFeed = [
    ...recentRequests.map((r) => ({
      id: r.id,
      type: "request",
      title: `${r.requester?.name || "Someone"} requested a ${r.type}`,
      time: r.createdAt,
      user: r.requester?.name || "Someone",
      avatar: null,
    })),
    ...recentReviews.map((rv) => ({
      id: rv.id,
      type: "review",
      title: `Session completed with ${rv.reviewee?.name || "Teacher"}: "${rv.comment || ""}"`,
      time: rv.createdAt,
      user: rv.reviewer?.name || "Student",
      avatar: null,
    })),
    ...newTeachers.map((t) => ({
      id: t.id,
      type: "onboarding",
      title: `New Instructor Onboarded: ${t.user?.name || "Teacher"}`,
      time: t.createdAt,
      user: t.user?.name || "Teacher",
      avatar: null,
    })),
  ]
    .sort((a, b) => new Date(b.time) - new Date(a.time))
    .slice(0, 10);

  return successResponse({
    res,
    req,
    data: {
      stats: {
        totalStudents: studentsCount,
        totalTeachers: teachersCount,
        pendingRequests: pendingRequestsCount,
        todaySessions: todaySessionsCount,
      },
      sessionsPerDay,
      upcomingSessions: upcomingSessions.map((s) => ({
        id: s.id,
        title: s.title,
        subject: s.subject?.name_en || "Subject",
        time: s.start_time,
        teacher: s.teacher?.user?.name || "Teacher",
        student: s.student?.user?.name || "Student",
      })),
      activityFeed,
      activeUsers: {
        students: studentsCount, // Simplified for now
        instructors: teachersCount,
      },
    },
    status: 200,
    message: "FETCH_SUCCESS",
  });
});

// --- Permission CRUD & Assignment ---

export const createPermission = asyncHandler(async (req, res, next) => {
  const { name, resource, method } = req.body;
  if (!name || !resource || !method) {
    return errorResponse({
      req,
      next,
      message: "MISSING_FIELDS",
      status: 400,
    });
  }

  const existsPermission = await db.findFirst({
    model: "permission",
    where: {
      resource: resource.toLowerCase(),
      method: method.toUpperCase(),
    },
  });

  if (existsPermission) {
    return errorResponse({
      req,
      next,
      message: "PERMISSION_EXISTS",
      status: 400,
    });
  }

  const newPermission = await db.create({
    model: "permission",
    data: {
      name,
      resource: resource.toLowerCase(),
      method: method.toUpperCase(),
    },
  });

  return successResponse({
    res,
    req,
    status: 201,
    message: "CREATE_SUCCESS",
    data: newPermission,
  });
});

export const getPermissions = asyncHandler(async (req, res, next) => {
  const permissions = await db.findMany({
    model: "permission",
  });

  // Group permissions by resource
  const grouped = permissions.reduce((acc, perm) => {
    const resource = perm.resource || "general";
    if (!acc[resource]) {
      acc[resource] = [];
    }
    acc[resource].push(perm);
    return acc;
  }, {});

  return successResponse({
    res,
    req,
    status: 200,
    message: "FETCH_SUCCESS",
    data: grouped,
  });
});

export const deletePermission = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const permission = await db.findOne({
    model: "permission",
    where: { id },
  });

  if (!permission) {
    return errorResponse({
      req,
      next,
      message: "PERMISSION_NOT_FOUND",
      status: 404,
    });
  }

  await db.deleteOne({
    model: "permission",
    where: { id },
  });

  // Find roles that had this permission and invalidate their caches
  const rolePermissions = await db.findMany({
    model: "rolePermission",
    where: { permissionId: id },
  });

  for (const rp of rolePermissions) {
    await rbacCache.invalidateRoleCache(rp.roleId);
  }

  return successResponse({
    res,
    req,
    status: 200,
    message: "DELETE_SUCCESS",
  });
});

export const assignPermissionsToRole = asyncHandler(async (req, res, next) => {
  const { roleId, permissionIds } = req.body;
  if (!roleId || !permissionIds) {
    return errorResponse({
      req,
      next,
      message: "MISSING_FIELDS",
      status: 400,
    });
  }

  const exists = await db.findFirst({
    model: "rolePermission",
    where: { roleId, permissionId: { in: permissionIds } },
  });

  if (exists) {
    return errorResponse({
      req,
      next,
      message: "MAPPING_EXISTS",
      status: 400,
    });
  }

  // Create role-permission mappings
  const mappings = permissionIds.map((permissionId) => ({
    roleId,
    permissionId, 
  }));

  const newMappings = await db.createMany({
    model: "rolePermission",
    data: mappings,
  });

  // Invalidate cache for this role
  await rbacCache.invalidateRoleCache(roleId);

  return successResponse({
    res,
    req,
    status: 200,
    message: "ASSIGN_SUCCESS",
    data: newMappings,
  });
});

export const revokePermissionsFromRole = asyncHandler(async (req, res, next) => {
  const { roleId, permissionIds } = req.body;
  if (!roleId || !permissionIds) {
    return errorResponse({
      req,
      next,
      message: "MISSING_FIELDS",
      status: 400,
    });
  }

  const exists = await db.findFirst({
    model: "rolePermission",
    where: { roleId, permissionId: {in: permissionIds} },
  });

  if (!exists) {
    return errorResponse({
      req,
      next,
      message: "MAPPING_NOT_FOUND",
      status: 404,
    });
  }

  await db.deleteMany({
    model: "rolePermission",
    where: {
      id: {in: exists.map(r => r.id)},
    },
  });

  // Invalidate cache for this role
  await rbacCache.invalidateRoleCache(roleId);

  return successResponse({
    res,
    req,
    status: 200,
    message: "REVOKE_SUCCESS",
  });
});

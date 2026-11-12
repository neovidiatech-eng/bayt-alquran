import {
  asyncHandler,
  errorResponse,
  successResponse,
} from "../../Utils/Response.js";
import * as db from "../../database/dbService.js";
import { formatSchedules } from "../../Utils/Date/time.js";
import { rbacCache } from "../../Utils/RBAC/cache.js";
import dayjs from "dayjs";
import prisma from "../../database/Connection.db.js";
import {
  getModeratorStudentIds,
  buildStudentScheduleFilter,
} from "../../Utils/Permissions/permissions.js";

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

  // Invalidate permissions cache for the user
  await rbacCache.invalidateUserCache(user_id);

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
  const now = dayjs().tz(req.timezone || "Africa/Cairo");
  const startOfDay = now.startOf("day").utc().toDate();
  const endOfDay = now.endOf("day").utc().toDate();
  const sevenDaysAgo = now.subtract(7, "day").startOf("day").utc().toDate();
  const startOfMonth = now.startOf("month").utc().toDate();
  const endOfMonth = now.endOf("month").utc().toDate();

  const assignedStudentIds = await getModeratorStudentIds(req.user);
  const isMod = assignedStudentIds !== null;
  const modScheduleFilter = isMod
    ? buildStudentScheduleFilter(assignedStudentIds)
    : {};
  const modStudentWhere = isMod ? { id: { in: assignedStudentIds } } : {};

  const [
    studentsCount,
    teachersCount,
    stuffCount,
    parentsCount,
    pendingRequestsCount,
    todaySessionsCount,
    reportsCount,
    totalRevenueAgg,
    monthlyRevenueAgg,
    allStudents,
    allSubscriptions,
    upcomingSessions,
    lastSevenDaysSessions,
    totalViolationsCount,
    totalModeratorViolationsCount,
    subscriptionRequestsCount,
    completedSessionsCount,
    withdrawalRequestsCount,
  ] = await Promise.all([
    db.count({ model: "student", where: isMod ? modStudentWhere : undefined }),
    db.count({ model: "teacher" }),
    db.count({ model: "stuff" }),
    db.count({
      model: "user",
      where: {
        OR: [
          { parentStudents: { some: {} } },
          { role: { name: { equals: "parent", mode: "insensitive" } } },
        ],
      },
    }),
    db.count({
      model: "session_request",
      where: {
        status: "pending",
        ...(isMod && {
          OR: [
            { schedule: modScheduleFilter },
            { requester: { student: { id: { in: assignedStudentIds } } } },
          ],
        }),
      },
    }),
    db.count({
      model: "schedule",
      where: {
        start_time: { gte: startOfDay, lte: endOfDay },
        ...modScheduleFilter,
      },
    }),
    db.count({
      model: "Review",
      where: isMod ? { schedule: modScheduleFilter } : undefined,
    }),

    // Total Revenue (all-time completed revenue)
    db.aggregate({
      model: "transaction",
      where: {
        status: "completed",
        type: { in: ["subscription", "credit"] },
      },
      _sum: { amount: true },
    }),

    // Monthly Revenue (current month completed revenue)
    db.aggregate({
      model: "transaction",
      where: {
        status: "completed",
        type: { in: ["subscription", "credit"] },
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      _sum: { amount: true },
    }),

    // All Students with plans to analyze session counts & statuses
    db.findMany({
      model: "student",
      where: isMod ? modStudentWhere : undefined,
      include: {
        plan: { select: { name_en: true, name_ar: true, duration: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    }),

    // All Subscriptions to analyze subscription dates
    db.findMany({
      model: "Subscription",
      where: isMod
        ? { user: { student: { id: { in: assignedStudentIds } } } }
        : undefined,
      include: {
        plan: { select: { name_en: true, name_ar: true, duration: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    }),

    // Upcoming Sessions (Today only)
    db.findMany({
      model: "schedule",
      where: {
        start_time: { gte: startOfDay, lte: endOfDay },
        status: { not: "cancelled" },
        ...modScheduleFilter,
      },
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
      where: {
        start_time: { gte: sevenDaysAgo },
        ...modScheduleFilter,
      },
      select: { start_time: true },
    }),

    // New requested stats
    db.count({ model: "TeacherViolation" }),
    db.count({ model: "moderatorViolation" }),
    db.count({ model: "subscription_requests" }),
    db.count({
      model: "schedule",
      where: { status: "completed", ...modScheduleFilter },
    }),
    db.count({
      model: "withdrawalRequest",
      where: {
        status: "pending",
      },
    }),
  ]);

  const totalRevenue = Number((totalRevenueAgg?._sum?.amount || 0).toFixed(2));
  const monthlyRevenue = Number(
    (monthlyRevenueAgg?._sum?.amount || 0).toFixed(2),
  );

  // Analyze Student Subscriptions & Session Counts (<= 2 sessions remaining OR <= 7 days left)
  let activeSubscriptionsCount = 0;
  let expiringSoonSubscriptionsCount = 0;
  let expiredSubscriptionsCount = 0;
  const expiringSoonSubscriptionsList = [];

  for (const student of allStudents) {
    const sub = allSubscriptions.find((s) => s.userId === student.user_id);
    const durationDays = student.plan?.duration || sub?.plan?.duration || 30;
    const startDate = dayjs(
      sub?.startDate || sub?.createdAt || student.createdAt,
    );
    const endDate = startDate.add(durationDays, "day");
    const daysLeft = endDate.diff(now, "day");
    const sessionsRemaining = Number(student.sessions_remaining ?? 0);
    const planName =
      req.lang === "ar"
        ? student.plan?.name_ar ||
          sub?.plan?.name_ar ||
          student.plan?.name_en ||
          "الخطة"
        : student.plan?.name_en ||
          sub?.plan?.name_en ||
          student.plan?.name_ar ||
          "Plan";
    const userName = student.user?.name || "Student";

    // Expiring soon: remaining sessions is 1 or 2, OR remaining days is 7 or fewer (with active sessions)
    const isExpiringSoon =
      (sessionsRemaining > 0 && sessionsRemaining <= 2) ||
      (sessionsRemaining > 0 && daysLeft >= 0 && daysLeft <= 7);

    const isExpired =
      sub?.status === "expired" ||
      student.status === "rejected" ||
      sessionsRemaining <= 0;

    if (isExpiringSoon) {
      expiringSoonSubscriptionsCount++;
      expiringSoonSubscriptionsList.push({
        id: student.id,
        userName,
        planName,
        daysLeft: Math.max(0, daysLeft),
        sessionsRemaining,
        endDate: endDate.toDate(),
      });
    } else if (isExpired) {
      expiredSubscriptionsCount++;
    } else {
      activeSubscriptionsCount++;
    }
  }

  const subscriptionsStatus = {
    active: activeSubscriptionsCount,
    expiringSoon: expiringSoonSubscriptionsCount,
    expired: expiredSubscriptionsCount,
  };

  // Process Sessions per Day
  const sessionsPerDay = [];
  for (let i = 6; i >= 0; i--) {
    const date = now.subtract(i, "day").format("YYYY-MM-DD");
    const count = lastSevenDaysSessions.filter(
      (s) =>
        dayjs
          .utc(s.start_time)
          .tz(req.timezone || "Africa/Cairo")
          .format("YYYY-MM-DD") === date,
    ).length;
    sessionsPerDay.push({ date, count });
  }

  // Activity Feed (ONLY expiring subscriptions within 7 days OR <= 2 sessions remaining)
  const activityFeed = expiringSoonSubscriptionsList
    .map((sub) => {
      let title = "";
      if (sub.sessionsRemaining <= 2 && sub.sessionsRemaining > 0) {
        title = req.t
          ? req.t("SUBSCRIPTION_EXPIRING_SESSIONS", {
              user: sub.userName,
              plan: sub.planName,
              sessions: sub.sessionsRemaining,
            })
          : `Subscription for ${sub.userName} (${sub.planName}) has ${sub.sessionsRemaining} session(s) remaining`;
      } else if (sub.daysLeft > 0 && sub.daysLeft <= 7) {
        title = req.t
          ? req.t("SUBSCRIPTION_EXPIRING_DAYS", {
              user: sub.userName,
              plan: sub.planName,
              days: sub.daysLeft,
            })
          : `Subscription for ${sub.userName} (${sub.planName}) will expire in ${sub.daysLeft} day(s)`;
      } else {
        title = req.t
          ? req.t("SUBSCRIPTION_EXPIRING_GENERIC", {
              user: sub.userName,
              plan: sub.planName,
            })
          : `Subscription for ${sub.userName} (${sub.planName}) is expiring soon`;
      }

      return {
        id: sub.id,
        type: "subscription_expiring",
        title,
        time: sub.endDate,
        user: sub.userName,
        daysLeft: sub.daysLeft,
        sessionsRemaining: sub.sessionsRemaining,
        avatar: null,
      };
    })
    .sort((a, b) => new Date(a.time) - new Date(a.time));

  return successResponse({
    res,
    req,
    data: {
      stats: {
        totalStudents: studentsCount,
        totalTeachers: teachersCount,
        pendingRequests: pendingRequestsCount,
        todaySessions: todaySessionsCount,
        totalReports: reportsCount,
        totalFeedbacks: reportsCount,
        totalRevenue,
        monthlyRevenue,
        subscriptions: subscriptionsStatus,
        totalViolations: totalViolationsCount,
        totalModeratorViolations: totalModeratorViolationsCount,
        subscriptionRequests: subscriptionRequestsCount,
        completedSessions: completedSessionsCount,
        withdrawalRequests: withdrawalRequestsCount,
      },
      subscriptionsStatus,
      sessionsPerDay,
      upcomingSessions: upcomingSessions.map((s) => ({
        id: s.id,
        title: s.title,
        subject:
          req.lang === "ar"
            ? s.subject?.name_ar || s.subject?.name_en || "مادة"
            : s.subject?.name_en || s.subject?.name_ar || "Subject",
        time: s.start_time,
        ...formatSchedules(s, req.timezone),
        teacher: s.teacher?.user?.name || "Teacher",
        student: s.student?.user?.name || "Student",
      })),
      activityFeed,
      activeUsers: {
        students: studentsCount,
        instructors: teachersCount,
        admins: stuffCount,
        parents: parentsCount,
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

  // Find roles that had this permission before deleting
  const rolePermissions = await db.findMany({
    model: "rolePermission",
    where: { permissionId: id },
  });

  await db.deleteOne({
    model: "permission",
    where: { id },
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
  if (!roleId || !permissionIds || !Array.isArray(permissionIds)) {
    return errorResponse({
      req,
      next,
      message: "MISSING_FIELDS",
      status: 400,
    });
  }

  const role = await db.findOne({
    model: "role",
    where: { id: roleId },
  });

  if (!role) {
    return errorResponse({
      req,
      next,
      message: "ROLE_NOT_FOUND",
      status: 404,
    });
  }

  const newMappings = await db.transaction(async (tx) => {
    await tx.deleteMany({
      model: "rolePermission",
      where: { roleId },
    });

    if (permissionIds.length > 0) {
      const mappings = permissionIds.map((permissionId) => ({
        roleId,
        permissionId,
      }));
      await tx.createMany({
        model: "rolePermission",
        data: mappings,
      });
    }
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

export const revokePermissionsFromRole = asyncHandler(
  async (req, res, next) => {
    const { roleId, permissionIds } = req.body;
    if (!roleId || !permissionIds) {
      return errorResponse({
        req,
        next,
        message: "MISSING_FIELDS",
        status: 400,
      });
    }

    const exists = await db.findMany({
      model: "rolePermission",
      where: { roleId, permissionId: { in: permissionIds } },
    });

    if (exists.length === 0) {
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
        id: { in: exists.map((r) => r.id) },
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
  },
);

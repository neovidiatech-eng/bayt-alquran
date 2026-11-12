import { asyncHandler, successResponse, errorResponse } from "../../Utils/Response.js";
import * as db from "../../database/dbService.js";
import { sendPushNotification } from "../../Utils/Firebase/firebase.js";

const translateToArabic = (text) => {
  if (!text || typeof text !== "string") return text;

  // If text already contains Arabic characters, don't modify it
  if (/[\u0600-\u06FF]/.test(text)) {
    return text;
  }

  // Exact matches
  const exactMatches = {
    // Titles
    "New Teacher Created": "تم إنشاء معلم جديد",
    "New Student Registered": "تم تسجيل طالب جديد",
    "New Student Signed Up (Google)": "تسجيل طالب جديد (جوجل)",
    "New Student Account Created": "تم إنشاء حساب طالب جديد",
    "New Session Request": "طلب جلسة جديد",
    "Session Request Approved": "تم قبول طلب الجلسة",
    "Session Request Rejected": "تم رفض طلب الجلسة",
    "Session Cancelled": "تم إلغاء الجلسة",
    "Recurring Sessions Cancelled": "تم إلغاء الجلسات المتكررة",
    "New Recurring Sessions Created": "تم إنشاء جلسات متكررة جديدة",
    "Session Rescheduled/Updated": "تم تعديل/إعادة جدولة الجلسة",
    "Session Rescheduled": "تم إعادة جدولة الجلسة",
    "Session Scheduled": "تم جدولة الجلسة",
    "Recurring Sessions Scheduled": "تم جدولة جلسات متكررة",
    "Session Missed": "جلسة فائتة",
    "Teacher Late": "تأخر المعلم",
    "Session Joined": "تم الانضمام للجلسة",
    "New Review Received": "تقييم جديد",
    "Review Received": "تقييم جديد",
    "Student": "طالب",
    "Teacher": "معلم",
  };

  if (exactMatches[text]) {
    return exactMatches[text];
  }

  // Regex matches for dynamic messages
  let match;

  // 1. New Teacher Created
  match = text.match(/A new teacher account has been created:\s*(.+?)\s*\((.+?)\)/i);
  if (match) {
    return `تم إنشاء حساب معلم جديد: ${match[1]} (${match[2]}).`;
  }

  // 2. New Student Registered
  match = text.match(/A new student has registered:\s*(.+?)\s*\((.+?)\)/i);
  if (match) {
    return `تم تسجيل طالب جديد: ${match[1]} (${match[2]}).`;
  }

  // 3. New Student Signed Up (Google)
  match = text.match(/A new student signed up via Google:\s*(.+?)\s*\((.+?)\)/i);
  if (match) {
    return `تم تسجيل طالب جديد عبر جوجل: ${match[1]} (${match[2]}).`;
  }

  // 4. New Session Request
  match = text.match(/A new session request \((.+?)\) has been submitted by (.+?) \((.+?)\)\. Reason: (.+?)\./i);
  if (match) {
    const type = match[1];
    const name = match[2];
    const role = match[3] === "student" ? "طالب" : match[3] === "teacher" ? "معلم" : match[3];
    const reason = match[4] === "None" ? "لا يوجد" : match[4];
    return `تم تقديم طلب جلسة جديد (${type}) بواسطة ${name} (${role}). السبب: ${reason}.`;
  }

  // 5. Session Request Approved
  match = text.match(/The session request \((.+?)\) by (.+?) has been approved\./i);
  if (match) {
    return `تم قبول طلب الجلسة (${match[1]}) المقدم من ${match[2]}.`;
  }

  // 6. Session Request Rejected
  match = text.match(/The session request \((.+?)\) by (.+?) has been rejected\./i);
  if (match) {
    return `تم رفض طلب الجلسة (${match[1]}) المقدم من ${match[2]}.`;
  }

  // 7. Session Cancelled
  match = text.match(/Session "(.+?)" has been cancelled\/deleted for student:\s*(.+?)\s*with teacher:\s*(.+?)\./i);
  if (match) {
    return `تم إلغاء/حذف الجلسة "${match[1]}" للطالب: ${match[2]} مع المعلم: ${match[3]}.`;
  }

  // 8. Recurring Sessions Cancelled
  match = text.match(/All recurring sessions under group "(.+?)" have been cancelled\/deleted for student:\s*(.+?)\s*with teacher:\s*(.+?)\./i);
  if (match) {
    return `تم إلغاء/حذف جميع الجلسات المتكررة للمجموعة "${match[1]}" للطالب: ${match[2]} مع المعلم: ${match[3]}.`;
  }

  // 9. New Recurring Sessions Created
  match = text.match(/A new recurring session group has been created:\s*(.+?)\s*with total of\s*(.+?)\s*sessions for student:\s*(.+?)\s*and teacher:\s*(.+?)\./i);
  if (match) {
    return `تم إنشاء مجموعة جلسات متكررة جديدة: "${match[1]}" بإجمالي ${match[2]} جلسات للطالب: ${match[3]} والمعلم: ${match[4]}.`;
  }

  // 10. Session Rescheduled/Updated
  match = text.match(/Session "(.+?)" has been updated\/rescheduled for student:\s*(.+?)\s*with teacher:\s*(.+?)\./i);
  if (match) {
    return `تم تحديث/إعادة جدولة الجلسة "${match[1]}" للطالب: ${match[2]} مع المعلم: ${match[3]}.`;
  }

  // 11. Session Rescheduled (Alternative)
  match = text.match(/A session has been rescheduled:\s*"(.+?)"\s*for student:\s*(.+?)\s*with teacher:\s*(.+?)\./i);
  if (match) {
    return `تم إعادة جدولة الجلسة: "${match[1]}" للطالب: ${match[2]} مع المعلم: ${match[3]}.`;
  }

  // 12. Session Missed
  match = text.match(/The session "(.+?)" between student:\s*(.+?)\s*and teacher:\s*(.+?)\s*was missed\./i);
  if (match) {
    return `تم اعتبار الجلسة "${match[1]}" بين الطالب: ${match[2]} والمعلم: ${match[3]} فائتة.`;
  }

  // 13. Session Missed (Alternative)
  match = text.match(/The session (.+?) was marked as missed\./i);
  if (match) {
    return `تم اعتبار الجلسة ${match[1]} فائتة.`;
  }

  // 14. Teacher Late
  match = text.match(/Teacher joined session (.+?) late\./i);
  if (match) {
    return `انضم المعلم للجلسة ${match[1]} متأخراً.`;
  }

  // 15. Session Joined
  match = text.match(/(student|teacher|الطالب|المعلم) has joined the session\./i);
  if (match) {
    const role = match[1].toLowerCase() === "student" ? "الطالب" : "المعلم";
    return `لقد انضم ${role} إلى الجلسة.`;
  }

  // 16. Review Received
  match = text.match(/You received a (.+?)-star review\./i);
  if (match) {
    return `لقد تلقيت تقييماً بـ ${match[1]} نجوم.`;
  }

  // 17. New Student Account Created (Admin)
  match = text.match(/A new student account has been created by admin:\s*(.+?)\s*\((.+?)\)/i);
  if (match) {
    return `تم إنشاء حساب طالب جديد بواسطة المسؤول: ${match[1]} (${match[2]}).`;
  }

  // 18. Session Scheduled
  match = text.match(/A new session "(.+?)" has been scheduled for student:\s*(.+?)\s*with teacher:\s*(.+?)\./i);
  if (match) {
    return `تم جدولة جلسة جديدة "${match[1]}" للطالب: ${match[2]} مع المعلم: ${match[3]}.`;
  }

  // 19. Recurring Sessions Scheduled
  match = text.match(/(\d+) recurring sessions have been scheduled for student:\s*(.+?)\s*with teacher:\s*(.+?)\./i);
  if (match) {
    return `تم جدولة ${match[1]} جلسات متكررة للطالب: ${match[2]} مع المعلم: ${match[3]}.`;
  }

  return text;
};

// GET /admin/notifications
export const getAdminNotifications = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 10, isRead, search, type, category,notificationId } = req.query;
  const adminId = req.user.id;
  console.log(notificationId);
  

  let where = {
    AND: [
      {
        OR: [
          { userId: adminId },
          { userId: "admin" },
        ],
      },
    ],
  };
  if(notificationId){
    where.AND.push({ id: notificationId });
  }

  if (isRead !== undefined) {
    const isReadBool = isRead === "true" || isRead === true;
    where.AND.push({ isRead: isReadBool });
  }

  if (search) {
    where.AND.push({
      OR: [
        { title: { contains: search, mode: "insensitive" } },
        { message: { contains: search, mode: "insensitive" } },
      ],
    });
  }

  if (type) {
    where.AND.push({ type });
  }

  if (category) {
    if (category === "students") {
      where.AND.push({ type: "new_student" });
    } else if (category === "teachers") {
      where.AND.push({ type: "new_teacher" });
    } else if (category === "sessions") {
      where.AND.push({
        type: {
          in: [
            "session_created",
            "session_cancelled",
            "session_updated",
            "session_missed",
            "teacher_late",
            "session_request_created",
            "session_request_approved",
            "session_request_rejected"
          ]
        }
      });
    }
  }

  const { items: notifications, pagination } = await db.findManyWithPaginationAndCount({
    model: "notification",
    where,
    page: parseInt(page),
    limit: parseInt(limit),
    orderBy: { createdAt: "desc" },
  });

  // Global unread notifications count for the admin
  const totalUnreadCount = await db.count({
    model: "notification",
    where: {
      OR: [
        { userId: adminId },
        { userId: "admin" },
      ],
      isRead: false,
    },
  });

  // Filtered unread notifications count
  const filteredUnreadWhere = {
    ...where,
    AND: [
      ...where.AND.filter(cond => cond.isRead === undefined),
      { isRead: false }
    ]
  };
  const unreadCount = await db.count({
    model: "notification",
    where: filteredUnreadWhere,
  });

  return successResponse({
    res,
    req,
    message: "FETCH_SUCCESS",
    data: {
      notifications,
      pagination,
      unreadCount,
      totalUnreadCount,
    },
  });
});

// PATCH /admin/notifications/read-all
export const markAllAsRead = asyncHandler(async (req, res, next) => {
  const adminId = req.user.id;

  await db.updateMany({
    model: "notification",
    where: {
      OR: [
        { userId: adminId },
        { userId: "admin" },
      ],
      isRead: false,
    },
    data: { isRead: true },
  });

  return successResponse({
    res,
    req,
    message: "UPDATE_SUCCESS",
  });
});

// PATCH /admin/notifications/:id/read
export const markAsRead = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const adminId = req.user.id;

  const notification = await db.findFirst({
    model: "notification",
    where: {
      id,
      OR: [
        { userId: adminId },
        { userId: "admin" },
      ],
    },
  });

  if (!notification) {
    return errorResponse({ req, next, message: "NOTIFICATION_NOT_FOUND", status: 404 });
  }

  const updatedNotification = await db.updateOne({
    model: "notification",
    where: { id },
    data: { isRead: true },
  });

  return successResponse({
    res,
    req,
    message: "UPDATE_SUCCESS",
    data: updatedNotification,
  });
});

// DELETE /admin/notifications/:id
export const deleteNotification = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const adminId = req.user.id;

  const notification = await db.findFirst({
    model: "notification",
    where: {
      id,
      OR: [
        { userId: adminId },
        { userId: "admin" },
      ],
    },
  });

  if (!notification) {
    return errorResponse({ req, next, message: "NOTIFICATION_NOT_FOUND", status: 404 });
  }

  await db.deleteOne({
    model: "notification",
    where: { id },
  });

  return successResponse({
    res,
    req,
    message: "DELETE_SUCCESS",
  });
});

// POST /admin/notifications
export const sendNotification = asyncHandler(async (req, res, next) => {
  const { title, message, type, targetType, userId } = req.body;

  let targetUserIds = [];

  if (targetType === "single") {
    const targetUser = await db.findOne({
      model: "user",
      where: { id: userId },
    });

    if (!targetUser) {
      return errorResponse({ req, next, message: "USER_NOT_FOUND", status: 404 });
    }

    targetUserIds = [userId];
  } else {
    // Find role to target
    let roleName = "";
    if (targetType === "teachers") roleName = "teacher";
    else if (targetType === "students") roleName = "student";
    else if (targetType === "parents") roleName = "parent";

    let whereClause = { status: "active" };

    if (roleName) {
      const role = await db.findFirst({
        model: "role",
        where: { name: { equals: roleName, mode: "insensitive" } },
      });

      if (!role) {
        return errorResponse({ req, next, message: "ROLE_NOT_FOUND", status: 404 });
      }

      whereClause.roleId = role.id;
    }

    const targetUsers = await db.findMany({
      model: "user",
      where: whereClause,
      select: { id: true },
    });

    targetUserIds = targetUsers.map(u => u.id);
  }

  if (targetUserIds.length === 0) {
    return errorResponse({ req, next, message: "NO_TARGET_USERS_FOUND", status: 404 });
  }

  const arabicTitle = translateToArabic(title);
  const arabicMessage = translateToArabic(message);

  const notificationData = targetUserIds.map(uid => ({
    userId: uid,
    title: arabicTitle,
    message: arabicMessage,
    type: type || "system_broadcast",
  }));

  await db.createMany({
    model: "notification",
    data: notificationData,
  });

  // Send Firebase push notifications
  const usersWithTokens = await db.findMany({
    model: "user",
    where: {
      id: { in: targetUserIds },
      fcmToken: { not: null, not: "" },
    },
    select: { fcmToken: true },
  });

  const tokens = usersWithTokens.map(u => u.fcmToken).filter(Boolean);

  if (tokens.length > 0) {
    await sendPushNotification(tokens, {
      title: arabicTitle,
      body: arabicMessage,
      data: {
        type: type || "system_broadcast",
      },
    });
  }

  return successResponse({
    res,
    req,
    status: 201,
    message: "CREATE_SUCCESS",
    data: {
      sentCount: targetUserIds.length,
    },
  });
});

export const createNotification = async ({ userId, title, message, type }) => {
  try {
    const arabicTitle = translateToArabic(title);
    const arabicMessage = translateToArabic(message);

    const notification = await db.create({
      model: "notification",
      data: {
        userId,
        title: arabicTitle,
        message: arabicMessage,
        type,
      },
    });

    if (userId === "admin") {
      // Find all admin / super_admin users with active status and an FCM token
      const adminRoles = await db.findMany({
        model: "role",
        where: {
          name: { in: ["admin", "super_admin"] },
        },
        select: { id: true },
      });
      
      const adminRoleIds = adminRoles.map(r => r.id);
      
      const admins = await db.findMany({
        model: "user",
        where: {
          roleId: { in: adminRoleIds },
          status: "active",
          fcmToken: { not: null, not: "" },
        },
        select: { fcmToken: true },
      });
      
      const adminTokens = admins.map(a => a.fcmToken).filter(Boolean);
      if (adminTokens.length > 0) {
        await sendPushNotification(adminTokens, {
          title: arabicTitle,
          body: arabicMessage,
          data: {
            id: notification.id,
            type: type || "system",
            createdAt: notification.createdAt.toISOString(),
          },
        });
      }
    } else {
      // Find user fcmToken
      const user = await db.findOne({
        model: "user",
        where: { id: userId },
        select: { fcmToken: true },
      });

      if (user?.fcmToken) {
        await sendPushNotification(user.fcmToken, {
          title: arabicTitle,
          body: arabicMessage,
          data: {
            id: notification.id,
            type: type || "system",
            createdAt: notification.createdAt.toISOString(),
          },
        });
      }
      console.log({ token: user.fcmToken ,sent:"sent successfully"});
    }

    return notification;
  } catch (error) {
    console.error("Failed to create notification:", error);
  }
};

export const createAdminNotification = async ({ title, message, type }) => {
  return createNotification({ userId: "admin", title, message, type });
};
export const createTeacherAndStudentNotification = async ({ title, message, type, teacherId, studentId }) => {
  console.log({studentId,teacherId});
  
  await Promise.all([
    createNotification({ userId: teacherId, title, message, type }),
    createNotification({ userId: studentId, title, message, type })
  ])
};

// GET /notifications
export const getUserNotifications = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 10, isRead, search, type } = req.query;
  const userId = req.user.id;

  let where = {
    AND: [
      { userId },
    ],
  };

  if (isRead !== undefined) {
    const isReadBool = isRead === "true" || isRead === true;
    where.AND.push({ isRead: isReadBool });
  }

  if (search) {
    where.AND.push({
      OR: [
        { title: { contains: search, mode: "insensitive" } },
        { message: { contains: search, mode: "insensitive" } },
      ],
    });
  }

  if (type) {
    where.AND.push({ type });
  }

  const { items: notifications, pagination } = await db.findManyWithPaginationAndCount({
    model: "notification",
    where,
    page: parseInt(page),
    limit: parseInt(limit),
    orderBy: { createdAt: "desc" },
  });

  // Global unread notifications count for this user
  const totalUnreadCount = await db.count({
    model: "notification",
    where: {
      userId,
      isRead: false,
    },
  });

  // Filtered unread notifications count
  const filteredUnreadWhere = {
    ...where,
    AND: [
      ...where.AND.filter(cond => cond.isRead === undefined),
      { isRead: false }
    ]
  };
  const unreadCount = await db.count({
    model: "notification",
    where: filteredUnreadWhere,
  });

  return successResponse({
    res,
    req,
    message: "FETCH_SUCCESS",
    data: {
      notifications,
      pagination,
      unreadCount,
      totalUnreadCount,
    },
  });
});

// PATCH /notifications/read-all
export const markUserAllAsRead = asyncHandler(async (req, res, next) => {
  const userId = req.user.id;

  await db.updateMany({
    model: "notification",
    where: {
      userId,
      isRead: false,
    },
    data: { isRead: true },
  });

  return successResponse({
    res,
    req,
    message: "UPDATE_SUCCESS",
  });
});

// PATCH /notifications/:id/read
export const markUserAsRead = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;

  const notification = await db.findFirst({
    model: "notification",
    where: {
      id,
      userId,
    },
  });

  if (!notification) {
    return errorResponse({ req, next, message: "NOTIFICATION_NOT_FOUND", status: 404 });
  }

  const updatedNotification = await db.updateOne({
    model: "notification",
    where: { id },
    data: { isRead: true },
  });

  return successResponse({
    res,
    req,
    message: "UPDATE_SUCCESS",
    data: updatedNotification,
  });
});

// DELETE /notifications/:id
export const deleteUserNotification = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;

  const notification = await db.findFirst({
    model: "notification",
    where: {
      id,
      userId,
    },
  });

  if (!notification) {
    return errorResponse({ req, next, message: "NOTIFICATION_NOT_FOUND", status: 404 });
  }

  await db.deleteOne({
    model: "notification",
    where: { id },
  });

  return successResponse({
    res,
    req,
    message: "DELETE_SUCCESS",
  });
});


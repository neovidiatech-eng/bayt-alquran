import {
  asyncHandler,
  errorResponse,
  successResponse,
} from "../../Utils/Response.js";
import * as db from "../../database/dbService.js";
import { createNotification } from "../Notifications/notifications.controller.js";

/* ------------------------------------------------------------------ */
/*                      Infraction Items (CRUD)                        */
/* ------------------------------------------------------------------ */

export const getInfractionItems = asyncHandler(async (req, res, next) => {
  const items = await db.findMany({
    model: "InfractionItem",
    where: { active: true },
    orderBy: { createdAt: "desc" },
  });

  return successResponse({
    res,
    req,
    status: 200,
    message: "FETCH_SUCCESS",
    data: items,
  });
});

export const createInfractionItem = asyncHandler(async (req, res, next) => {
  const { title_en, title_ar, description, defaultType, defaultDeductionAmount } =
    req.body;

  const item = await db.create({
    model: "InfractionItem",
    data: {
      title_en,
      title_ar,
      description: description || "",
      defaultType: defaultType || "warning",
      defaultDeductionAmount: defaultDeductionAmount ? parseFloat(defaultDeductionAmount) : 0,
    },
  });

  return successResponse({
    res,
    req,
    status: 201,
    message: "CREATE_SUCCESS",
    data: item,
  });
});

export const updateInfractionItem = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { title_en, title_ar, description, defaultType, defaultDeductionAmount, active } =
    req.body;

  const existing = await db.findOne({
    model: "InfractionItem",
    where: { id },
  });

  if (!existing) {
    return errorResponse({
      req,
      next,
      status: 404,
      message: "INFRACTION_ITEM_NOT_FOUND",
    });
  }

  const updateData = {};
  if (title_en !== undefined) updateData.title_en = title_en;
  if (title_ar !== undefined) updateData.title_ar = title_ar;
  if (description !== undefined) updateData.description = description;
  if (defaultType !== undefined) updateData.defaultType = defaultType;
  if (defaultDeductionAmount !== undefined)
    updateData.defaultDeductionAmount = parseFloat(defaultDeductionAmount);
  if (active !== undefined) updateData.active = active;

  const updatedItem = await db.updateOne({
    model: "InfractionItem",
    where: { id },
    data: updateData,
  });

  return successResponse({
    res,
    req,
    status: 200,
    message: "UPDATE_SUCCESS",
    data: updatedItem,
  });
});

export const deleteInfractionItem = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const existing = await db.findOne({
    model: "InfractionItem",
    where: { id },
  });

  if (!existing) {
    return errorResponse({
      req,
      next,
      status: 404,
      message: "INFRACTION_ITEM_NOT_FOUND",
    });
  }

  await db.updateOne({
    model: "InfractionItem",
    where: { id },
    data: { active: false },
  });

  return successResponse({
    res,
    req,
    status: 200,
    message: "DELETE_SUCCESS",
  });
});

/* ------------------------------------------------------------------ */
/*                    Supervisor Issue Violation                      */
/* ------------------------------------------------------------------ */

export const issueTeacherViolation = asyncHandler(async (req, res, next) => {
  const supervisor = req.user;
  const {
    teacherId,
    scheduleId,
    infractionItemId,
    type,
    deductionAmount,
    reason,
  } = req.body;

  const targetTeacher = await db.findOne({
    model: "teacher",
    where: { id: teacherId },
    include: { user: true },
  });

  if (!targetTeacher) {
    return errorResponse({
      req,
      next,
      status: 404,
      message: "TEACHER_NOT_FOUND",
    });
  }

  let infractionItem = null;
  if (infractionItemId) {
    infractionItem = await db.findOne({
      model: "InfractionItem",
      where: { id: infractionItemId },
    });
  }

  const finalDeduction =
    type === "penalty" ? parseFloat(deductionAmount || 0) : 0;

  let violationRecord = null;

  await db.transaction(async (tx) => {
    // 1. Create Violation record
    violationRecord = await tx.create({
      model: "TeacherViolation",
      data: {
        teacherId,
        supervisorId: supervisor.id,
        scheduleId: scheduleId || null,
        infractionItemId: infractionItemId || null,
        type,
        deductionAmount: finalDeduction,
        reason: reason || infractionItem?.title_ar || "",
      },
    });

    // 2. If penalty deduction, update Teacher Wallet & record Transaction
    if (type === "penalty" && finalDeduction > 0) {
      const wallet = await tx.findFirst({
        model: "Wallet",
        where: { userId: targetTeacher.user_id },
      });

      if (wallet) {
        await tx.updateOne({
          model: "Wallet",
          where: { id: wallet.id },
          data: {
            balance: { decrement: finalDeduction },
          },
        });

        await tx.create({
          model: "Transaction",
          data: {
            walletId: wallet.id,
            type: "penalty",
            amount: finalDeduction,
            status: "completed",
            reason: {
              ar: reason || infractionItem?.title_ar || "مخالفة مع خصم مالي",
              en: reason || infractionItem?.title_en || "Violation deduction penalty",
            },
          },
        });
      }
    }
  });

  // 3. Send Notification to Teacher
  if (targetTeacher.user?.id) {
    const isWarning = type === "warning";
    const notificationTitle = isWarning
      ? req.t("NOTIFICATION_TEACHER_WARNING_TITLE") || "تنبيه / تحذير إداري"
      : req.t("NOTIFICATION_TEACHER_PENALTY_TITLE") || "مخالفة وخصم مالي";

    const notificationMsg = isWarning
      ? reason || infractionItem?.title_ar || "تم تسجيل تحذير إداري عليك"
      : `${reason || infractionItem?.title_ar || "تم تسجيل مخالفة عليك"} - قيمة الخصم: ${finalDeduction}`;

    await createNotification({
      userId: targetTeacher.user.id,
      title: notificationTitle,
      message: notificationMsg,
      type: isWarning ? "teacher_warning" : "teacher_penalty",
    });
  }

  return successResponse({
    res,
    req,
    status: 201,
    message: "VIOLATION_ISSUED_SUCCESS",
    data: violationRecord,
  });
});

export const getTeacherViolations = asyncHandler(async (req, res, next) => {
  const { teacherId, type, page = 1, limit = 10 } = req.query;

  const where = {};
  if (teacherId) where.teacherId = teacherId;
  if (type) where.type = type;

  const { items: violations, pagination } =
    await db.findManyWithPaginationAndCount({
      model: "TeacherViolation",
      where,
      page,
      limit,
      orderBy: { createdAt: "desc" },
      include: {
        teacher: { include: { user: { select: { name: true, email: true } } } },
        supervisor: { select: { id: true, name: true, email: true } },
        schedule: { select: { id: true, title: true, start_time: true } },
        infractionItem: true,
      },
    });

  return successResponse({
    res,
    req,
    status: 200,
    message: "FETCH_SUCCESS",
    data: { violations, pagination },
  });
});
export const getAuthUserViolations = asyncHandler(async (req, res, next) => {
  const {  type, page = 1, limit = 10 } = req.query;
  const userId = req.user.id;

  
  if (req.user.role.name !== "teacher") {

    return errorResponse({
      req,
      next,
      status: 403,
      message: "FORBIDDEN",
    });

    
  }
  const user = await db.findOne({
    model: "user",
    where: { id: userId},
    include: { teacher: true },
  });
  if (!user?.teacher) {
    return errorResponse({
      req,
      next,
      status: 404,
      message: "USER_NOT_FOUND",
    });
  }
  const where = {teacherId:user.teacher.id};
  if (type) where.type = type;

  const { items: violations, pagination } =
    await db.findManyWithPaginationAndCount({
      model: "TeacherViolation",
      where,
      page,
      limit,
      orderBy: { createdAt: "desc" },
      include: {
        teacher: { include: { user: { select: { name: true, email: true } } } },
        supervisor: { select: { id: true, name: true, email: true } },
        schedule: { select: { id: true, title: true, start_time: true } },
        infractionItem: true,
      },
    });

  return successResponse({
    res,
    req,
    status: 200,
    message: "FETCH_SUCCESS",
    data: { violations, pagination },
  });
});

/* ------------------------------------------------------------------ */
/*                  Supervisor Issue Moderator Violation              */
/* ------------------------------------------------------------------ */

export const issueModeratorViolation = asyncHandler(async (req, res, next) => {
  const supervisor = req.user;
  const {
    moderatorId,
    infractionItemId,
    type,
    deductionAmount,
    reason,
  } = req.body;

  const targetModerator = await db.findOne({
    model: "moderator",
    where: { id: moderatorId },
    include: { user: true },
  });

  if (!targetModerator) {
    return errorResponse({
      req,
      next,
      status: 404,
      message: "MODERATOR_NOT_FOUND",
    });
  }

  let infractionItem = null;
  if (infractionItemId) {
    infractionItem = await db.findOne({
      model: "InfractionItem",
      where: { id: infractionItemId },
    });
  }

  const finalDeduction =
    type === "penalty" ? parseFloat(deductionAmount || 0) : 0;

  let violationRecord = null;

  await db.transaction(async (tx) => {
    // 1. Create moderatorViolation record
    violationRecord = await tx.create({
      model: "moderatorViolation",
      data: {
        moderatorId,
        supervisorId: supervisor.id,
        userId: targetModerator.user?.id || null,
        infractionItemId: infractionItemId || null,
        type,
        deductionAmount: finalDeduction,
        reason: reason || infractionItem?.title_ar || "",
      },
    });

    // 2. If penalty deduction, update Moderator Wallet & record Transaction
    if (type === "penalty" && finalDeduction > 0 && targetModerator.userId) {
      const wallet = await tx.findFirst({
        model: "Wallet",
        where: { userId: targetModerator.userId },
      });

      if (wallet) {
        await tx.updateOne({
          model: "Wallet",
          where: { id: wallet.id },
          data: {
            balance: { decrement: finalDeduction },
          },
        });

        await tx.create({
          model: "Transaction",
          data: {
            walletId: wallet.id,
            type: "penalty",
            amount: finalDeduction,
            status: "completed",
            reason: {
              ar: reason || infractionItem?.title_ar || "مخالفة مع خصم مالي للمشرف",
              en: reason || infractionItem?.title_en || "Moderator violation deduction penalty",
            },
          },
        });
      }
    }
  });

  // 3. Send Notification to Moderator
  if (targetModerator.user?.id) {
    const isWarning = type === "warning";
    const notificationTitle = isWarning
      ? req.t("NOTIFICATION_MODERATOR_WARNING_TITLE") || "تنبيه / تحذير إداري للمشرف"
      : req.t("NOTIFICATION_MODERATOR_PENALTY_TITLE") || "مخالفة وخصم مالي للمشرف";

    const notificationMsg = isWarning
      ? reason || infractionItem?.title_ar || "تم تسجيل تحذير إداري عليك"
      : `${reason || infractionItem?.title_ar || "تم تسجيل مخالفة عليك"} - قيمة الخصم: ${finalDeduction}`;

    await createNotification({
      userId: targetModerator.user.id,
      title: notificationTitle,
      message: notificationMsg,
      type: isWarning ? "moderator_warning" : "moderator_penalty",
    });
  }

  return successResponse({
    res,
    req,
    status: 201,
    message: "VIOLATION_ISSUED_SUCCESS",
    data: violationRecord,
  });
});

export const getModeratorViolations = asyncHandler(async (req, res, next) => {
  const { moderatorId, type, page = 1, limit = 10 } = req.query;

  const where = {};
  if (moderatorId) where.moderatorId = moderatorId;
  if (type) where.type = type;

  const { items: violations, pagination } =
    await db.findManyWithPaginationAndCount({
      model: "moderatorViolation",
      where,
      page,
      limit,
      orderBy: { createdAt: "desc" },
      include: {
        moderator: { include: { user: { select: { name: true, email: true } } } },
        supervisor: { select: { id: true, name: true, email: true } },
        infractionItem: true,
      },
    });

  return successResponse({
    res,
    req,
    status: 200,
    message: "FETCH_SUCCESS",
    data: { violations, pagination },
  });
});

export const getAuthUserModeratorViolations = asyncHandler(async (req, res, next) => {
  const { type, page = 1, limit = 10 } = req.query;
  const userId = req.user.id;

  if (req.user.role.name !== "moderator") {
    return errorResponse({
      req,
      next,
      status: 403,
      message: "FORBIDDEN",
    });
  }

  const user = await db.findOne({
    model: "user",
    where: { id: userId },
    include: { moderator: true },
  });

  if (!user?.moderator) {
    return errorResponse({
      req,
      next,
      status: 404,
      message: "MODERATOR_NOT_FOUND",
    });
  }

  const where = { moderatorId: user.moderator.id };
  if (type) where.type = type;

  const { items: violations, pagination } =
    await db.findManyWithPaginationAndCount({
      model: "moderatorViolation",
      where,
      page,
      limit,
      orderBy: { createdAt: "desc" },
      include: {
        moderator: { include: { user: { select: { name: true, email: true } } } },
        supervisor: { select: { id: true, name: true, email: true } },
        infractionItem: true,
      },
    });

  return successResponse({
    res,
    req,
    status: 200,
    message: "FETCH_SUCCESS",
    data: { violations, pagination },
  });
});

export const deleteModeratorViolation = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const existing = await db.findOne({
    model: "moderatorViolation",
    where: { id },
  });

  if (!existing) {
    return errorResponse({
      req,
      next,
      status: 404,
      message: "VIOLATION_NOT_FOUND",
    });
  }

  await db.deleteOne({
    model: "moderatorViolation",
    where: { id },
  });

  return successResponse({
    res,
    req,
    status: 200,
    message: "MODERATOR_VIOLATION_DELETED_SUCCESS",
  });
});


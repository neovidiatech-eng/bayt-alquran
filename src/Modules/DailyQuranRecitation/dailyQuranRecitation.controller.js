import { recitationStatus } from "../../Utils/Enums/recitationStatus.js";
import {
  asyncHandler,
  errorResponse,
  successResponse,
} from "../../Utils/Response.js";
import * as db from "../../database/dbService.js";
import { ensureExists } from "../../database/genericService.js";
import { createNotification } from "../Notifications/notifications.controller.js";
import {
  getModeratorStudentIds,
  buildStudentExamFilter,
} from "../../Utils/Permissions/permissions.js";

const DEFAULT_INCLUDE = {
  student: {
    include: {
      user: {
        select: { id: true, name: true, email: true, phone: true },
      },
    },
  },
  teacher: {
    include: {
      user: {
        select: { id: true, name: true, email: true, phone: true },
      },
    },
  },
};

export const createDailyQuranRecitation = asyncHandler(
  async (req, res, next) => {
    const { studentId, surah, startPage, endPage, dueDate, status } = req.body;

    const assignedStudentIds = await getModeratorStudentIds(req.user);
    if (assignedStudentIds !== null && !assignedStudentIds.includes(studentId)) {
      return errorResponse({
        req,
        next,
        message: "FORBIDDEN",
        status: 403,
      });
    }

    // Extract teacher profile directly from logged-in user token
    const teacher =
      req.user.teacher ||
      (await db.findOne({ model: "teacher", where: { user_id: req.user.id } }));

    if (!teacher) {
      return errorResponse({
        req,
        next,
        message: "TEACHER_NOT_FOUND",
        status: 404,
      });
    }

    // Ensure student exists
    const student = await ensureExists({
      model: "student",
      where: { id: studentId },
      include: { user: true },
      message: "STUDENT_NOT_FOUND",
    });

    const recitation = await db.create({
      model: "DailyQuranRecitation",
      data: {
        studentId,
        teacherId: teacher.id,
        surah,
        startPage: startPage ? Number(startPage) : 1,
        endPage: endPage ? Number(endPage) : 1,
        dueDate: new Date(dueDate),
        status: status || "pending",
      },
      include: DEFAULT_INCLUDE,
    });

    // Send Notification to Student
    if (student.user_id) {
      await createNotification({
        userId: student.user_id,
        title: req.t("NOTIFICATION_NEW_QURAN_RECITATION_TITLE"),
        message: req.t("NOTIFICATION_NEW_QURAN_RECITATION_MSG", {
          surah,
          startPage: startPage || 1,
          endPage: endPage || 1,
        }),
        type: "quran_recitation",
      });
    }

    return successResponse({
      res,
      req,
      status: 201,
      message: "CREATE_SUCCESS",
      data: recitation,
    });
  },
);

export const updateDailyQuranRecitation = asyncHandler(
  async (req, res, next) => {
    const { id } = req.params;
    const { studentId, surah, startPage, endPage, dueDate, status } = req.body;

    const existingRecitation = await ensureExists({
      model: "DailyQuranRecitation",
      where: { id },
      include: DEFAULT_INCLUDE,
      message: "RECITATION_NOT_FOUND",
    });

    const userRole = req.user.role?.name;
    let isStudentUpdating = false;

    const assignedStudentIds = await getModeratorStudentIds(req.user);
    if (assignedStudentIds !== null) {
      if (
        !assignedStudentIds.includes(existingRecitation.studentId) ||
        (studentId && !assignedStudentIds.includes(studentId))
      ) {
        return errorResponse({
          req,
          next,
          message: "FORBIDDEN",
          status: 403,
        });
      }
    }

    if (userRole === "student" || req.user.student) {
      const student =
        req.user.student ||
        (await db.findOne({
          model: "student",
          where: { user_id: req.user.id },
        }));
      if (!student || existingRecitation.studentId !== student.id) {
        return errorResponse({
          req,
          next,
          message: "FORBIDDEN",
          status: 403,
        });
      }
      isStudentUpdating = true;
    } else if (userRole === "teacher" || req.user.teacher) {
      const teacher =
        req.user.teacher ||
        (await db.findOne({
          model: "teacher",
          where: { user_id: req.user.id },
        }));
      if (!teacher || existingRecitation.teacherId !== teacher.id) {
        return errorResponse({
          req,
          next,
          message: "FORBIDDEN",
          status: 403,
        });
      }
    }

    const updatedRecitation = await db.updateOne({
      model: "DailyQuranRecitation",
      where: { id },
      data: {
        ...(studentId && !isStudentUpdating && { studentId }),
        ...(surah && !isStudentUpdating && { surah }),
        ...(startPage !== undefined &&
          !isStudentUpdating && { startPage: Number(startPage) }),
        ...(endPage !== undefined &&
          !isStudentUpdating && { endPage: Number(endPage) }),
        ...(dueDate && !isStudentUpdating && { dueDate: new Date(dueDate) }),
        ...(status && { status }),
      },
      include: DEFAULT_INCLUDE,
    });

    // Notify teacher if student updated recitation status
    if (isStudentUpdating && status && status !== existingRecitation.status) {
      if (existingRecitation.teacher?.user_id) {
        await createNotification({
          userId: existingRecitation.teacher.user_id,
          title: req.t("NOTIFICATION_RECITATION_STATUS_UPDATED_TITLE"),
          message: req.t("NOTIFICATION_RECITATION_STATUS_UPDATED_MSG", {
            surah: updatedRecitation.surah,
            status: updatedRecitation.status,
          }),
          type: "quran_recitation",
        });
      }
    }

    return successResponse({
      res,
      req,
      status: 200,
      message: "UPDATE_SUCCESS",
      data: updatedRecitation,
    });
  },
);

export const deleteDailyQuranRecitation = asyncHandler(
  async (req, res, next) => {
    const { id } = req.params;

    const existingRecitation = await ensureExists({
      model: "DailyQuranRecitation",
      where: { id },
      message: "RECITATION_NOT_FOUND",
    });

    const assignedStudentIds = await getModeratorStudentIds(req.user);
    if (
      assignedStudentIds !== null &&
      !assignedStudentIds.includes(existingRecitation.studentId)
    ) {
      return errorResponse({
        req,
        next,
        message: "FORBIDDEN",
        status: 403,
      });
    }

    const roleName = req.user.role?.name;
    if (roleName === "teacher") {
      const teacher =
        req.user.teacher ||
        (await db.findOne({
          model: "teacher",
          where: { user_id: req.user.id },
        }));
      if (!teacher || existingRecitation.teacherId !== teacher.id) {
        return errorResponse({
          req,
          next,
          message: "FORBIDDEN",
          status: 403,
        });
      }
    }

    await db.deleteOne({
      model: "DailyQuranRecitation",
      where: { id },
    });

    return successResponse({
      res,
      req,
      status: 200,
      message: "DELETE_SUCCESS",
    });
  },
);

export const getDailyQuranRecitationById = asyncHandler(
  async (req, res, next) => {
    const { id } = req.params;

    const recitation = await ensureExists({
      model: "DailyQuranRecitation",
      where: { id },
      include: DEFAULT_INCLUDE,
      message: "RECITATION_NOT_FOUND",
    });

    const assignedStudentIds = await getModeratorStudentIds(req.user);
    if (
      assignedStudentIds !== null &&
      !assignedStudentIds.includes(recitation.studentId)
    ) {
      return errorResponse({
        req,
        next,
        message: "FORBIDDEN",
        status: 403,
      });
    }

    return successResponse({
      res,
      req,
      status: 200,
      message: "FETCH_SUCCESS",
      data: recitation,
    });
  },
);

export const getAllDailyQuranRecitations = asyncHandler(
  async (req, res, next) => {
    const {
      studentId,
      teacherId,
      status,
      surah,
      search,
      page = 1,
      limit = 10,
    } = req.query;

    const where = {};
    const assignedStudentIds = await getModeratorStudentIds(req.user);
    if (assignedStudentIds !== null) {
      Object.assign(
        where,
        buildStudentExamFilter(assignedStudentIds, studentId),
      );
    } else if (studentId) {
      where.studentId = studentId;
    }
    if (teacherId) where.teacherId = teacherId;
    if (status) where.status = status;
    if (surah) where.surah = { contains: surah, mode: "insensitive" };

    if (search) {
      where.OR = [
        { surah: { contains: search, mode: "insensitive" } },
        {
          student: {
            user: { name: { contains: search, mode: "insensitive" } },
          },
        },
      ];
    }

    const { items: recitations, pagination } =
      await db.findManyWithPaginationAndCount({
        model: "DailyQuranRecitation",
        where,
        page,
        limit,
        orderBy: { createdAt: "desc" },
        include: DEFAULT_INCLUDE,
      });

    return successResponse({
      res,
      req,
      status: 200,
      message: "FETCH_SUCCESS",
      data: { recitations, pagination },
    });
  },
);

export const getStudentDailyQuranRecitations = asyncHandler(
  async (req, res, next) => {
    const { status, page = 1, limit = 10 } = req.query;

    const student =
      req.user.student ||
      (await db.findOne({ model: "student", where: { user_id: req.user.id } }));
    if (!student) {
      return errorResponse({
        req,
        next,
        message: "STUDENT_NOT_FOUND",
        status: 404,
      });
    }

    const where = { studentId: student.id };
    if (status) where.status = status;

    const { items: recitations, pagination } =
      await db.findManyWithPaginationAndCount({
        model: "DailyQuranRecitation",
        where,
        page,
        limit,
        orderBy: { dueDate: "desc" },
        include: DEFAULT_INCLUDE,
      });

    return successResponse({
      res,
      req,
      status: 200,
      message: "FETCH_SUCCESS",
      data: { recitations, pagination },
    });
  },
);

export const getTeacherDailyQuranRecitations = asyncHandler(
  async (req, res, next) => {
    const { studentId, status, page = 1, limit = 10 } = req.query;

    const teacher =
      req.user.teacher ||
      (await db.findOne({ model: "teacher", where: { user_id: req.user.id } }));
    if (!teacher) {
      return errorResponse({
        req,
        next,
        message: "TEACHER_NOT_FOUND",
        status: 404,
      });
    }

    const where = { teacherId: teacher.id };
    if (studentId) where.studentId = studentId;
    if (status) where.status = status;

    const { items: recitations, pagination } =
      await db.findManyWithPaginationAndCount({
        model: "DailyQuranRecitation",
        where,
        page,
        limit,
        orderBy: { dueDate: "desc" },
        include: DEFAULT_INCLUDE,
      });

    return successResponse({
      res,
      req,
      status: 200,
      message: "FETCH_SUCCESS",
      data: { recitations, pagination },
    });
  },
);

export const submitRecitation = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const existingRecitation = await ensureExists({
    model: "DailyQuranRecitation",
    where: { id },
    include: DEFAULT_INCLUDE,
    message: "RECITATION_NOT_FOUND",
  });

  const student =
    req.user.student ||
    (await db.findOne({ model: "student", where: { user_id: req.user.id } }));
  if (!student || existingRecitation.studentId !== student.id) {
    return errorResponse({
      req,
      next,
      message: "FORBIDDEN",
      status: 403,
    });
  }

  const updatedRecitation = await db.updateOne({
    model: "DailyQuranRecitation",
    where: { id },
    data: {
      status: recitationStatus.submitted,
    },
    include: DEFAULT_INCLUDE,
  });

  if (existingRecitation.teacher?.user_id) {
    await createNotification({
      userId: existingRecitation.teacher.user_id,
      title: req.t("NOTIFICATION_RECITATION_STATUS_UPDATED_TITLE"),
      message: req.t("NOTIFICATION_RECITATION_STATUS_UPDATED_MSG", {
        surah: updatedRecitation.surah,
        status: "submitted",
      }),
      type: "quran_recitation",
    });
  }

  return successResponse({
    res,
    req,
    status: 200,
    message: "UPDATE_SUCCESS",
    data: updatedRecitation,
  });
});

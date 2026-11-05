import {
  asyncHandler,
  errorResponse,
  successResponse,
} from "../../Utils/Response.js";
import * as db from "../../database/dbService.js";

export const createHomework = asyncHandler(async (req, res, next) => {
  const { title, description, dueDate, studentId, subjectId, status } =
    req.body;
  // Assuming user role is teacher, check logic if admin creates it for a teacher.
  const teacher = req.user.teacher;
  const student = await db.findOne({
    model: "student",
    where: {
      id: studentId,
    },
  });

  if (!teacher || !student) {
    return errorResponse({
      req,
      next,
      message: "TEACHER_OR_STUDENT_NOT_FOUND",
      status: 404,
    });
  }
  if (
    !teacher &&
    !["admin", "super_admin", "teacher"].includes(req.user.role?.name)
  ) {
    return errorResponse({ req, next, message: "ONLY_TEACHERS_ADMINS_CREATE", status: 403 });
  }

  // If teacher, assign automatically, if admin we might need teacherId passed. Let's use user's teacher id or if not, get it from body if admin.
  const assignedTeacherId = teacher?.id || req.body.teacherId;

  if (!assignedTeacherId) {
    return errorResponse({ req, next, message: "MISSING_TEACHER_ID", status: 400 });
  }

  const homework = await db.create({
    model: "homework",
    data: {
      title,
      description,
      dueDate: new Date(dueDate),
      studentId,
      subjectId,
      status: status || "pending",
      teacherId: assignedTeacherId,
    },
  });

  return successResponse({ res, req, message: "CREATE_SUCCESS", data: homework, status: 201 });
});

export const updateHomework = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { title, description, dueDate, studentId, subjectId, status } =
    req.body;

  const homeworkExists = await db.findOne({
    model: "homework",
    where: { id },
  });

  if (!homeworkExists) {
    return errorResponse({ req, next, message: "HOMEWORK_NOT_FOUND", status: 404 });
  }

  // Check permissions: Teacher can update only their own homework.
  if (
    req.user.role?.name === "teacher" &&
    homeworkExists.teacherId !== req.user.teacher?.id
  ) {
    return errorResponse({ req, next, message: "UNAUTHORIZED_UPDATE", status: 403 });
  }

  let finalDueDate = dueDate;
  if (dueDate) {
    finalDueDate = new Date(dueDate);
  }

  const homework = await db.updateOne({
    model: "homework",
    where: { id },
    data: {
      ...(title && { title }),
      ...(description && { description }),
      ...(finalDueDate && { dueDate: finalDueDate }),
      ...(studentId && { studentId }),
      ...(subjectId && { subjectId }),
      ...(status && { status }),
    },
  });

  return successResponse({ res, req, message: "UPDATE_SUCCESS", data: homework, status: 200 });
});

export const deleteHomework = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const homeworkExists = await db.findOne({
    model: "homework",
    where: { id },
  });

  if (!homeworkExists) {
    return errorResponse({ req, next, message: "HOMEWORK_NOT_FOUND", status: 404 });
  }

  // Teacher can only delete their own homework; admin/super_admin can delete any
  if (
    req.user.role?.name === "teacher" &&
    homeworkExists.teacherId !== req.user.teacher?.id
  ) {
    return errorResponse({ req, next, message: "UNAUTHORIZED_DELETE", status: 403 });
  }

  await db.deleteOne({
    model: "homework",
    where: { id },
  });

  return successResponse({
    res,
    req,
    message: "DELETE_SUCCESS",
    status: 200,
  });
});

export const getHomework = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const homework = await db.findOne({
    model: "homework",
    where: { id },
    include: {
      student: { include: { user: true } },
      teacher: { include: { user: true } },
      subject: true,
    },
  });

  if (!homework) {
    return errorResponse({ req, next, message: "HOMEWORK_NOT_FOUND", status: 404 });
  }

  return successResponse({ res, req, message: "FETCH_SUCCESS", data: homework, status: 200 });
});
export const getStudentHomework = asyncHandler(async (req, res, next) => {
  const student = req.user.student;
  if(!student){
    return errorResponse({ req, next, message: "STUDENT_NOT_FOUND", status: 404 });
  }

  const homework = await db.findMany({

    model: "homework",
    where: { studentId: student?.id },
    include: {
      student: { include: { user: true } },
      teacher: { include: { user: true } },
      subject: true,
    },
  });

  if (!homework) {
    return errorResponse({ req, next, message: "HOMEWORK_NOT_FOUND", status: 404 });
  }

  return successResponse({ res, req, message: "FETCH_SUCCESS", data: homework, status: 200 });
});

export const getAllHomework = asyncHandler(async (req, res, next) => {
  const { studentId, subjectId, teacherId, status, page, limit } = req.query;

  const condition = {};

  if (studentId) condition.studentId = studentId;
  if (subjectId) condition.subjectId = subjectId;
  if (teacherId) condition.teacherId = teacherId;
  if (status) condition.status = status;

  // Role based filtering
  if (req.user.role?.name === "student") {
    condition.studentId = req.user.student?.id;
  } else if (req.user.role?.name === "teacher" && !teacherId) {
    condition.teacherId = req.user.teacher?.id;
  }

  const { items, pagination } = await db.findManyWithPaginationAndCount({
    model: "homework",
    where: condition,
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 10,
    include: {
      student: { include: { user: { select: { name: true, email: true } } } },
      teacher: { include: { user: { select: { name: true, email: true } } } },
      subject: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return successResponse({
    res,
    req,
    message: "FETCH_SUCCESS",
    data: { items, pagination },
    status: 200,
  });
});

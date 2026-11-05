import {
  asyncHandler,
  errorResponse,
  successResponse,
} from "../../Utils/Response.js";
import * as db from "../../database/dbService.js";

export const createExam = asyncHandler(async (req, res, next) => {
  const { title, totalMarks, studentId, subjectId, status, dueDate, duration } =
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

  const exam = await db.create({
    model: "exam",
    data: {
      title,
      totalMarks,
      studentId,
      subjectId,
      status: status || "pending",
      teacherId: assignedTeacherId,
      dueDate,
      duration,
    },
  });
  if (!exam) {
    return errorResponse({
      req,
      next,
      message: "CREATE_FAILED",
      status: 500,
    });
  }

  return successResponse({ res, req, message: "CREATE_SUCCESS", data: exam, status: 201 });
});

export const updateExam = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { title, totalMarks, dueDate, studentId, subjectId, status, duration } =
    req.body;

  const examExists = await db.findOne({
    model: "exam",
    where: { id },
  });

  if (!examExists) {
    return errorResponse({ req, next, message: "EXAM_NOT_FOUND", status: 404 });
  }

  if (
    req.user.role?.name === "teacher" &&
    examExists.teacherId !== req.user.teacher?.id
  ) {
    return errorResponse({ req, next, message: "UNAUTHORIZED_UPDATE", status: 403 });
  }

  const exam = await db.updateOne({
    model: "exam",
    where: { id },
    data: {
      ...(title && { title }),
      ...(totalMarks !== undefined && { totalMarks }),
      ...(dueDate && { dueDate: new Date(dueDate) }),
      ...(studentId && { studentId }),
      ...(subjectId && { subjectId }),
      ...(status && { status }),
      ...(duration !== undefined && { duration }),
    },
  });

  return successResponse({ res, req, message: "UPDATE_SUCCESS", data: exam, status: 200 });
});

export const deleteExam = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const examExists = await db.findOne({
    model: "exam",
    where: { id },
  });

  if (!examExists) {
    return errorResponse({ req, next, message: "EXAM_NOT_FOUND", status: 404 });
  }

  // Teacher can only delete their own exams
  if (
    req.user.role?.name === "teacher" &&
    examExists.teacherId !== req.user.teacher?.id
  ) {
    return errorResponse({ req, next, message: "UNAUTHORIZED_DELETE", status: 403 });
  }

  await db.deleteOne({
    model: "exam",
    where: { id },
  });

  return successResponse({
    res,
    req,
    message: "DELETE_SUCCESS",
    status: 200,
  });
});

export const getExam = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const exam = await db.findOne({
    model: "exam",
    where: { id },
    include: {
      student: { include: { user: true } },
      teacher: { include: { user: true } },
      subject: true,
    },
  });

  if (!exam) {
    return errorResponse({ req, next, message: "EXAM_NOT_FOUND", status: 404 });
  }

  return successResponse({ res, req, message: "FETCH_SUCCESS", data: exam, status: 200 });
});
export const getStudentExams = asyncHandler(async (req, res, next) => {
  const user = req.user.student || req.user.teacher;
  if (!user) {
    return errorResponse({ req, next, message: "STUDENT_NOT_FOUND", status: 404 });
  }
  const where = {};
  if (req.user.role?.name === "student") {
    where.studentId = user?.id;
  } else if (req.user.role?.name === "teacher") {
    where.teacherId = user?.id;
  }

  const exams = await db.findMany({
    model: "exam",
    where,
    include: {
      student: { include: { user: true } },
      teacher: { include: { user: true } },
      subject: true,
    },
  });

  if (!exams) {
    return errorResponse({ req, next, message: "EXAM_NOT_FOUND", status: 404 });
  }

  return successResponse({ res, req, message: "FETCH_SUCCESS", data: exams, status: 200 });
});

export const getAllExams = asyncHandler(async (req, res, next) => {
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
    model: "exam",
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

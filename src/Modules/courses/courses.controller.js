import {
  asyncHandler,
  errorResponse,
  successResponse,
} from "../../Utils/Response.js";
import * as db from "../../database/dbService.js";

export const createCourse = asyncHandler(async (req, res, next) => {
  const {
    title,
    description,
    duration,
    subjectId,
    videoUrl,
    pdfurl,
    attachments,
  } = req.body;

  const subject = await db.findOne({
    model: "subjects",
    where: {
      id: subjectId,
    },
  });

  if (!subject) {
    return errorResponse({
      req,
      next,
      message: "SUBJECT_NOT_FOUND",
      status: 404,
    });
  }

  let image = req.file?.finalPath;
  if (!image) {
    return errorResponse({
      req,
      next,
      message: "IMAGE_REQUIRED",
      status: 400,
    });
  }

  const course = await db.create({
    model: "course",
    data: {
      title,
      description,
      duration: duration ? parseFloat(duration) : null,
      subjectId,
      image,
      ...(videoUrl && { videoUrl }),
      ...(pdfurl && { pdfurl }),
      ...(attachments && { attatchments: attachments }),
    },
  });

  return successResponse({
    res,
    req,
    message: "CREATE_SUCCESS",
    data: course,
    status: 201,
  });
});

export const updateCourse = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const {
    title,
    description,
    duration,
    subjectId,
    status,
    videoUrl,
    pdfurl,
    attachments,
  } = req.body;

  const courseExists = await db.findOne({
    model: "course",
    where: { id },
  });

  if (!courseExists) {
    return errorResponse({
      req,
      next,
      message: "COURSE_NOT_FOUND",
      status: 404,
    });
  }

  let image = req.file?.finalPath;

  const course = await db.updateOne({
    model: "course",
    where: { id },
    data: {
      ...(title && { title }),
      ...(description && { description }),
      ...(duration && { duration: parseFloat(duration) }),
      ...(subjectId && { subjectId }),
      ...(status && { status }),
      ...(image && { image }),
      ...(videoUrl && { videoUrl }),
      ...(pdfurl && { pdfurl }),
      ...(attachments && { attatchments: attachments }),
    },
  });

  return successResponse({
    res,
    req,
    message: "UPDATE_SUCCESS",
    data: course,
    status: 200,
  });
});

export const deleteCourse = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const courseExists = await db.findOne({
    model: "course",
    where: { id },
  });

  if (!courseExists) {
    return errorResponse({
      req,
      next,
      message: "COURSE_NOT_FOUND",
      status: 404,
    });
  }

  await db.deleteOne({
    model: "course",
    where: { id },
  });

  return successResponse({
    res,
    req,
    message: "DELETE_SUCCESS",
    status: 200,
  });
});

export const getCourse = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const course = await db.findOne({
    model: "course",
    where: { id },
    include: {
      subject: true,
    },
  });

  if (!course) {
    return errorResponse({
      req,
      next,
      message: "COURSE_NOT_FOUND",
      status: 404,
    });
  }

  return successResponse({
    res,
    req,
    message: "FETCH_SUCCESS",
    data: course,
    status: 200,
  });
});

export const getAllCourse = asyncHandler(async (req, res, next) => {
  const { subjectId, status, page, limit } = req.query;

  const condition = {};

  if (subjectId) condition.subjectId = subjectId;
  if (status) condition.status = status;
  const { items, pagination } = await db.findManyWithPaginationAndCount({
    model: "course",
    where: condition,
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 10,
    include: {
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
